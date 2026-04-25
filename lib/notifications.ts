import { prisma } from './db'

export type NotificationKind =
  | 'REQUEST_RECEIVED'
  | 'REQUEST_APPROVED'
  | 'REQUEST_REJECTED'
  | 'REQUEST_CONFIRMED'
  | 'BOOKING_CANCELLED'
  | 'MAINTENANCE_ADDED'

export interface NewNotification {
  ownerId: string
  kind: NotificationKind
  title: string
  body: string
  link?: string
}

export const notify = async (entries: NewNotification | NewNotification[]): Promise<void> => {
  const list = Array.isArray(entries) ? entries : [entries]
  if (list.length === 0) {
    return
  }
  await prisma.notification.createMany({
    data: list.map((n) => ({
      ownerId: n.ownerId,
      kind: n.kind,
      title: n.title,
      body: n.body,
      link: n.link,
    })),
  })
}

export const markRead = async (ownerId: string, ids?: string[]): Promise<void> => {
  await prisma.notification.updateMany({
    where: {
      ownerId,
      readAt: null,
      ...(ids ? { id: { in: ids } } : {}),
    },
    data: { readAt: new Date() },
  })
}
