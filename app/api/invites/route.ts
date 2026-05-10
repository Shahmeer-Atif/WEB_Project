import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Invite from '@/models/Invite'
import Friendship from '@/models/Friendship'
import User from '@/models/User'
import { getAuthFromRequest } from '@/lib/auth'

// ── GET /api/invites — get my pending invites ─────────────────────────────────
export async function GET(req: NextRequest) {
  const auth = await getAuthFromRequest(req)
  if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  await connectDB()

  const invites = await Invite.find({
    receiverId: auth.userId,
    status: 'pending',
    expiresAt: { $gt: new Date() },
  }).sort({ createdAt: -1 })

  return NextResponse.json({ invites })
}

// ── POST /api/invites — send invite to a friend ───────────────────────────────
export async function POST(req: NextRequest) {
  const auth = await getAuthFromRequest(req)
  if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  const { receiverId, roomId, roomName } = await req.json()

  if (!receiverId || !roomId) {
    return NextResponse.json({ message: 'receiverId and roomId required' }, { status: 400 })
  }

  await connectDB()

  // Must be friends
  const friendship = await Friendship.findOne({
    $or: [
      { requesterId: auth.userId, receiverId, status: 'accepted' },
      { requesterId: receiverId, receiverId: auth.userId, status: 'accepted' },
    ],
  })

  if (!friendship) {
    return NextResponse.json({ message: 'You can only invite friends' }, { status: 403 })
  }

  // Check receiver exists
  const receiver = await User.findById(receiverId).select('username')
  if (!receiver) return NextResponse.json({ message: 'User not found' }, { status: 404 })

  // Check for existing pending invite to same room
  const existing = await Invite.findOne({ senderId: auth.userId, receiverId, roomId, status: 'pending' })
  if (existing) return NextResponse.json({ message: 'Invite already sent' }, { status: 409 })

  await Invite.create({
    senderId: auth.userId,
    senderUsername: auth.username,
    receiverId,
    roomId,
    roomName: roomName || 'a room',
  })

  return NextResponse.json({ message: `Invite sent to @${receiver.username}!` }, { status: 201 })
}

// ── PATCH /api/invites — accept or decline an invite ─────────────────────────
export async function PATCH(req: NextRequest) {
  const auth = await getAuthFromRequest(req)
  if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  const { inviteId, action } = await req.json()

  if (!['accepted', 'declined'].includes(action)) {
    return NextResponse.json({ message: 'action must be accepted or declined' }, { status: 400 })
  }

  await connectDB()

  const invite = await Invite.findById(inviteId)
  if (!invite) return NextResponse.json({ message: 'Invite not found' }, { status: 404 })
  if (invite.receiverId !== auth.userId) return NextResponse.json({ message: 'Forbidden' }, { status: 403 })

  invite.status = action
  await invite.save()

  return NextResponse.json({
    message: action === 'accepted' ? 'Joining room!' : 'Invite declined',
    roomId: action === 'accepted' ? invite.roomId : null,
  })
}