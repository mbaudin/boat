import { NextResponse } from 'next/server'
import _ from 'lodash'
import { BookingStatus, BookingType } from '@/lib/constants'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { validateNewRequest } from '@/lib/bookings/validate'
import { writeAuditLog } from '@/lib/audit'
import { sendEmail, bookingRequestEmail } from '@/lib/email'
import { notify } from '@/lib/notifications'
import { toDate, formatDate, rangesOverlap } from '@/lib/dates'
import { env } from '@/lib/env'

const findAffectedOwnerIds = async (
  requesterId: string,
  startDate: Date,
  endDate: Date,
): Promise<string[]> => {
  const overlapping = await prisma.booking.findMany({
    where: {
      status: BookingStatus.CONFIRMED,
      startDate: { lte: endDate },
      endDate: { gte: startDate },
    },
  })
  const affected = _.chain(overlapping)
    .filter((b) => rangesOverlap(b.startDate, b.endDate, startDate, endDate))
    .map('ownerId')
    .uniq()
    .filter((id) => id !== requesterId)
    .value()
  return affected
}

export const POST = async (req: Request): Promise<Response> => {
  const session = await auth()
  if (!session?.user.ownerId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const body = await req.json()
  const startDate = toDate(body.startDate)
  const endDate = toDate(body.endDate)
  const notes: string | null = body.notes ?? null

  const validation = await validateNewRequest(startDate, endDate)
  if (!validation.ok) {
    return NextResponse.json({ error: validation.reason }, { status: 409 })
  }

  const affectedOwnerIds = await findAffectedOwnerIds(session.user.ownerId, startDate, endDate)
  if (affectedOwnerIds.length === 0) {
    return NextResponse.json(
      { error: 'Those days are already yours (or unallocated) — nothing to request.' },
      { status: 409 },
    )
  }

  const booking = await prisma.booking.create({
    data: {
      ownerId: session.user.ownerId,
      startDate,
      endDate,
      type: BookingType.REQUESTED,
      status: BookingStatus.PENDING,
      notes,
      requiredApproverIds: affectedOwnerIds.join(','),
    },
    include: { owner: true },
  })
  await writeAuditLog({
    actorOwnerId: session.user.ownerId,
    action: 'BOOKING_REQUESTED',
    entityType: 'Booking',
    entityId: booking.id,
    payload: {
      start: formatDate(startDate),
      end: formatDate(endDate),
      affectedOwnerIds,
    },
  })

  const affectedOwners = await prisma.owner.findMany({ where: { id: { in: affectedOwnerIds } } })
  const base = env.appBaseUrl()
  const approveUrl = `${base}/requests?focus=${booking.id}`
  await sendEmail({
    to: _.map(affectedOwners, 'email'),
    ...bookingRequestEmail(
      booking.owner.name,
      formatDate(startDate),
      formatDate(endDate),
      notes,
      approveUrl,
      approveUrl,
    ),
  })
  await notify(
    affectedOwners.map((o) => ({
      ownerId: o.id,
      kind: 'REQUEST_RECEIVED' as const,
      title: `${booking.owner.name} wants ${formatDate(startDate)} → ${formatDate(endDate)}`,
      body: notes ?? 'No note. Open Requests to approve or reject.',
      link: '/requests',
    })),
  )

  return NextResponse.json(booking, { status: 201 })
}

export const GET = async (): Promise<Response> => {
  const session = await auth()
  if (!session?.user.ownerId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const bookings = await prisma.booking.findMany({
    where: { status: { not: BookingStatus.REJECTED } },
    include: { owner: true, approvals: true },
    orderBy: { startDate: 'asc' },
  })
  return NextResponse.json(bookings)
}
