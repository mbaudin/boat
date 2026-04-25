import _ from 'lodash'
import { DateTime } from 'luxon'
import { type Booking, type Owner } from '@prisma/client'
import { ApprovalDecision, BookingStatus, BookingType } from '../constants'
import { prisma } from '../db'
import { writeAuditLog } from '../audit'
import { createGcalEvent, deleteGcalEvent } from '../gcal'
import {
  sendEmail,
  bookingConfirmedEmail,
  bookingRejectedEmail,
  bookingApprovedProgressEmail,
} from '../email'
import { notify } from '../notifications'
import { formatDate, rangesOverlap } from '../dates'

const maxDate = (a: Date, b: Date): Date => (a > b ? a : b)
const minDate = (a: Date, b: Date): Date => (a < b ? a : b)
const plusDays = (d: Date, n: number): Date => DateTime.fromJSDate(d).plus({ days: n }).toJSDate()

export const applyApproval = async (
  bookingId: string,
  approverOwnerId: string,
  decision: ApprovalDecision,
): Promise<Booking> => {
  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUniqueOrThrow({
      where: { id: bookingId },
      include: { owner: true, approvals: true },
    })
    if (booking.status !== BookingStatus.PENDING) {
      throw new Error(`Booking is not pending (status: ${booking.status})`)
    }
    if (booking.ownerId === approverOwnerId) {
      throw new Error('You cannot approve your own request')
    }
    const requiredApproverIds = booking.requiredApproverIds
      ? booking.requiredApproverIds.split(',')
      : []
    if (!requiredApproverIds.includes(approverOwnerId)) {
      throw new Error('Your approval is not needed for this request')
    }

    await tx.approval.upsert({
      where: { bookingId_approverOwnerId: { bookingId, approverOwnerId } },
      update: { decision, decidedAt: new Date() },
      create: { bookingId, approverOwnerId, decision },
    })

    if (decision === ApprovalDecision.REJECT) {
      const rejecter = await tx.owner.findUniqueOrThrow({ where: { id: approverOwnerId } })
      const updated = await tx.booking.update({
        where: { id: bookingId },
        data: { status: BookingStatus.REJECTED },
      })
      await writeAuditLog({
        actorOwnerId: approverOwnerId,
        action: 'BOOKING_REJECTED',
        entityType: 'Booking',
        entityId: bookingId,
        payload: { rejecter: rejecter.name },
      })
      await sendEmail({
        to: booking.owner.email,
        ...bookingRejectedEmail(
          booking.owner.name,
          formatDate(booking.startDate),
          formatDate(booking.endDate),
          rejecter.name,
        ),
      })
      await notify({
        ownerId: booking.ownerId,
        kind: 'REQUEST_REJECTED',
        title: `${rejecter.name} rejected your request`,
        body: `${formatDate(booking.startDate)} → ${formatDate(booking.endDate)}`,
        link: '/requests',
      })
      return updated
    }

    const approvals = await tx.approval.findMany({
      where: { bookingId, decision: ApprovalDecision.APPROVE },
    })
    const approvedIds = new Set(_.map(approvals, 'approverOwnerId'))
    const allApproved = requiredApproverIds.every((id) => approvedIds.has(id))
    const approver = await tx.owner.findUniqueOrThrow({ where: { id: approverOwnerId } })
    if (!allApproved) {
      const remaining = requiredApproverIds.length - approvedIds.size
      await writeAuditLog({
        actorOwnerId: approverOwnerId,
        action: 'BOOKING_APPROVED',
        entityType: 'Booking',
        entityId: bookingId,
        payload: { progress: `${approvedIds.size}/${requiredApproverIds.length}` },
      })
      await sendEmail({
        to: booking.owner.email,
        ...bookingApprovedProgressEmail(
          approver.name,
          formatDate(booking.startDate),
          formatDate(booking.endDate),
          remaining,
        ),
      })
      await notify({
        ownerId: booking.ownerId,
        kind: 'REQUEST_APPROVED',
        title: `${approver.name} approved your request`,
        body: `${formatDate(booking.startDate)} → ${formatDate(booking.endDate)} — ${remaining} more approval${remaining === 1 ? '' : 's'} needed`,
        link: '/requests',
      })
      return booking
    }

    await splitOverlappingFixedWeeks(tx, booking, approverOwnerId)

    const gcalEventId = await createGcalEvent({
      summary: `${booking.owner.name} — Boat`,
      description: booking.notes ?? undefined,
      startDate: booking.startDate,
      endDateExclusive: plusDays(booking.endDate, 1),
      colorHex: booking.owner.displayColor,
    })

    const confirmed = await tx.booking.update({
      where: { id: bookingId },
      data: { status: BookingStatus.CONFIRMED, gcalEventId },
    })
    await writeAuditLog({
      actorOwnerId: approverOwnerId,
      action: 'BOOKING_CONFIRMED',
      entityType: 'Booking',
      entityId: bookingId,
    })

    const affectedOwners = await tx.owner.findMany({ where: { id: { in: requiredApproverIds } } })
    const recipients = _.uniq(_.map([booking.owner, ...affectedOwners], 'email'))
    await sendEmail({
      to: recipients,
      ...bookingConfirmedEmail(
        booking.owner.name,
        formatDate(booking.startDate),
        formatDate(booking.endDate),
      ),
    })
    await notify({
      ownerId: booking.ownerId,
      kind: 'REQUEST_CONFIRMED',
      title: 'Your request is confirmed',
      body: `${formatDate(booking.startDate)} → ${formatDate(booking.endDate)}`,
      link: '/',
    })
    return confirmed
  })
}

type TxClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0]

const splitOverlappingFixedWeeks = async (
  tx: TxClient,
  booking: Booking & { owner: Owner },
  actorOwnerId: string,
): Promise<void> => {
  const overlaps = await tx.booking.findMany({
    where: {
      type: BookingType.FIXED_WEEK,
      status: BookingStatus.CONFIRMED,
      id: { not: booking.id },
      startDate: { lte: booking.endDate },
      endDate: { gte: booking.startDate },
    },
  })
  for (const fixed of overlaps) {
    if (!rangesOverlap(fixed.startDate, fixed.endDate, booking.startDate, booking.endDate)) {
      continue
    }
    const overlapStart = maxDate(fixed.startDate, booking.startDate)
    const overlapEnd = minDate(fixed.endDate, booking.endDate)
    await deleteGcalEvent(fixed.gcalEventId)
    await tx.booking.update({
      where: { id: fixed.id },
      data: { status: BookingStatus.CANCELLED, gcalEventId: null },
    })
    await writeAuditLog({
      actorOwnerId,
      action: 'FIXED_WEEK_SPLIT',
      entityType: 'Booking',
      entityId: fixed.id,
      payload: {
        originalStart: formatDate(fixed.startDate),
        originalEnd: formatDate(fixed.endDate),
        overlapStart: formatDate(overlapStart),
        overlapEnd: formatDate(overlapEnd),
        newBookingId: booking.id,
      },
    })
    if (fixed.startDate < overlapStart) {
      await tx.booking.create({
        data: {
          ownerId: fixed.ownerId,
          startDate: fixed.startDate,
          endDate: plusDays(overlapStart, -1),
          type: BookingType.FIXED_WEEK,
          status: BookingStatus.CONFIRMED,
        },
      })
    }
    if (fixed.endDate > overlapEnd) {
      await tx.booking.create({
        data: {
          ownerId: fixed.ownerId,
          startDate: plusDays(overlapEnd, 1),
          endDate: fixed.endDate,
          type: BookingType.FIXED_WEEK,
          status: BookingStatus.CONFIRMED,
        },
      })
    }
  }
}
