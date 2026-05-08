import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import User from '@/models/User'
import { verifyPassword, signToken, setAuthCookie } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, password } = body

    // ── Server-side validation ──────────────────────────────────────────────
    const errors: Record<string, string> = {}

    if (!email || typeof email !== 'string') {
      errors.email = 'Email is required'
    } else if (!/^\S+@\S+\.\S+$/.test(email)) {
      errors.email = 'Please enter a valid email'
    }

    if (!password || typeof password !== 'string') {
      errors.password = 'Password is required'
    }

    if (Object.keys(errors).length > 0) {
      return NextResponse.json({ errors }, { status: 400 })
    }

    await connectDB()

    // ── Find user — explicitly select passwordHash (hidden by default) ──────
    const user = await User.findOne({
      email: email.toLowerCase().trim(),
    }).select('+passwordHash')

    // ── Vague error message to prevent user enumeration attacks ─────────────
    const INVALID_MSG = 'Invalid email or password'

    if (!user) {
      return NextResponse.json({ message: INVALID_MSG }, { status: 401 })
    }

    // ── Check account is active ─────────────────────────────────────────────
    if (!user.isActive) {
      return NextResponse.json(
        { message: 'Your account has been suspended. Contact support.' },
        { status: 403 }
      )
    }

    // ── Verify password using hash comparison (never string equality) ───────
    const passwordValid = await verifyPassword(password, user.passwordHash)
    if (!passwordValid) {
      return NextResponse.json({ message: INVALID_MSG }, { status: 401 })
    }

    // ── Update lastSeen ─────────────────────────────────────────────────────
    await User.findByIdAndUpdate(user._id, { lastSeen: new Date() })

    // ── Sign JWT and attach to response as httpOnly cookie ──────────────────
    const token = signToken({
      userId: user._id.toString(),
      username: user.username,
      role: user.role,
    })

    const response = NextResponse.json({
      message: 'Logged in successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    })

    setAuthCookie(response, token)
    return response

  } catch (error) {
    console.error('[LOGIN ERROR]', error)
    return NextResponse.json(
      { message: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}