import { NextRequest, NextResponse } from 'next/server'
import { getAuthFromRequest } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import User from '@/models/User'

export async function GET(req: NextRequest) {
  const auth = await getAuthFromRequest(req)

  if (!auth) {
    return NextResponse.json({ user: null }, { status: 401 })
  }

  try {
    await connectDB()
    const user = await User.findById(auth.userId).select('-passwordHash')

    if (!user || !user.isActive) {
      return NextResponse.json({ user: null }, { status: 401 })
    }

    return NextResponse.json({
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        gamesPlayed: user.gamesPlayed,
        totalScore: user.totalScore,
      },
    })
  } catch (error) {
    console.error('[SESSION ERROR]', error)
    return NextResponse.json({ user: null }, { status: 500 })
  }
}