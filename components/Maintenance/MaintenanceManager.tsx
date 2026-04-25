'use client'

import { useState } from 'react'
import { Button, IconButton, Paper, Stack, TextField, Typography } from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import { useForm } from 'react-hook-form'

interface Block {
  id: string
  startDate: string
  endDate: string
  reason: string
  createdByName: string
}

interface FormValues {
  startDate: string
  endDate: string
  reason: string
}

export const MaintenanceManager = ({ blocks }: { blocks: Block[] }): React.ReactNode => {
  const { register, handleSubmit, reset } = useForm<FormValues>({
    defaultValues: { startDate: '', endDate: '', reason: '' },
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = handleSubmit(async (values) => {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? `HTTP ${res.status}`)
      }
      reset()
      window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed')
    } finally {
      setBusy(false)
    }
  })

  const remove = async (id: string): Promise<void> => {
    if (!confirm('Remove this maintenance block?')) {
      return
    }
    setBusy(true)
    try {
      await fetch(`/api/maintenance/${id}`, { method: 'DELETE' })
      window.location.reload()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Stack spacing={3}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>Add a maintenance block</Typography>
        <form onSubmit={onSubmit}>
          <Stack spacing={2} sx={{ maxWidth: 480 }}>
            <TextField
              {...register('startDate')}
              type="date"
              label="Start"
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              {...register('endDate')}
              type="date"
              label="End"
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField {...register('reason', { required: true })} label="Reason" multiline minRows={2} />
            {error && <Typography color="error">{error}</Typography>}
            <Button type="submit" variant="contained" disabled={busy}>Add</Button>
          </Stack>
        </form>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>Current blocks</Typography>
        {blocks.length === 0 ? (
          <Typography color="text.secondary">No maintenance blocks.</Typography>
        ) : (
          <Stack spacing={1}>
            {blocks.map((b) => (
              <Stack
                key={b.id}
                direction="row"
                sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 2 }}
              >
                <Typography>
                  {b.startDate} → {b.endDate}: <strong>{b.reason}</strong>{' '}
                  <Typography component="span" variant="caption" color="text.secondary">
                    (by {b.createdByName})
                  </Typography>
                </Typography>
                <IconButton onClick={() => remove(b.id)} disabled={busy} size="small">
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Stack>
            ))}
          </Stack>
        )}
      </Paper>
    </Stack>
  )
}
