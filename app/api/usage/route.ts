import { NextResponse } from 'next/server'
import { DateTime } from 'luxon'
import { auth } from '@/lib/auth'
import { computeUsage } from '@/lib/usage'

export const GET = async (req: Request): Promise<Response> => {
  const session = await auth()
  if (!session?.user.ownerId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const url = new URL(req.url)
  const year = parseInt(url.searchParams.get('year') ?? String(DateTime.now().year), 10)
  const usage = await computeUsage(year)
  return NextResponse.json({ year, usage })
}
