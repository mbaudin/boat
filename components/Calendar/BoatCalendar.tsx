'use client'

import { useMemo, useState, useRef } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import type { DateSelectArg } from '@fullcalendar/core'
import { DateTime } from 'luxon'
import _ from 'lodash'
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from '@mui/material'
import { Controller, useForm } from 'react-hook-form'
import { BookingDetailDrawer } from './BookingDetailDrawer'

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

interface MaintenanceView {
  id: string
  startDate: string
  endDate: string
  reason: string
  createdBy: { name: string }
}

interface Props {
  currentOwnerId: string
  bookings: BookingView[]
  maintenance: MaintenanceView[]
  initialDate: string
}

interface RequestForm {
  startDate: string
  endDate: string
  notes: string
}

export const BoatCalendar = ({ currentOwnerId, bookings, maintenance, initialDate }: Props): React.ReactNode => {
  const [selected, setSelected] = useState<BookingView | null>(null)
  const [requestRange, setRequestRange] = useState<{ start: string, end: string } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const calendarRef = useRef<FullCalendar | null>(null)

  const { control, handleSubmit, reset, register } = useForm<RequestForm>({
    defaultValues: { startDate: '', endDate: '', notes: '' },
  })

  const events = useMemo(() => {
    const bookingEvents = _.chain(bookings)
      .filter((b) => b.status === 'CONFIRMED' || b.status === 'PENDING')
      .map((b) => ({
        id: b.id,
        title: `${b.owner.name}${b.type === 'FIXED_WEEK' ? ' (fixed)' : ''}${b.status === 'PENDING' ? ' — pending' : ''}`,
        start: b.startDate,
        end: DateTime.fromISO(b.startDate < b.endDate ? b.endDate : b.startDate).plus({ days: 1 }).toISODate() ?? b.endDate,
        backgroundColor: b.owner.displayColor,
        borderColor: b.owner.displayColor,
        textColor: '#fff',
        classNames: [
          b.type === 'FIXED_WEEK' ? 'booking-fixed' : 'booking-requested',
          b.status === 'PENDING' ? 'booking-pending' : '',
        ].filter(Boolean),
        extendedProps: { booking: b, kind: 'booking' as const },
      }))
      .value()

    const maintenanceEvents = _.map(maintenance, (m) => ({
      id: `m-${m.id}`,
      title: `Unavailable: ${m.reason}`,
      start: m.startDate,
      end: DateTime.fromISO(m.endDate).plus({ days: 1 }).toISODate() ?? m.endDate,
      classNames: ['booking-maintenance'],
      extendedProps: { maintenance: m, kind: 'maintenance' as const },
    }))

    return [...bookingEvents, ...maintenanceEvents]
  }, [bookings, maintenance])

  const onSelect = (arg: DateSelectArg): void => {
    const start = DateTime.fromJSDate(arg.start).toISODate() ?? ''
    const endExclusive = DateTime.fromJSDate(arg.end).toISODate() ?? ''
    const end = DateTime.fromISO(endExclusive).minus({ days: 1 }).toISODate() ?? start
    reset({ startDate: start, endDate: end, notes: '' })
    setRequestRange({ start, end })
    setError(null)
  }

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? `HTTP ${res.status}`)
      }
      setRequestRange(null)
      window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit')
    } finally {
      setSubmitting(false)
    }
  })

  return (
    <Box>
      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        initialDate={initialDate}
        firstDay={1}
        weekNumbers
        selectable
        select={onSelect}
        events={events}
        height="auto"
        headerToolbar={{ left: 'prev,next today', center: 'title', right: '' }}
        eventClick={(info) => {
          if (info.event.extendedProps.kind === 'booking') {
            setSelected(info.event.extendedProps.booking as BookingView)
          }
        }}
      />

      <BookingDetailDrawer
        booking={selected}
        currentOwnerId={currentOwnerId}
        onClose={() => setSelected(null)}
      />

      <Dialog open={!!requestRange} onClose={() => setRequestRange(null)} fullWidth maxWidth="sm">
        <form onSubmit={onSubmit}>
          <DialogTitle>Request these days</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Controller
                name="startDate"
                control={control}
                render={({ field }) => <TextField {...field} label="Start date" type="date" slotProps={{ inputLabel: { shrink: true } }} fullWidth />}
              />
              <Controller
                name="endDate"
                control={control}
                render={({ field }) => <TextField {...field} label="End date" type="date" slotProps={{ inputLabel: { shrink: true } }} fullWidth />}
              />
              <TextField {...register('notes')} label="Notes (optional)" multiline minRows={2} fullWidth />
              {error && <Typography color="error" variant="body2">{error}</Typography>}
              <Typography variant="caption" color="text.secondary">
                The owner(s) currently booked for these days will be asked to approve.
              </Typography>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setRequestRange(null)} disabled={submitting}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={submitting}>
              {submitting ? 'Sending…' : 'Send request'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  )
}
