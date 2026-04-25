import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { writeAuditLog } from '@/lib/audit'
import { deleteGcalEvent } from '@/lib/gcal'

export const DELETE = async (
  _req: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> => {
  const session = await auth()
  if (!session?.user.ownerId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await context.params
  const block = await prisma.maintenanceBlock.findUnique({ where: { id } })
  if (!block) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  await deleteGcalEvent(block.gcalEventId)
  await prisma.maintenanceBlock.delete({ where: { id } })
  await writeAuditLog({
    actorOwnerId: session.user.ownerId,
    action: 'MAINTENANCE_DELETED',
    entityType: 'MaintenanceBlock',
    entityId: id,
  })
  return NextResponse.json({ ok: true })
}
