import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import User from '@/models/User'
import { hashPassword, signToken, setAuthCookie } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { username, email, password } = body

    // ── Server-side validation ──────────────────────────────────────────────
    const errors: Record<string, string> = {}

    if (!username || typeof username !== 'string') {
      errors.username = 'Username is required'
    } else if (username.trim().length < 2) {
      errors.username = 'Username must be at least 2 characters'
    } else if (username.trim().length > 16) {
      errors.username = 'Username cannot exceed 16 characters'
    } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      errors.username = 'Only letters, numbers and underscores allowed'
    }

    if (!email || typeof email !== 'string') {
      errors.email = 'Email is required'
    } else if (!/^\S+@\S+\.\S+$/.test(email)) {
      errors.email = 'Please enter a valid email'
    }

    if (!password || typeof password !== 'string') {
      errors.password = 'Password is required'
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters'
    }

    if (Object.keys(errors).length > 0) {
      return NextResponse.json({ errors }, { status: 400 })
    }

    await connectDB()

    // ── Check for duplicates ────────────────────────────────────────────────
    const existingEmail = await User.findOne({ email: email.toLowerCase().trim() })
    if (existingEmail) {
      return NextResponse.json(
        { errors: { email: 'An account with this email already exists' } },
        { status: 409 }
      )
    }

    const existingUsername = await User.findOne({
      username: { $regex: new RegExp(`^${username.trim()}$`, 'i') },
    })
    if (existingUsername) {
      return NextResponse.json(
        { errors: { username: 'This username is already taken' } },
        { status: 409 }
      )
    }

    // ── Hash password and create user ───────────────────────────────────────
    // Plain-text password is NEVER stored — hashed immediately
    const passwordHash = await hashPassword(password)

    const user = await User.create({
      username: username.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      role: 'user', // new users are always 'user' — admin assigned manually
    })

    // ── Sign JWT and set httpOnly cookie ────────────────────────────────────
    const token = await signToken({
      userId: user._id.toString(),
      username: user.username,
      role: user.role,
    })

    const response = NextResponse.json(
      {
        message: 'Account created successfully',
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
        },
      },
      { status: 201 }
    )

    setAuthCookie(response, token)
    return response
  } catch (error: any) {
    console.error('[REGISTER ERROR]', error)
    return NextResponse.json(
      { message: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}