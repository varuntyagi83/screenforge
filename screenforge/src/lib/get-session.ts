import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

interface SessionUser {
  id: string
  name?: string | null
  email?: string | null
  image?: string | null
  accessToken?: string
}

export async function getSession(): Promise<{ user: SessionUser } | null> {
  const session = await getServerSession(authOptions)
  if (!session?.user) return null
  return session as unknown as { user: SessionUser }
}
