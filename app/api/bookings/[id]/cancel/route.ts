import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { cancelBooking } from '@/lib/bookings/cancel'

export const POST = async (
  _req: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> => {
  const session = await auth()
  if (!session?.user.ownerId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await context.params
  try {
    const booking = await cancelBooking(id, session.user.ownerId)
    return NextResponse.json(booking)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to cancel'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
