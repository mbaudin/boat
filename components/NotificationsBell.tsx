'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Badge,
  Box,
  IconButton,
  Menu,
  MenuItem,
  Typography,
  Divider,
} from '@mui/material'
import NotificationsIcon from '@mui/icons-material/Notifications'
import { DateTime } from 'luxon'
import _ from 'lodash'

interface NotificationView {
  id: string
  kind: string
  title: string
  body: string
  link: string | null
  readAt: string | null
  createdAt: string
}

interface Props {
  initialUnreadCount: number
}

export const NotificationsBell = ({ initialUnreadCount }: Props): React.ReactNode => {
  const router = useRouter()
  const [items, setItems] = useState<NotificationView[]>([])
  const [unread, setUnread] = useState(initialUnreadCount)
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)

  const load = async (): Promise<void> => {
    const res = await fetch('/api/notifications')
    if (!res.ok) {
      return
    }
    const data: NotificationView[] = await res.json()
    setItems(data)
    setUnread(_.filter(data, (n) => !n.readAt).length)
  }

  useEffect(() => {
    const tick = (): void => {
      load()
    }
    tick()
    const id = setInterval(tick, 30_000)
    return () => clearInterval(id)
  }, [])

  const open = async (e: React.MouseEvent<HTMLElement>): Promise<void> => {
    setAnchor(e.currentTarget)
    if (unread > 0) {
      await fetch('/api/notifications', { method: 'POST', body: '{}' })
      setUnread(0)
      setItems((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })))
    }
  }

  const click = (n: NotificationView): void => {
    setAnchor(null)
    if (n.link) {
      router.push(n.link)
    }
  }

  return (
    <>
      <IconButton onClick={open} size="small" sx={{ color: 'text.primary' }}>
        <Badge badgeContent={unread} color="error">
          <NotificationsIcon />
        </Badge>
      </IconButton>
      <Menu
        anchorEl={anchor}
        open={!!anchor}
        onClose={() => setAnchor(null)}
        slotProps={{ paper: { sx: { minWidth: 320, maxWidth: 400 } } }}
      >
        {items.length === 0 && (
          <MenuItem disabled>
            <Typography variant="body2">No notifications.</Typography>
          </MenuItem>
        )}
        {items.map((n, i) => (
          <Box key={n.id}>
            {i > 0 && <Divider />}
            <MenuItem onClick={() => click(n)} sx={{ alignItems: 'flex-start', whiteSpace: 'normal' }}>
              <Box>
                <Typography variant="subtitle2">{n.title}</Typography>
                <Typography variant="body2" color="text.secondary">{n.body}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {DateTime.fromISO(n.createdAt).toRelative()}
                </Typography>
              </Box>
            </MenuItem>
          </Box>
        ))}
      </Menu>
    </>
  )
}
