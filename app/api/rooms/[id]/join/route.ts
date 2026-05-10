import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Room from '@/models/Room'
import { getAuthFromRequest } from '@/lib/auth'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(req)
  if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const password = (body.password || '').trim()

  await connectDB()

  const room = await Room.findOne({ roomId: id })

  if (!room) {
    return NextResponse.json({ roomId: id, roomName: id, isPrivate: false, maxPlayers: 8, rounds: 5 })
  }

  if (room.phase === 'ended') {
    return NextResponse.json({ message: 'This room has already ended' }, { status: 410 })
  }

  const storedPassword = (room.password || '').trim()
  if (storedPassword !== '' && storedPassword !== password) {
    return NextResponse.json({ message: 'Wrong password — try again' }, { status: 403 })
  }

  return NextResponse.json({
    roomId: room.roomId,
    roomName: room.name,
    isPrivate: room.isPrivate,
    maxPlayers: room.maxPlayers,
    rounds: room.rounds,
  })
}