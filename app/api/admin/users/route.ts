import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import User from '@/models/User'
import { getAuthFromRequest } from '@/lib/auth'

// ── GET /api/admin/users — list all users ───────────────────────────────────
export async function GET(req: NextRequest) {
  const auth = getAuthFromRequest(req)

  // Double-check role even though middleware already guards this route
  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }

  try {
    await connectDB()

    const { searchParams } = new URL(req.url)
    const filter = searchParams.get('filter') // 'all' | 'active' | 'suspended'
    const search = searchParams.get('search') // username or email search

    let query: any = {}

    if (filter === 'active') query.isActive = true
    if (filter === 'suspended') query.isActive = false

    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ]
    }

    const users = await User.find(query)
      .select('-passwordHash')
      .sort({ createdAt: -1 })

    return NextResponse.json({ users })
  } catch (error) {
    console.error('[ADMIN GET USERS ERROR]', error)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}

// ── PATCH /api/admin/users — update a user's role or active status ──────────
export async function PATCH(req: NextRequest) {
  const auth = getAuthFromRequest(req)

  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { userId, role, isActive } = body

    if (!userId) {
      return NextResponse.json({ message: 'userId is required' }, { status: 400 })
    }

    // Validate role if provided
    if (role !== undefined && !['admin', 'user'].includes(role)) {
      return NextResponse.json({ message: 'Invalid role' }, { status: 400 })
    }

    // Prevent admin from deactivating their own account
    if (userId === auth.userId && isActive === false) {
      return NextResponse.json(
        { message: 'You cannot deactivate your own account' },
        { status: 400 }
      )
    }

    const updates: any = {}
    if (role !== undefined) updates.role = role
    if (isActive !== undefined) updates.isActive = isActive

    const user = await User.findByIdAndUpdate(userId, updates, { new: true }).select(
      '-passwordHash'
    )

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({ message: 'User updated', user })
  } catch (error) {
    console.error('[ADMIN PATCH USER ERROR]', error)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}