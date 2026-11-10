import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import Facebook from 'next-auth/providers/facebook'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '@/lib/db'

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2).max(80).optional(),
  mode: z.enum(['login', 'signup']).optional(),
})

const providers = []

if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  )
}

if (process.env.AUTH_FACEBOOK_ID && process.env.AUTH_FACEBOOK_SECRET) {
  providers.push(
    Facebook({
      clientId: process.env.AUTH_FACEBOOK_ID,
      clientSecret: process.env.AUTH_FACEBOOK_SECRET,
    }),
  )
}

providers.push(
  Credentials({
    id: 'credentials',
    name: 'Email',
    credentials: {
      email: { label: 'Email', type: 'email' },
      password: { label: 'Password', type: 'password' },
      name: { label: 'Name', type: 'text' },
      mode: { label: 'Mode', type: 'text' },
    },
    async authorize(raw) {
      const parsed = credentialsSchema.safeParse(raw)
      if (!parsed.success) return null
      const { email, password, name, mode } = parsed.data
      const normalized = email.toLowerCase().trim()

      if (mode === 'signup') {
        const existing = await prisma.authUser.findUnique({ where: { email: normalized } })
        if (existing) return null
        if (!name || name.trim().length < 2) return null
        const passwordHash = await bcrypt.hash(password, 10)
        const user = await prisma.authUser.create({
          data: {
            email: normalized,
            name: name.trim(),
            passwordHash,
            provider: 'credentials',
          },
        })
        return { id: user.id, email: user.email, name: user.name, image: user.image }
      }

      const user = await prisma.authUser.findUnique({ where: { email: normalized } })
      if (!user?.passwordHash) return null
      const ok = await bcrypt.compare(password, user.passwordHash)
      if (!ok) return null
      return { id: user.id, email: user.email, name: user.name, image: user.image }
    },
  }),
)

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'google' || account?.provider === 'facebook') {
        const email = user.email?.toLowerCase()
        if (!email) return false
        await prisma.authUser.upsert({
          where: { email },
          update: {
            name: user.name || undefined,
            image: user.image || undefined,
            provider: account.provider,
            emailVerified: new Date(),
          },
          create: {
            email,
            name: user.name || email.split('@')[0],
            image: user.image || null,
            provider: account.provider,
            emailVerified: new Date(),
          },
        })
      }
      return true
    },
    async jwt({ token, user }) {
      if (user) {
        token.uid = user.id
        token.name = user.name
        token.email = user.email
        token.picture = user.image
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.uid as string) || token.sub || ''
        session.user.name = (token.name as string) || session.user.name
        session.user.email = (token.email as string) || session.user.email
        session.user.image = (token.picture as string) || session.user.image
      }
      return session
    },
  },
  trustHost: true,
  secret: process.env.AUTH_SECRET || 'roshan-rozgar-dev-secret-change-me',
})

export function authProvidersAvailable() {
  return {
    google: Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET),
    facebook: Boolean(process.env.AUTH_FACEBOOK_ID && process.env.AUTH_FACEBOOK_SECRET),
  }
}
