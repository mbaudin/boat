import _ from 'lodash'
import { DateTime } from 'luxon'
import { BookingStatus, BookingType } from './constants'
import { prisma } from './db'
import { daysInRangeInclusive } from './dates'
import { weeksInYear } from './rotation'

export interface OwnerUsage {
  ownerId: string
  ownerName: string
  displayColor: string
  daysConfirmed: number
  daysPending: number
  fairShare: number
  balance: number
}

const fairShareDays = (year: number, ownerCount: number): number =>
  ownerCount === 0 ? 0 : Math.round((weeksInYear(year) * 7) / ownerCount)

const clampToYear = (start: Date, end: Date, year: number): { start: Date, end: Date } | null => {
  const yearStart = DateTime.fromObject({ year, month: 1, day: 1 }, { zone: 'utc' }).toJSDate()
  const yearEnd = DateTime.fromObject({ year, month: 12, day: 31 }, { zone: 'utc' }).toJSDate()
  if (end < yearStart || start > yearEnd) {
    return null
  }
  return {
    start: start < yearStart ? yearStart : start,
    end: end > yearEnd ? yearEnd : end,
  }
}

export const computeUsage = async (year: number): Promise<OwnerUsage[]> => {
  const owners = await prisma.owner.findMany({ orderBy: { name: 'asc' } })

  const yearStart = DateTime.fromObject({ year, month: 1, day: 1 }, { zone: 'utc' }).toJSDate()
  const yearEnd = DateTime.fromObject({ year, month: 12, day: 31 }, { zone: 'utc' }).toJSDate()

  const bookings = await prisma.booking.findMany({
    where: {
      status: { in: [BookingStatus.CONFIRMED, BookingStatus.PENDING] },
      startDate: { lte: yearEnd },
      endDate: { gte: yearStart },
    },
  })

  const share = fairShareDays(year, owners.length)

  return _.map(owners, (owner) => {
    const own = _.filter(bookings, { ownerId: owner.id })
    const daysConfirmed = _.sumBy(own, (b) => {
      if (b.status !== BookingStatus.CONFIRMED) {
        return 0
      }
      const clipped = clampToYear(b.startDate, b.endDate, year)
      return clipped ? daysInRangeInclusive(clipped.start, clipped.end) : 0
    })
    const daysPending = _.sumBy(own, (b) => {
      if (b.status !== BookingStatus.PENDING || b.type !== BookingType.REQUESTED) {
        return 0
      }
      const clipped = clampToYear(b.startDate, b.endDate, year)
      return clipped ? daysInRangeInclusive(clipped.start, clipped.end) : 0
    })
    return {
      ownerId: owner.id,
      ownerName: owner.name,
      displayColor: owner.displayColor,
      daysConfirmed,
      daysPending,
      fairShare: share,
      balance: daysConfirmed - share,
    }
  })
}
