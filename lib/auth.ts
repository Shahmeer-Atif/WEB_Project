import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

// Re-export JWT functions from jwt.ts (which is Edge-safe for middleware)
export { signToken, verifyToken } from '@/lib/jwt'
export type { JWTPayload } from '@/lib/jwt'
import type { JWTPayload } from '@/lib/jwt'
import { verifyToken } from '@/lib/jwt'

const COOKIE_NAME = 'inkblot_token'
const SALT_ROUNDS = 12

// ─── Password helpers ─────────────────────────────────────────────────────────

export async function hashPassword(plainText: string): Promise<string> {
  return bcrypt.hash(plainText, SALT_ROUNDS)
}

export async function verifyPassword(
  plainText: string,
  hash: string
): Promise<boolean> {
  // bcrypt.compare is timing-safe — never use plain string equality
  return bcrypt.compare(plainText, hash)
}

// ─── Cookie helpers ───────────────────────────────────────────────────────────
// Attach cookies to the NextResponse object — avoids Next.js 15 async issue

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 60 * 60 * 24 * 7, // 7 days in seconds
  path: '/',
}

export function setAuthCookie(response: NextResponse, token: string): void {
  response.cookies.set(COOKIE_NAME, token, COOKIE_OPTIONS)
}

export function clearAuthCookie(response: NextResponse): void {
  response.cookies.set(COOKIE_NAME, '', { ...COOKIE_OPTIONS, maxAge: 0 })
}

// ─── Request auth reader ──────────────────────────────────────────────────────
// Use inside API route handlers

export function getAuthFromRequest(req: NextRequest): JWTPayload | null {
  const token = req.cookies.get(COOKIE_NAME)?.value
  if (!token) return null
  return verifyToken(token)
}

// ─── Server component auth reader ────────────────────────────────────────────
// Use inside async Server Components and page.tsx files

export async function getAuthFromCookies(): Promise<JWTPayload | null> {
  const cookieStore = await cookies() // Next.js 15: cookies() is async
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) return null
  return verifyToken(token)
}