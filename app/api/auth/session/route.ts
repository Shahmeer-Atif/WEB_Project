import { NextRequest, NextResponse } from 'next/server'
import { getAuthFromRequest, refreshAuthCookie } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const auth = await getAuthFromRequest(req)
  if (!auth) return NextResponse.json({ user: null }, { status: 401 })

  // Refresh cookie on every session check — sliding 30-min window
  const response = NextResponse.json({ user: auth })
  await refreshAuthCookie(response, auth)
  return response
}