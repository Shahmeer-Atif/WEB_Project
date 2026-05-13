import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import User from '@/models/User'
import PasswordResetToken from '@/models/PasswordResetToken'
import { hashPassword } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const { token, password } = await req.json()

  if (!token || !password) {
    return NextResponse.json({ message: 'Token and password required' }, { status: 400 })
  }

  if (password.length < 8) {
    return NextResponse.json({ message: 'Password must be at least 8 characters' }, { status: 400 })
  }

  await connectDB()

  const resetToken = await PasswordResetToken.findOne({ token, used: false })

  if (!resetToken) {
    return NextResponse.json({ message: 'Invalid or expired reset link.' }, { status: 400 })
  }

  if (new Date() > resetToken.expiresAt) {
    await PasswordResetToken.deleteOne({ _id: resetToken._id })
    return NextResponse.json({ message: 'This reset link has expired. Please request a new one.' }, { status: 400 })
  }

  // Hash new password and update user
  const passwordHash = await hashPassword(password)
  const user = await User.findByIdAndUpdate(
    resetToken.userId,
    { passwordHash },
    { new: true }
  )

  if (!user) {
    return NextResponse.json({ message: 'User not found.' }, { status: 404 })
  }

  // Mark token as used
  resetToken.used = true
  await resetToken.save()

  return NextResponse.json({ message: 'Password updated! You can now log in.' })
}