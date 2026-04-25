import { prisma } from './db'

export type AuditAction =
  | 'BOOKING_REQUESTED'
  | 'BOOKING_APPROVED'
  | 'BOOKING_REJECTED'
  | 'BOOKING_CONFIRMED'
  | 'BOOKING_CANCELLED'
  | 'FIXED_WEEK_SPLIT'
  | 'MAINTENANCE_CREATED'
  | 'MAINTENANCE_DELETED'
  | 'YEAR_ROLLOVER'
  | 'ICS_TOKEN_ROTATED'

export interface WriteAuditLog {
  actorOwnerId: string
  action: AuditAction
  entityType: 'Booking' | 'MaintenanceBlock' | 'WeekAllocation' | 'Owner'
  entityId: string
  payload?: unknown
}

export const writeAuditLog = async (entry: WriteAuditLog): Promise<void> => {
  await prisma.auditLog.create({
    data: {
      actorOwnerId: entry.actorOwnerId,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      payload: JSON.stringify(entry.payload ?? {}),
    },
  })
}
