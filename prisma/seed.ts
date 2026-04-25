import { PrismaClient } from '@prisma/client'
import { randomBytes } from 'crypto'
import { DateTime } from 'luxon'
import { computeRotation } from '../lib/rotation'
import { isoWeekToDateRange } from '../lib/dates'
import { BookingStatus, BookingType } from '../lib/constants'

const prisma = new PrismaClient()

const OWNERS = [
  { email: 'magnus.baudin@gmail.com', name: 'Magnus', displayColor: '#1976d2' },
  { email: 'lars@emarketeer.com', name: 'Lars', displayColor: '#2e7d32' },
  { email: 'benebjornen@gmail.com', name: 'Bene', displayColor: '#c62828' },
]

const randomToken = (): string => randomBytes(24).toString('hex')

async function main(): Promise<void> {
  const envEmails = (process.env.OWNER_EMAILS ?? '').split(',').map((e) => e.trim()).filter(Boolean)
  const ownerSeeds = envEmails.length === OWNERS.length
    ? envEmails.map((email, i) => ({ ...OWNERS[i], email }))
    : OWNERS

  const createdOwners = []
  for (const o of ownerSeeds) {
    const owner = await prisma.owner.upsert({
      where: { email: o.email },
      update: { name: o.name, displayColor: o.displayColor },
      create: { ...o, icsToken: randomToken() },
    })
    createdOwners.push(owner)
  }

  const year = DateTime.now().year
  const existing = await prisma.weekAllocation.findMany({ where: { year } })
  if (existing.length === 0) {
    const rotation = computeRotation(year, createdOwners.map((o) => o.id))
    for (const { isoWeek, ownerId } of rotation) {
      await prisma.weekAllocation.create({ data: { year, isoWeek, ownerId } })
      const { start, end } = isoWeekToDateRange(year, isoWeek)
      await prisma.booking.create({
        data: {
          ownerId,
          startDate: start,
          endDate: end,
          type: BookingType.FIXED_WEEK,
          status: BookingStatus.CONFIRMED,
        },
      })
    }
    console.log(`Seeded year ${year} rotation:`, rotation)
  } else {
    console.log(`Year ${year} rotation already exists, skipping.`)
  }

  console.log('Seed complete. Owners:', createdOwners.map((o) => ({ email: o.email, id: o.id })))
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
