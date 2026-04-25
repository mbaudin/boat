import { DateTime } from 'luxon'
import { BookingStatus } from '@/lib/constants'
import { Box, Typography } from '@mui/material'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { formatDate } from '@/lib/dates'
import { BoatCalendar } from '@/components/Calendar/BoatCalendar'
import { WhoIsOnBoardWidget } from '@/components/Now/WhoIsOnBoardWidget'

export default async function HomePage(): Promise<React.ReactNode> {
  const session = await auth()
  if (!session?.user.ownerId) {
    return null
  }

  const bookings = await prisma.booking.findMany({
    where: { status: { in: [BookingStatus.CONFIRMED, BookingStatus.PENDING] } },
    include: { owner: true, approvals: true },
    orderBy: { startDate: 'asc' },
  })
  const maintenance = await prisma.maintenanceBlock.findMany({
    include: { createdBy: true },
    orderBy: { startDate: 'asc' },
  })

  const bookingViews = bookings.map((b) => ({
    id: b.id,
    ownerId: b.ownerId,
    startDate: formatDate(b.startDate),
    endDate: formatDate(b.endDate),
    type: b.type as 'FIXED_WEEK' | 'REQUESTED',
    status: b.status as 'PENDING' | 'CONFIRMED' | 'REJECTED' | 'CANCELLED',
    notes: b.notes,
    owner: { id: b.owner.id, name: b.owner.name, displayColor: b.owner.displayColor },
    approvals: b.approvals.map((a) => ({
      approverOwnerId: a.approverOwnerId,
      decision: a.decision as 'APPROVE' | 'REJECT',
    })),
  }))

  const maintenanceViews = maintenance.map((m) => ({
    id: m.id,
    startDate: formatDate(m.startDate),
    endDate: formatDate(m.endDate),
    reason: m.reason,
    createdBy: { name: m.createdBy.name },
  }))

  const today = DateTime.now().startOf('day')
  const todayIso = today.toISODate() ?? ''
  const hasBookingInCurrentMonth = bookings.some((b) => {
    const start = DateTime.fromJSDate(b.startDate)
    return start.year === today.year && start.month === today.month
  })
  const nextUpcoming = bookings.find((b) => b.endDate >= today.toJSDate())
  const initialDate = hasBookingInCurrentMonth || !nextUpcoming
    ? todayIso
    : DateTime.fromJSDate(nextUpcoming.startDate).toISODate() ?? todayIso

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Calendar</Typography>
      <WhoIsOnBoardWidget />
      <BoatCalendar
        currentOwnerId={session.user.ownerId}
        bookings={bookingViews}
        maintenance={maintenanceViews}
        initialDate={initialDate}
      />
    </Box>
  )
}
