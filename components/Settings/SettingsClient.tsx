'use client'

import { useState } from 'react'
import { Button, Stack, Typography } from '@mui/material'

export const SettingsClient = ({ currentYear }: { currentYear: number }): React.ReactNode => {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const rollover = async (year: number): Promise<void> => {
    if (!confirm(`Set up year ${year}? This creates fixed-week bookings and calendar events.`)) {
      return
    }
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/year/${year}`, { method: 'POST' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? `HTTP ${res.status}`)
      }
      window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: 'wrap' }}>
      <Button variant="outlined" disabled={busy} onClick={() => rollover(currentYear)}>
        Set up {currentYear}
      </Button>
      <Button variant="outlined" disabled={busy} onClick={() => rollover(currentYear + 1)}>
        Set up {currentYear + 1}
      </Button>
      {error && <Typography color="error" variant="body2">{error}</Typography>}
    </Stack>
  )
}
