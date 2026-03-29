import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from '@/lib/db'

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'openid email profile https://www.googleapis.com/auth/drive.file',
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    }),
  ],
  session: { strategy: 'jwt' },
  callbacks: {
    async jwt({ token, account, user }) {
      // Initial sign-in: persist tokens
      if (account && user) {
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
        token.expiresAt = account.expires_at
        token.userId = user.id
      }

      // Auto-refresh expired tokens
      if (token.expiresAt && typeof token.expiresAt === 'number' && Date.now() / 1000 > token.expiresAt) {
        try {
          const response = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              client_id: process.env.GOOGLE_CLIENT_ID!,
              client_secret: process.env.GOOGLE_CLIENT_SECRET!,
              grant_type: 'refresh_token',
              refresh_token: token.refreshToken as string,
            }),
          })
          const refreshed = await response.json() as { access_token: string; expires_in: number; refresh_token?: string }

          token.accessToken = refreshed.access_token
          token.expiresAt = Math.floor(Date.now() / 1000) + refreshed.expires_in
          if (refreshed.refresh_token) {
            token.refreshToken = refreshed.refresh_token
          }
        } catch {
          token.error = 'RefreshTokenError'
        }
      }

      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId as string
      }
      return session
    },
  },
  events: {
    async signIn({ user }) {
      // Create default preferences if missing
      if (user.id) {
        const existing = await prisma.userPreferences.findUnique({
          where: { userId: user.id },
        })
        if (!existing) {
          await prisma.userPreferences.create({
            data: { userId: user.id },
          })
        }
      }
    },
  },
  pages: {
    signIn: '/login',
  },
})
