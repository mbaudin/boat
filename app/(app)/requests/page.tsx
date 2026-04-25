import { BookingStatus } from '@/lib/constants'
import { Typography, Box } from '@mui/material'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { formatDate } from '@/lib/dates'
import { PendingList } from '@/components/Requests/PendingList'

export default async function RequestsPage(): Promise<React.ReactNode> {
  const session = await auth()
  if (!session?.user.ownerId) {
    return null
  }
  const pending = await prisma.booking.findMany({
    where: { status: BookingStatus.PENDING },
    include: { owner: true, approvals: true },
    orderBy: { startDate: 'asc' },
  })

  const views = pending.map((b) => ({
    id: b.id,
    ownerId: b.ownerId,
    startDate: formatDate(b.startDate),
    endDate: formatDate(b.endDate),
    notes: b.notes,
    owner: { name: b.owner.name, displayColor: b.owner.displayColor },
    approvals: b.approvals.map((a) => ({
      approverOwnerId: a.approverOwnerId,
      decision: a.decision as 'APPROVE' | 'REJECT',
    })),
  }))

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Pending requests</Typography>
      <PendingList currentOwnerId={session.user.ownerId} requests={views} />
    </Box>
  )
}
