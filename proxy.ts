import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/jwt'

const PROTECTED_ROUTES = ['/lobby', '/room']
const ADMIN_ROUTES = ['/admin']
const AUTH_ROUTES = ['/']

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
  const token = req.cookies.get('inkblot_token')?.value
  const user = token ? await verifyToken(token) : null

  // ── Admin routes — must be logged in AND be admin ───────────────────────
  if (ADMIN_ROUTES.some(r => pathname.startsWith(r))) {
    if (!user) return NextResponse.redirect(new URL('/?redirect=/admin', req.url))
    if (user.role !== 'admin') return NextResponse.redirect(new URL('/403', req.url))
    return NextResponse.next()
  }

  // ── Protected routes — must be logged in ────────────────────────────────
  if (PROTECTED_ROUTES.some(r => pathname.startsWith(r))) {
    if (!user) return NextResponse.redirect(new URL(`/?redirect=${pathname}`, req.url))
    return NextResponse.next()
  }

  // ── Auth routes — redirect logged-in users to lobby ─────────────────────
  if (AUTH_ROUTES.includes(pathname) && user) {
    return NextResponse.redirect(new URL('/lobby', req.url))
  }

  return NextResponse.next()
}

export const config  = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|designs).*)'],
}