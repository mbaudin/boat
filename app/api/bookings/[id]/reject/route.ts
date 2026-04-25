import { NextResponse } from 'next/server'
import { ApprovalDecision } from '@/lib/constants'
import { auth } from '@/lib/auth'
import { applyApproval } from '@/lib/bookings/approve'

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
    const booking = await applyApproval(id, session.user.ownerId, ApprovalDecision.REJECT)
    return NextResponse.json(booking)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to reject'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
