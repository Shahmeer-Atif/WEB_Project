import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Friendship from '@/models/Friendship'
import User from '@/models/User'
import { getAuthFromRequest } from '@/lib/auth'

// ── GET /api/friends — list accepted friends + pending requests ───────────────
export async function GET(req: NextRequest) {
  const auth = await getAuthFromRequest(req)
  if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  await connectDB()

  // All friendships involving this user
  const friendships = await Friendship.find({
    $or: [{ requesterId: auth.userId }, { receiverId: auth.userId }],
  })

  const friendIds: string[] = []
  const pendingSentIds: string[] = []
  const pendingReceivedIds: string[] = []

  friendships.forEach(f => {
    if (f.status === 'accepted') {
      const otherId = f.requesterId === auth.userId ? f.receiverId : f.requesterId
      friendIds.push(otherId)
    } else if (f.status === 'pending') {
      if (f.requesterId === auth.userId) pendingSentIds.push(f.receiverId)
      else pendingReceivedIds.push(f.requesterId)
    }
  })

  // Fetch user details for each group
  const [friends, pendingSent, pendingReceived] = await Promise.all([
    User.find({ _id: { $in: friendIds } }).select('_id username gamesPlayed lastSeen'),
    User.find({ _id: { $in: pendingSentIds } }).select('_id username'),
    User.find({ _id: { $in: pendingReceivedIds } }).select('_id username'),
  ])

  // Attach friendship id to pending received so client can accept/reject
  const pendingReceivedWithId = pendingReceivedIds.map(userId => {
    const user = pendingReceived.find(u => u._id.toString() === userId)
    const friendship = friendships.find(f => f.requesterId === userId && f.receiverId === auth.userId)
    return { ...user?.toObject(), friendshipId: friendship?._id }
  }).filter(Boolean)

  return NextResponse.json({ friends, pendingSent, pendingReceived: pendingReceivedWithId })
}

// ── POST /api/friends — send a friend request ─────────────────────────────────
export async function POST(req: NextRequest) {
  const auth = await getAuthFromRequest(req)
  if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  const { receiverId } = await req.json()
  if (!receiverId) return NextResponse.json({ message: 'receiverId required' }, { status: 400 })
  if (receiverId === auth.userId) return NextResponse.json({ message: "You can't add yourself" }, { status: 400 })

  await connectDB()

  // Check if request already exists either way
  const existing = await Friendship.findOne({
    $or: [
      { requesterId: auth.userId, receiverId },
      { requesterId: receiverId, receiverId: auth.userId },
    ],
  })

  if (existing) {
    if (existing.status === 'accepted') return NextResponse.json({ message: 'Already friends' }, { status: 409 })
    if (existing.status === 'pending') return NextResponse.json({ message: 'Request already sent' }, { status: 409 })
  }

  // Check receiver exists
  const receiver = await User.findById(receiverId).select('username')
  if (!receiver) return NextResponse.json({ message: 'User not found' }, { status: 404 })

  await Friendship.create({ requesterId: auth.userId, receiverId })

  return NextResponse.json({ message: `Friend request sent to @${receiver.username}` }, { status: 201 })
}