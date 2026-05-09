import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/jwt'

// Routes that require the user to be logged in
const PROTECTED_ROUTES = ['/lobby', '/room']

// Routes that require admin role
const ADMIN_ROUTES = ['/admin']

// Routes that logged-in users should not see (e.g. login page)
const AUTH_ROUTES = ['/']

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const token = req.cookies.get('inkblot_token')?.value
  const user = token ? verifyToken(token) : null

  // ── Admin routes — must be logged in AND be admin ───────────────────────
  if (ADMIN_ROUTES.some((r) => pathname.startsWith(r))) {
    if (!user) {
      return NextResponse.redirect(new URL('/?redirect=/admin', req.url))
    }
    if (user.role !== 'admin') {
      // Logged in but not admin → 403 page
      return NextResponse.redirect(new URL('/403', req.url))
    }
    return NextResponse.next()
  }

  // ── Protected routes — must be logged in ────────────────────────────────
  if (PROTECTED_ROUTES.some((r) => pathname.startsWith(r))) {
    if (!user) {
      return NextResponse.redirect(new URL(`/?redirect=${pathname}`, req.url))
    }
    return NextResponse.next()
  }

  // ── Auth routes — redirect already-logged-in users to lobby ─────────────
  if (AUTH_ROUTES.includes(pathname) && user) {
    return NextResponse.redirect(new URL('/lobby', req.url))
  }

  return NextResponse.next()
}

export const config = {
  // Run middleware on these paths — exclude static files and API routes
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|designs).*)',
  ],
}