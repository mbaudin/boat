import { createEvents, type EventAttributes } from 'ics'
import { DateTime } from 'luxon'
import { BookingStatus } from './constants'
import { prisma } from './db'

const toIcsDate = (d: Date): [number, number, number] => {
  const dt = DateTime.fromJSDate(d, { zone: 'utc' })
  return [dt.year, dt.month, dt.day]
}

export const buildIcsForToken = async (token: string): Promise<string | null> => {
  const owner = await prisma.owner.findUnique({ where: { icsToken: token } })
  if (!owner) {
    return null
  }

  const bookings = await prisma.booking.findMany({
    where: { status: BookingStatus.CONFIRMED },
    include: { owner: true },
    orderBy: { startDate: 'asc' },
  })

  const maintenance = await prisma.maintenanceBlock.findMany({
    orderBy: { startDate: 'asc' },
  })

  const events: EventAttributes[] = [
    ...bookings.map((b) => ({
      uid: `booking-${b.id}@boat`,
      start: toIcsDate(b.startDate),
      end: toIcsDate(DateTime.fromJSDate(b.endDate).plus({ days: 1 }).toJSDate()),
      title: `${b.owner.name} — Boat`,
      description: b.notes ?? '',
    })),
    ...maintenance.map((m) => ({
      uid: `maintenance-${m.id}@boat`,
      start: toIcsDate(m.startDate),
      end: toIcsDate(DateTime.fromJSDate(m.endDate).plus({ days: 1 }).toJSDate()),
      title: 'Boat unavailable',
      description: m.reason,
    })),
  ]

  const { error, value } = createEvents(events)
  if (error) {
    console.error('[ics] build failed', error)
    return null
  }
  return value ?? ''
}
