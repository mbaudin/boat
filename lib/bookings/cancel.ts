import _ from 'lodash'
import { type Booking } from '@prisma/client'
import { BookingStatus } from '../constants'
import { prisma } from '../db'
import { writeAuditLog } from '../audit'
import { deleteGcalEvent } from '../gcal'
import { sendEmail, bookingCancelledEmail } from '../email'
import { formatDate } from '../dates'

export const cancelBooking = async (
  bookingId: string,
  actorOwnerId: string,
): Promise<Booking> => {
  const booking = await prisma.booking.findUniqueOrThrow({
    where: { id: bookingId },
    include: { owner: true },
  })
  if (booking.ownerId !== actorOwnerId) {
    throw new Error('Only the booking owner can cancel it')
  }
  if (booking.status === BookingStatus.CANCELLED) {
    return booking
  }

  await deleteGcalEvent(booking.gcalEventId)
  const updated = await prisma.booking.update({
    where: { id: bookingId },
    data: { status: BookingStatus.CANCELLED, gcalEventId: null },
  })
  await writeAuditLog({
    actorOwnerId,
    action: 'BOOKING_CANCELLED',
    entityType: 'Booking',
    entityId: bookingId,
    payload: {
      start: formatDate(booking.startDate),
      end: formatDate(booking.endDate),
      type: booking.type,
    },
  })

  if (booking.status === BookingStatus.CONFIRMED) {
    const otherOwners = await prisma.owner.findMany({ where: { id: { not: booking.ownerId } } })
    if (otherOwners.length > 0) {
      await sendEmail({
        to: _.map(otherOwners, 'email'),
        ...bookingCancelledEmail(
          booking.owner.name,
          formatDate(booking.startDate),
          formatDate(booking.endDate),
        ),
      })
    }
  }

  return updated
}
