import { redirect } from 'next/navigation'
import { Box, Container } from '@mui/material'
import { auth, signOut } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { BookingStatus } from '@/lib/constants'
import { NavBar } from '@/components/NavBar'

export default async function AppLayout({ children }: { children: React.ReactNode }): Promise<React.ReactNode> {
  const session = await auth()
  if (!session?.user.ownerId) {
    redirect('/sign-in')
  }
  const owner = await prisma.owner.findUnique({ where: { id: session.user.ownerId } })
  if (!owner) {
    redirect('/sign-in')
  }

  const pending = await prisma.booking.findMany({
    where: { status: BookingStatus.PENDING },
    include: { approvals: true },
  })
  const myPendingCount = pending.filter((b) => {
    const required = b.requiredApproverIds ? b.requiredApproverIds.split(',') : []
    const alreadyDecided = b.approvals.some((a) => a.approverOwnerId === owner.id)
    return required.includes(owner.id) && !alreadyDecided
  }).length

  const signOutAction = async (): Promise<void> => {
    'use server'
    await signOut({ redirectTo: '/sign-in' })
  }

  return (
    <Box>
      <NavBar
        ownerName={owner.name}
        signOutAction={signOutAction}
        pendingCount={myPendingCount}
      />
      <Container maxWidth="lg" sx={{ py: 3 }}>
        {children}
      </Container>
    </Box>
  )
}
