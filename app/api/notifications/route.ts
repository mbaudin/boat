import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { markRead } from '@/lib/notifications'

export const GET = async (): Promise<Response> => {
  const session = await auth()
  if (!session?.user.ownerId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const items = await prisma.notification.findMany({
    where: { ownerId: session.user.ownerId },
    orderBy: { createdAt: 'desc' },
    take: 30,
  })
  return NextResponse.json(items)
}

export const POST = async (req: Request): Promise<Response> => {
  const session = await auth()
  if (!session?.user.ownerId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const body = await req.json().catch(() => ({}))
  await markRead(session.user.ownerId, body?.ids)
  return NextResponse.json({ ok: true })
}
