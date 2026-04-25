import { DateTime, Interval } from 'luxon'

export const toDate = (iso: string): Date => DateTime.fromISO(iso, { zone: 'utc' }).startOf('day').toJSDate()

export const dateOnly = (d: Date | DateTime): Date => {
  const dt = d instanceof Date ? DateTime.fromJSDate(d, { zone: 'utc' }) : d
  return dt.startOf('day').toJSDate()
}

export const rangesOverlap = (aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean => {
  const a = Interval.fromDateTimes(DateTime.fromJSDate(aStart), DateTime.fromJSDate(aEnd).plus({ days: 1 }))
  const b = Interval.fromDateTimes(DateTime.fromJSDate(bStart), DateTime.fromJSDate(bEnd).plus({ days: 1 }))
  return a.overlaps(b)
}

export const daysInRangeInclusive = (start: Date, end: Date): number => {
  const s = DateTime.fromJSDate(start).startOf('day')
  const e = DateTime.fromJSDate(end).startOf('day')
  return Math.max(0, Math.floor(e.diff(s, 'days').days) + 1)
}

export const isoWeekToDateRange = (year: number, isoWeek: number): { start: Date, end: Date } => {
  const start = DateTime.fromObject({ weekYear: year, weekNumber: isoWeek, weekday: 1 }, { zone: 'utc' })
  const end = start.plus({ days: 6 })
  return { start: start.toJSDate(), end: end.toJSDate() }
}

export const formatDate = (d: Date): string => DateTime.fromJSDate(d, { zone: 'utc' }).toISODate() ?? ''
