import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Room from '@/models/Room'
import { getAuthFromRequest } from '@/lib/auth'
import { nanoid } from 'nanoid'
import bcrypt from 'bcryptjs'

// ── GET /api/rooms — find an open room for quick play ─────────────────────────
export async function GET(req: NextRequest) {
  const auth = await getAuthFromRequest(req)
  if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  await connectDB()

  // Find a public waiting room with space
  const room = await Room.findOne({
    isPrivate: false,
    phase: 'waiting',
    playerCount: { $lt: 8 },
  }).sort({ playerCount: -1 }) // prefer fuller rooms

  if (room) {
    return NextResponse.json({ roomId: room.roomId, existing: true })
  }

  // No open room — create one
  const roomId = 'quick-' + nanoid(6)
  await Room.create({
    roomId,
    name: 'Quick Play',
    hostId: auth.userId,
    maxPlayers: 8,
    rounds: 5,
    drawTime: 60,
    isPrivate: false,
    phase: 'waiting',
    playerCount: 0,
  })

  return NextResponse.json({ roomId, existing: false })
}

// ── POST /api/rooms — create a custom room ────────────────────────────────────
export async function POST(req: NextRequest) {
  const auth = await getAuthFromRequest(req)
  if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { name, maxPlayers, rounds, drawTime, isPrivate, password } = body

  await connectDB()

  let hashedPassword = ''
  if (isPrivate && password) {
    hashedPassword = await bcrypt.hash(password, 10)
  }

  const roomId = 'room-' + nanoid(6)
  await Room.create({
    roomId,
    name: name || 'Custom Room',
    hostId: auth.userId,
    maxPlayers: maxPlayers || 8,
    rounds: rounds || 5,
    drawTime: drawTime || 60,
    isPrivate: isPrivate || false,
    password: hashedPassword,
    phase: 'waiting',
    playerCount: 0,
  })

  return NextResponse.json({ roomId }, { status: 201 })
}