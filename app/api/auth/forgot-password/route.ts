import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import User from '@/models/User'
import PasswordResetToken from '@/models/PasswordResetToken'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  const { email } = await req.json()

  if (!email) {
    return NextResponse.json({ message: 'Email required' }, { status: 400 })
  }

  await connectDB()

  const user = await User.findOne({ email: email.toLowerCase().trim() })

  // Always return success — don't reveal if email exists
  if (!user) {
    return NextResponse.json({ message: 'If that email exists, a reset link has been sent.' })
  }

  // Delete any existing unused tokens for this user
  await PasswordResetToken.deleteMany({ userId: user._id.toString() })

  // Generate secure random token
  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

  await PasswordResetToken.create({
    userId: user._id.toString(),
    token,
    expiresAt,
    used: false,
  })

  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://web-project-seven-orpin.vercel.app'}/reset-password?token=${token}`

  // Send email via Resend
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'inkblot <onboarding@resend.dev>',
        to: [user.email],
        subject: 'Reset your inkblot password ✏️',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #FBF6EC; border-radius: 16px; overflow: hidden;">
            <div style="background: #312E81; padding: 28px 32px; text-align: center;">
              <div style="display: inline-block; width: 48px; height: 48px; background: #FBF6EC; border-radius: 12px; line-height: 48px; font-size: 24px; font-weight: 700; color: #312E81; transform: rotate(-6deg);">i</div>
              <h1 style="color: #FBF6EC; font-size: 24px; margin: 12px 0 4px;">inkblot</h1>
              <p style="color: rgba(251,246,236,0.7); margin: 0; font-size: 13px;">draw • guess • repeat</p>
            </div>
            <div style="padding: 32px;">
              <h2 style="color: #1B1830; font-size: 22px; margin: 0 0 12px;">Reset your password</h2>
              <p style="color: #5A5275; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
                Hey <strong>@${user.username}</strong>! Someone requested a password reset for your inkblot account. Click the button below to set a new password.
              </p>
              <a href="${resetUrl}" style="display: block; background: #312E81; color: #FBF6EC; text-decoration: none; text-align: center; padding: 14px 24px; border-radius: 12px; font-size: 16px; font-weight: 600; margin-bottom: 20px;">
                ✏️ Reset my password
              </a>
              <p style="color: #5A5275; font-size: 13px; line-height: 1.6; margin: 0;">
                This link expires in <strong>1 hour</strong>. If you didn't request this, just ignore this email — your password won't change.
              </p>
              <hr style="border: none; border-top: 1px solid rgba(27,24,48,0.1); margin: 20px 0;" />
              <p style="color: rgba(90,82,117,0.6); font-size: 11px; margin: 0;">
                © 2026 inkblot studios · If the button doesn't work, copy this link: ${resetUrl}
              </p>
            </div>
          </div>
        `,
      }),
    })

    if (!res.ok) {
      console.error('[RESET EMAIL ERROR]', await res.text())
    }
  } catch (err) {
    console.error('[RESET EMAIL ERROR]', err)
  }

  return NextResponse.json({ message: 'If that email exists, a reset link has been sent.' })
}