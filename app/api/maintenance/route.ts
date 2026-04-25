import { NextResponse } from 'next/server'
import _ from 'lodash'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { writeAuditLog } from '@/lib/audit'
import { createGcalEvent } from '@/lib/gcal'
import { sendEmail, maintenanceCreatedEmail } from '@/lib/email'
import { toDate, formatDate } from '@/lib/dates'
import { DateTime } from 'luxon'

export const GET = async (): Promise<Response> => {
  const session = await auth()
  if (!session?.user.ownerId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const blocks = await prisma.maintenanceBlock.findMany({
    include: { createdBy: true },
    orderBy: { startDate: 'asc' },
  })
  return NextResponse.json(blocks)
}

export const POST = async (req: Request): Promise<Response> => {
  const session = await auth()
  if (!session?.user.ownerId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const body = await req.json()
  const startDate = toDate(body.startDate)
  const endDate = toDate(body.endDate)
  const reason: string = body.reason ?? ''
  if (startDate > endDate) {
    return NextResponse.json({ error: 'Start must be on or before end' }, { status: 400 })
  }

  const gcalEventId = await createGcalEvent({
    summary: `Boat unavailable: ${reason}`,
    description: reason,
    startDate,
    endDateExclusive: DateTime.fromJSDate(endDate).plus({ days: 1 }).toJSDate(),
    colorHex: '#9e9e9e',
  })

  const block = await prisma.maintenanceBlock.create({
    data: {
      startDate,
      endDate,
      reason,
      createdByOwnerId: session.user.ownerId,
      gcalEventId,
    },
    include: { createdBy: true },
  })
  await writeAuditLog({
    actorOwnerId: session.user.ownerId,
    action: 'MAINTENANCE_CREATED',
    entityType: 'MaintenanceBlock',
    entityId: block.id,
    payload: { start: formatDate(startDate), end: formatDate(endDate), reason },
  })

  const otherOwners = await prisma.owner.findMany({ where: { id: { not: session.user.ownerId } } })
  if (otherOwners.length > 0) {
    await sendEmail({
      to: _.map(otherOwners, 'email'),
      ...maintenanceCreatedEmail(
        block.createdBy.name,
        formatDate(startDate),
        formatDate(endDate),
        reason,
      ),
    })
  }

  return NextResponse.json(block, { status: 201 })
}
