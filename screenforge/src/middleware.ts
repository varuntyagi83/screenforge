import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const { pathname } = req.nextUrl

  // Public routes
  const publicPaths = ['/login', '/share', '/api/auth', '/api/share']
  const isPublic = publicPaths.some((p) => pathname.startsWith(p)) || pathname === '/'

  if (isPublic) return NextResponse.next()

  // Protected routes — redirect to login if no session
  if (!req.auth) {
    const loginUrl = new URL('/login', req.nextUrl.origin)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
