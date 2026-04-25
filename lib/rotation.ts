import _ from 'lodash'
import { DateTime } from 'luxon'

export interface RotationEntry {
  isoWeek: number
  ownerId: string
}

export const weeksInYear = (year: number): number => {
  const dec28 = DateTime.fromObject({ year, month: 12, day: 28 }, { zone: 'utc' })
  return dec28.weekNumber
}

export const ROTATION_BASE_YEAR = 2026

export const computeRotation = (
  year: number,
  ownerIds: string[],
  baseYear: number = ROTATION_BASE_YEAR,
): RotationEntry[] => {
  if (ownerIds.length === 0) {
    throw new Error('Need at least one owner to compute rotation')
  }
  const offset = ((year - baseYear) % ownerIds.length + ownerIds.length) % ownerIds.length
  const numWeeks = weeksInYear(year)
  return _.map(_.range(1, numWeeks + 1), (isoWeek) => ({
    isoWeek,
    ownerId: ownerIds[(isoWeek - 1 + offset) % ownerIds.length],
  }))
}
