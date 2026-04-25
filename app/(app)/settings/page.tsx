import { Box, Typography, Paper, Stack, Chip } from '@mui/material'
import { DateTime } from 'luxon'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { env } from '@/lib/env'
import { isAdminOwnerId } from '@/lib/admin'
import { SettingsClient } from '@/components/Settings/SettingsClient'

export default async function SettingsPage(): Promise<React.ReactNode> {
  const session = await auth()
  if (!session?.user.ownerId) {
    return null
  }
  const owner = await prisma.owner.findUniqueOrThrow({ where: { id: session.user.ownerId } })
  const isAdmin = await isAdminOwnerId(owner.id)
  const auditEntries = await prisma.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: { actor: true },
  })

  const base = env.appBaseUrl()
  const icsUrl = `${base}/api/ics/${owner.icsToken}`

  const currentYear = DateTime.now().year
  const yearsToShow = [currentYear, currentYear + 1]
  const allocations = await prisma.weekAllocation.findMany({
    where: { year: { in: yearsToShow } },
    include: { owner: true },
    orderBy: [{ year: 'asc' }, { isoWeek: 'asc' }],
  })

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Settings</Typography>

      <Stack spacing={3}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>Your ICS subscription</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Subscribe to this URL in any calendar app to see confirmed bookings.
          </Typography>
          <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
            {icsUrl}
          </Typography>
        </Paper>

        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>Week allocations</Typography>
          <Stack spacing={1}>
            {yearsToShow.map((year) => {
              const yearAllocations = allocations.filter((a) => a.year === year)
              return (
                <Box key={year}>
                  <Typography variant="subtitle1">{year}</Typography>
                  {yearAllocations.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      Not set up yet.
                    </Typography>
                  ) : (
                    <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                      {yearAllocations.map((a) => (
                        <Chip
                          key={a.id}
                          label={`W${a.isoWeek} — ${a.owner.name}`}
                          sx={{ bgcolor: a.owner.displayColor, color: '#fff' }}
                        />
                      ))}
                    </Stack>
                  )}
                </Box>
              )
            })}
          </Stack>
          {isAdmin && <SettingsClient currentYear={currentYear} />}
          {!isAdmin && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
              Year rollover is admin-only.
            </Typography>
          )}
        </Paper>

        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>Recent activity</Typography>
          <Stack spacing={0.5}>
            {auditEntries.map((e) => (
              <Typography key={e.id} variant="body2">
                <strong>{e.actor.name}</strong> — {e.action} on {e.entityType} {e.entityId.slice(0, 8)}
                <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                  {DateTime.fromJSDate(e.createdAt).toRelative()}
                </Typography>
              </Typography>
            ))}
          </Stack>
        </Paper>
      </Stack>
    </Box>
  )
}
