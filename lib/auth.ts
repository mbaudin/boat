import NextAuth, { type DefaultSession } from 'next-auth'
import Google from 'next-auth/providers/google'
import Credentials from 'next-auth/providers/credentials'
import { prisma } from './db'
import { env } from './env'

declare module 'next-auth' {
  interface Session {
    user: {
      ownerId: string
    } & DefaultSession['user']
  }
}

const isDevMode = process.env.NODE_ENV !== 'production'

const providers = []

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    Google({
      clientId: env.googleClientId(),
      clientSecret: env.googleClientSecret(),
    }),
  )
}

if (isDevMode) {
  providers.push(
    Credentials({
      id: 'dev',
      name: 'Dev login',
      credentials: { email: { label: 'Email', type: 'text' } },
      authorize: async (credentials) => {
        const email = String(credentials?.email ?? '').toLowerCase()
        const allowlist = env.ownerEmails()
        if (!allowlist.includes(email)) {
          return null
        }
        const owner = await prisma.owner.findUnique({ where: { email } })
        if (!owner) {
          return null
        }
        return { id: owner.id, email: owner.email, name: owner.name }
      },
    }),
  )
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers,
  secret: env.authSecret(),
  session: { strategy: 'jwt' },
  callbacks: {
    signIn: async ({ user }) => {
      const email = user.email?.toLowerCase()
      if (!email) {
        return false
      }
      const allowlist = env.ownerEmails()
      return allowlist.includes(email)
    },
    jwt: async ({ token, user }) => {
      if (user?.email) {
        const owner = await prisma.owner.findUnique({ where: { email: user.email.toLowerCase() } })
        if (owner) {
          token.ownerId = owner.id
        }
      }
      return token
    },
    session: async ({ session, token }) => {
      if (token.ownerId) {
        session.user.ownerId = token.ownerId as string
      }
      return session
    },
  },
  pages: {
    signIn: '/sign-in',
  },
})
