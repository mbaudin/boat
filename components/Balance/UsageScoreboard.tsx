'use client'

import _ from 'lodash'
import { Box, Paper, Stack, Typography, Chip } from '@mui/material'

export interface OwnerUsageView {
  ownerId: string
  ownerName: string
  displayColor: string
  daysConfirmed: number
  daysPending: number
  fairShare: number
  balance: number
}

interface Props {
  year: number
  usage: OwnerUsageView[]
}

export const UsageScoreboard = ({ year, usage }: Props): React.ReactNode => {
  const fairShare = usage[0]?.fairShare ?? 0
  const maxDays = Math.max(fairShare, _.maxBy(usage, 'daysConfirmed')?.daysConfirmed ?? fairShare)

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>Usage — {year}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Fair share is {fairShare} days (the year split evenly between owners). Positive balance = used more than fair share.
        This is informational; it does not block requests.
      </Typography>
      <Stack spacing={2}>
        {usage.map((u) => {
          const fairShareFraction = Math.min(1, u.fairShare / maxDays)
          const usedFraction = Math.min(1, u.daysConfirmed / maxDays)
          return (
            <Box key={u.ownerId}>
              <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 0.5, flexWrap: 'wrap', gap: 1 }}>
                <Typography variant="subtitle1" sx={{ color: u.displayColor, fontWeight: 600 }}>
                  {u.ownerName}
                </Typography>
                <Stack direction="row" spacing={1}>
                  <Chip size="small" label={`${u.daysConfirmed} confirmed`} />
                  {u.daysPending > 0 && <Chip size="small" label={`${u.daysPending} pending`} variant="outlined" />}
                  <Chip
                    size="small"
                    color={u.balance > 0 ? 'warning' : u.balance < 0 ? 'success' : 'default'}
                    label={u.balance === 0 ? 'on target' : u.balance > 0 ? `+${u.balance}` : `${u.balance}`}
                  />
                </Stack>
              </Stack>
              <Box sx={{ position: 'relative', height: 16, bgcolor: '#f0f0f0', borderRadius: 1 }}>
                <Box
                  sx={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: `${usedFraction * 100}%`,
                    bgcolor: u.displayColor,
                    borderRadius: 1,
                  }}
                />
                <Box
                  sx={{
                    position: 'absolute',
                    left: `${fairShareFraction * 100}%`,
                    top: -2,
                    bottom: -2,
                    width: '2px',
                    bgcolor: '#333',
                  }}
                  title="Fair share"
                />
              </Box>
            </Box>
          )
        })}
      </Stack>
    </Paper>
  )
}
