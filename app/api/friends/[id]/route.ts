import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Friendship from '@/models/Friendship'
import { getAuthFromRequest } from '@/lib/auth'

// ── PATCH /api/friends/[id] — accept or reject a friend request ───────────────
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthFromRequest(req)
  if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { action } = await req.json() // 'accept' | 'reject'

  if (!['accept', 'reject'].includes(action)) {
    return NextResponse.json({ message: 'action must be accept or reject' }, { status: 400 })
  }

  await connectDB()

  const friendship = await Friendship.findById(id)
  if (!friendship) return NextResponse.json({ message: 'Request not found' }, { status: 404 })

  // Only the receiver can accept/reject
  if (friendship.receiverId !== auth.userId) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }

  if (friendship.status !== 'pending') {
    return NextResponse.json({ message: 'Request already handled' }, { status: 409 })
  }

  if (action === 'reject') {
    await Friendship.findByIdAndDelete(id)
    return NextResponse.json({ message: 'Request rejected' })
  }

  friendship.status = 'accepted'
  await friendship.save()

  return NextResponse.json({ message: 'Friend request accepted!' })
}

// ── DELETE /api/friends/[id] — remove a friend ────────────────────────────────
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthFromRequest(req)
  if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  await connectDB()

  // id here is the OTHER user's id
  await Friendship.findOneAndDelete({
    $or: [
      { requesterId: auth.userId, receiverId: id },
      { requesterId: id, receiverId: auth.userId },
    ],
    status: 'accepted',
  })

  return NextResponse.json({ message: 'Friend removed' })
}