import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Room from '@/models/Room'
import { getAuthFromRequest } from '@/lib/auth'
import { nanoid } from 'nanoid'

export async function GET(req: NextRequest) {
  const auth = await getAuthFromRequest(req)
  if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  await connectDB()
  const room = await Room.findOne({ isPrivate: false, password: '', phase: 'waiting', playerCount: { $lt: 8 } }).sort({ playerCount: -1 })
  if (room) return NextResponse.json({ roomId: room.roomId, existing: true, roomName: room.name })
  const roomId = 'quick-' + nanoid(6)
  await Room.create({ roomId, name: 'Quick Play', hostId: auth.userId, maxPlayers: 8, rounds: 5, drawTime: 60, isPrivate: false, password: '', phase: 'waiting', playerCount: 0 })
  return NextResponse.json({ roomId, existing: false, roomName: 'Quick Play' })
}

export async function POST(req: NextRequest) {
  const auth = await getAuthFromRequest(req)
  if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const { name, maxPlayers, rounds, drawTime, isPrivate, password } = body
  await connectDB()
  const roomId = 'room-' + nanoid(6)
  await Room.create({ roomId, name: name || 'Custom Room', hostId: auth.userId, maxPlayers: maxPlayers || 8, rounds: rounds || 5, drawTime: drawTime || 60, isPrivate: !!isPrivate, password: password || '', phase: 'waiting', playerCount: 0 })
  return NextResponse.json({ roomId, roomName: name || 'Custom Room' }, { status: 201 })
}