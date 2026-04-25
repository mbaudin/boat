import { BookingStatus } from '../constants'
import { prisma } from '../db'
import { rangesOverlap } from '../dates'

export interface ValidationResult {
  ok: boolean
  reason?: string
}

export const validateNewRequest = async (
  startDate: Date,
  endDate: Date,
): Promise<ValidationResult> => {
  if (startDate > endDate) {
    return { ok: false, reason: 'Start date must be on or before end date.' }
  }

  const confirmed = await prisma.booking.findMany({
    where: {
      status: BookingStatus.CONFIRMED,
      startDate: { lte: endDate },
      endDate: { gte: startDate },
    },
    include: { owner: true },
  })
  const confirmedNonFixed = confirmed.filter((b) => b.type !== 'FIXED_WEEK')
  const firstConfirmedOverlap = confirmedNonFixed.find((b) =>
    rangesOverlap(b.startDate, b.endDate, startDate, endDate),
  )
  if (firstConfirmedOverlap) {
    return {
      ok: false,
      reason: `Overlaps ${firstConfirmedOverlap.owner.name}'s confirmed booking.`,
    }
  }

  const pending = await prisma.booking.findMany({
    where: {
      status: BookingStatus.PENDING,
      startDate: { lte: endDate },
      endDate: { gte: startDate },
    },
    include: { owner: true },
  })
  const firstPendingOverlap = pending.find((b) =>
    rangesOverlap(b.startDate, b.endDate, startDate, endDate),
  )
  if (firstPendingOverlap) {
    return {
      ok: false,
      reason: `Conflicts with pending request from ${firstPendingOverlap.owner.name}.`,
    }
  }

  const maintenance = await prisma.maintenanceBlock.findMany({
    where: {
      startDate: { lte: endDate },
      endDate: { gte: startDate },
    },
  })
  if (maintenance.some((m) => rangesOverlap(m.startDate, m.endDate, startDate, endDate))) {
    return { ok: false, reason: 'Overlaps a maintenance block.' }
  }

  return { ok: true }
}
