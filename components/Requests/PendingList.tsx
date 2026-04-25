'use client'

import { useState } from 'react'
import _ from 'lodash'
import { Button, Paper, Stack, Typography, Chip, Box } from '@mui/material'

interface PendingRequest {
  id: string
  ownerId: string
  startDate: string
  endDate: string
  notes: string | null
  owner: { name: string, displayColor: string }
  approvals: { approverOwnerId: string, decision: 'APPROVE' | 'REJECT' }[]
}

interface Props {
  currentOwnerId: string
  requests: PendingRequest[]
}

export const PendingList = ({ currentOwnerId, requests }: Props): React.ReactNode => {
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const act = async (id: string, action: 'approve' | 'reject'): Promise<void> => {
    setBusyId(id)
    setError(null)
    try {
      const res = await fetch(`/api/bookings/${id}/${action}`, { method: 'POST' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? `HTTP ${res.status}`)
      }
      window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed')
    } finally {
      setBusyId(null)
    }
  }

  if (requests.length === 0) {
    return <Typography color="text.secondary">No pending requests.</Typography>
  }

  return (
    <Stack spacing={2}>
      {error && <Typography color="error">{error}</Typography>}
      {requests.map((r) => {
        const isOwner = r.ownerId === currentOwnerId
        const alreadyDecided = _.some(r.approvals, (a) => a.approverOwnerId === currentOwnerId)
        const approveCount = _.filter(r.approvals, { decision: 'APPROVE' }).length
        return (
          <Paper key={r.id} sx={{ p: 2 }}>
            <Stack direction="row" spacing={2} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
              <Box sx={{ width: 10, height: 32, bgcolor: r.owner.displayColor, borderRadius: 1 }} />
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="subtitle1">
                  {r.owner.name} — {r.startDate} → {r.endDate}
                </Typography>
                {r.notes && <Typography variant="body2" color="text.secondary">{r.notes}</Typography>}
                <Chip size="small" label={`${approveCount} / 2 approvals`} sx={{ mt: 0.5 }} />
              </Box>
              {!isOwner && !alreadyDecided && (
                <Stack direction="row" spacing={1}>
                  <Button
                    variant="contained"
                    color="success"
                    disabled={busyId === r.id}
                    onClick={() => act(r.id, 'approve')}
                  >
                    Approve
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    disabled={busyId === r.id}
                    onClick={() => act(r.id, 'reject')}
                  >
                    Reject
                  </Button>
                </Stack>
              )}
              {alreadyDecided && <Chip label="You decided" size="small" />}
              {isOwner && <Chip label="Your request" size="small" />}
            </Stack>
          </Paper>
        )
      })}
    </Stack>
  )
}
