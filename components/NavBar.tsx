'use client'

import Link from 'next/link'
import { AppBar, Badge, Box, Button, Toolbar, Typography } from '@mui/material'

interface Props {
  ownerName: string
  signOutAction: () => Promise<void>
  pendingCount: number
}

export const NavBar = ({ ownerName, signOutAction, pendingCount }: Props): React.ReactNode => {
  return (
    <AppBar position="static" color="default" elevation={1}>
      <Toolbar sx={{ gap: 2 }}>
        <Typography variant="h6" sx={{ flexShrink: 0 }}>Boat</Typography>
        <Button component={Link} href="/">Calendar</Button>
        <Badge
          badgeContent={pendingCount}
          color="error"
          overlap="rectangular"
          sx={{ '& .MuiBadge-badge': { right: 8, top: 8 } }}
        >
          <Button component={Link} href="/requests">Requests</Button>
        </Badge>
        <Button component={Link} href="/balance">Balance</Button>
        <Button component={Link} href="/maintenance">Maintenance</Button>
        <Button component={Link} href="/settings">Settings</Button>
        <Box sx={{ flexGrow: 1 }} />
        <Typography variant="body2" color="text.secondary">{ownerName}</Typography>
        <form action={signOutAction}>
          <Button type="submit" size="small">Sign out</Button>
        </form>
      </Toolbar>
    </AppBar>
  )
}
