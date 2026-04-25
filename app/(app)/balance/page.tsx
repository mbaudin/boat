import { DateTime } from 'luxon'
import { Box, Typography } from '@mui/material'
import { auth } from '@/lib/auth'
import { computeUsage } from '@/lib/usage'
import { UsageScoreboard } from '@/components/Balance/UsageScoreboard'

interface SearchParams {
  searchParams: Promise<{ year?: string }>
}

export default async function BalancePage({ searchParams }: SearchParams): Promise<React.ReactNode> {
  const session = await auth()
  if (!session?.user.ownerId) {
    return null
  }
  const params = await searchParams
  const year = params.year ? parseInt(params.year, 10) : DateTime.now().year
  const usage = await computeUsage(year)
  return (
    <Box>
      <Typography variant="h5" gutterBottom>Balance</Typography>
      <UsageScoreboard year={year} usage={usage} />
    </Box>
  )
}
