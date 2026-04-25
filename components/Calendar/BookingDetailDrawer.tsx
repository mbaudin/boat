'use client'

import { useState } from 'react'
import { Button, Drawer, Stack, Typography, Box, Chip } from '@mui/material'
import _ from 'lodash'

interface BookingView {
  id: string
  ownerId: string
  startDate: string
  endDate: string
  type: 'FIXED_WEEK' | 'REQUESTED'
  status: 'PENDING' | 'CONFIRMED' | 'REJECTED' | 'CANCELLED'
  notes: string | null
  owner: { id: string, name: string, displayColor: string }
  approvals: { approverOwnerId: string, decision: 'APPROVE' | 'REJECT' }[]
}

interface Props {
  booking: BookingView | null
  currentOwnerId: string
  onClose: () => void
}

export const BookingDetailDrawer = ({ booking, currentOwnerId, onClose }: Props): React.ReactNode => {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!booking) {
    return <Drawer anchor="right" open={false} onClose={onClose}><Box sx={{ width: 360 }} /></Drawer>
  }

  const isOwner = booking.ownerId === currentOwnerId
  const canApprove = booking.status === 'PENDING' && !isOwner
    && !_.some(booking.approvals, (a) => a.approverOwnerId === currentOwnerId)

  const post = async (path: string): Promise<void> => {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(path, { method: 'POST' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? `HTTP ${res.status}`)
      }
      onClose()
      window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Drawer anchor="right" open={!!booking} onClose={onClose}>
      <Box sx={{ width: 360, p: 3 }}>
        <Stack spacing={2}>
          <Typography variant="h6">{booking.owner.name}</Typography>
          <Box>
            <Chip
              label={booking.type === 'FIXED_WEEK' ? 'Fixed week' : 'Requested'}
              size="small"
              sx={{ bgcolor: booking.owner.displayColor, color: '#fff', mr: 1 }}
            />
            <Chip label={booking.status} size="small" variant="outlined" />
          </Box>
          <Typography variant="body2">
            {booking.startDate} → {booking.endDate}
          </Typography>
          {booking.notes && (
            <Typography variant="body2" color="text.secondary">{booking.notes}</Typography>
          )}
          {booking.status === 'PENDING' && (
            <Box>
              <Typography variant="caption" color="text.secondary">
                Approvals: {booking.approvals.filter((a) => a.decision === 'APPROVE').length} / 2
              </Typography>
            </Box>
          )}
          {error && <Typography color="error" variant="body2">{error}</Typography>}
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
            {canApprove && (
              <>
                <Button
                  variant="contained"
                  color="success"
                  disabled={busy}
                  onClick={() => post(`/api/bookings/${booking.id}/approve`)}
                >
                  Approve
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  disabled={busy}
                  onClick={() => post(`/api/bookings/${booking.id}/reject`)}
                >
                  Reject
                </Button>
              </>
            )}
            {isOwner && booking.status !== 'CANCELLED' && booking.status !== 'REJECTED' && (
              <Button
                variant="outlined"
                color="error"
                disabled={busy}
                onClick={() => post(`/api/bookings/${booking.id}/cancel`)}
              >
                Cancel
              </Button>
            )}
          </Stack>
        </Stack>
      </Box>
    </Drawer>
  )
}
