import { NextResponse } from 'next/server'
import { BookingStatus, BookingType } from '@/lib/constants'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { computeRotation } from '@/lib/rotation'
import { isoWeekToDateRange } from '@/lib/dates'
import { createGcalEvent } from '@/lib/gcal'
import { writeAuditLog } from '@/lib/audit'
import { isAdminOwnerId } from '@/lib/admin'
import { DateTime } from 'luxon'

export const GET = async (
  _req: Request,
  context: { params: Promise<{ year: string }> },
): Promise<Response> => {
  const session = await auth()
  if (!session?.user.ownerId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { year: yearStr } = await context.params
  const year = parseInt(yearStr, 10)
  const owners = await prisma.owner.findMany({ orderBy: { createdAt: 'asc' } })
  const existing = await prisma.weekAllocation.findMany({
    where: { year },
    include: { owner: true },
  })
  const rotation = computeRotation(year, owners.map((o) => o.id))
  return NextResponse.json({ year, existing, proposedRotation: rotation, owners })
}

export const POST = async (
  _req: Request,
  context: { params: Promise<{ year: string }> },
): Promise<Response> => {
  const session = await auth()
  if (!session?.user.ownerId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!(await isAdminOwnerId(session.user.ownerId))) {
    return NextResponse.json({ error: 'Only the admin can set up a year' }, { status: 403 })
  }
  const { year: yearStr } = await context.params
  const year = parseInt(yearStr, 10)

  const existing = await prisma.weekAllocation.findMany({ where: { year } })
  if (existing.length > 0) {
    return NextResponse.json({ error: `Year ${year} already has an allocation` }, { status: 409 })
  }

  const owners = await prisma.owner.findMany({ orderBy: { createdAt: 'asc' } })
  const rotation = computeRotation(year, owners.map((o) => o.id))

  for (const entry of rotation) {
    await prisma.weekAllocation.create({ data: { year, ...entry } })
    const { start, end } = isoWeekToDateRange(year, entry.isoWeek)
    const owner = owners.find((o) => o.id === entry.ownerId)
    if (!owner) {
      continue
    }
    const gcalEventId = await createGcalEvent({
      summary: `${owner.name} — Boat (fixed)`,
      startDate: start,
      endDateExclusive: DateTime.fromJSDate(end).plus({ days: 1 }).toJSDate(),
      colorHex: owner.displayColor,
    })
    await prisma.booking.create({
      data: {
        ownerId: owner.id,
        startDate: start,
        endDate: end,
        type: BookingType.FIXED_WEEK,
        status: BookingStatus.CONFIRMED,
        gcalEventId,
      },
    })
  }
  await writeAuditLog({
    actorOwnerId: session.user.ownerId,
    action: 'YEAR_ROLLOVER',
    entityType: 'WeekAllocation',
    entityId: String(year),
    payload: { year, rotation },
  })
  return NextResponse.json({ ok: true, year, rotation })
}
