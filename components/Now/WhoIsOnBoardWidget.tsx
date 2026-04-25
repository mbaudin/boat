import _ from 'lodash'
import { Paper, Typography, Box, Chip, Stack } from '@mui/material'
import { DateTime } from 'luxon'
import { prisma } from '@/lib/db'
import { BookingStatus } from '@/lib/constants'
import { formatDate } from '@/lib/dates'

const UPCOMING_COUNT = 6

export const WhoIsOnBoardWidget = async (): Promise<React.ReactNode> => {
  const today = DateTime.now().startOf('day').toJSDate()

  const current = await prisma.booking.findFirst({
    where: {
      status: BookingStatus.CONFIRMED,
      startDate: { lte: today },
      endDate: { gte: today },
    },
    include: { owner: true },
    orderBy: { startDate: 'asc' },
  })

  const upcoming = await prisma.booking.findMany({
    where: {
      status: BookingStatus.CONFIRMED,
      endDate: { gte: today },
    },
    include: { owner: true },
    orderBy: { startDate: 'asc' },
    take: UPCOMING_COUNT,
  })

  const pendingCount = await prisma.booking.count({
    where: { status: BookingStatus.PENDING },
  })

  return (
    <Paper sx={{ p: 2, mb: 2 }} elevation={1}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={4}>
        <Box sx={{ minWidth: 200 }}>
          <Typography variant="caption" color="text.secondary">On the boat now</Typography>
          {current ? (
            <Typography variant="body1" sx={{ color: current.owner.displayColor, fontWeight: 600 }}>
              {current.owner.name}, through {formatDate(current.endDate)}
            </Typography>
          ) : (
            <Typography variant="body1" color="text.secondary">Free</Typography>
          )}
          {pendingCount > 0 && (
            <Chip
              size="small"
              label={`${pendingCount} pending request${pendingCount === 1 ? '' : 's'}`}
              sx={{ mt: 1 }}
              color="warning"
              variant="outlined"
            />
          )}
        </Box>

        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="caption" color="text.secondary">Coming up</Typography>
          {upcoming.length === 0 ? (
            <Typography variant="body2" color="text.secondary">Nothing scheduled.</Typography>
          ) : (
            <Stack spacing={0.5} sx={{ mt: 0.5 }}>
              {_.map(upcoming, (b) => (
                <Box
                  key={b.id}
                  sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}
                >
                  <Box sx={{ width: 8, height: 16, bgcolor: b.owner.displayColor, borderRadius: 0.5 }} />
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {b.owner.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {formatDate(b.startDate)} → {formatDate(b.endDate)}
                  </Typography>
                </Box>
              ))}
            </Stack>
          )}
        </Box>
      </Stack>
    </Paper>
  )
}
