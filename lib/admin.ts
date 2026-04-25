import { prisma } from './db'
import { env } from './env'

export const isAdminOwnerId = async (ownerId: string): Promise<boolean> => {
  const owner = await prisma.owner.findUnique({ where: { id: ownerId } })
  if (!owner) {
    return false
  }
  const admins = env.adminEmails()
  return admins.includes(owner.email.toLowerCase())
}
