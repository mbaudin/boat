import { Box, Typography } from '@mui/material'
import { prisma } from '@/lib/db'
import { formatDate } from '@/lib/dates'
import { MaintenanceManager } from '@/components/Maintenance/MaintenanceManager'

export default async function MaintenancePage(): Promise<React.ReactNode> {
  const blocks = await prisma.maintenanceBlock.findMany({
    include: { createdBy: true },
    orderBy: { startDate: 'asc' },
  })
  const views = blocks.map((b) => ({
    id: b.id,
    startDate: formatDate(b.startDate),
    endDate: formatDate(b.endDate),
    reason: b.reason,
    createdByName: b.createdBy.name,
  }))
  return (
    <Box>
      <Typography variant="h5" gutterBottom>Maintenance</Typography>
      <MaintenanceManager blocks={views} />
    </Box>
  )
}
