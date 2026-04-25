import { buildIcsForToken } from '@/lib/ics'

export const GET = async (
  _req: Request,
  context: { params: Promise<{ token: string }> },
): Promise<Response> => {
  const { token } = await context.params
  const ics = await buildIcsForToken(token)
  if (ics === null) {
    return new Response('Not found', { status: 404 })
  }
  return new Response(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="boat.ics"',
    },
  })
}
