import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import User from '@/models/User'
import Friendship from '@/models/Friendship'
import { getAuthFromRequest } from '@/lib/auth'

// ── GET /api/users/search?q=username ─────────────────────────────────────────
export async function GET(req: NextRequest) {
  const auth = await getAuthFromRequest(req)
  if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  const q = req.nextUrl.searchParams.get('q')?.trim()
  if (!q || q.length < 2) return NextResponse.json({ users: [] })

  await connectDB()

  const users = await User.find({
    username: { $regex: q, $options: 'i' },
    _id: { $ne: auth.userId }, // exclude self
    isActive: true,
  })
    .select('_id username gamesPlayed')
    .limit(8)

  // Get friendship status for each result
  const userIds = users.map(u => u._id.toString())
  const friendships = await Friendship.find({
    $or: [
      { requesterId: auth.userId, receiverId: { $in: userIds } },
      { requesterId: { $in: userIds }, receiverId: auth.userId },
    ],
  })

  const usersWithStatus = users.map(u => {
    const uid = u._id.toString()
    const friendship = friendships.find(
      f => f.requesterId === uid || f.receiverId === uid
    )
    let status: 'none' | 'pending_sent' | 'pending_received' | 'friends' = 'none'
    if (friendship) {
      if (friendship.status === 'accepted') status = 'friends'
      else if (friendship.requesterId === auth.userId) status = 'pending_sent'
      else status = 'pending_received'
    }
    return { ...u.toObject(), status }
  })

  return NextResponse.json({ users: usersWithStatus })
}