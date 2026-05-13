import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import WordOfDay from '@/models/WordOfDay'
import { getAuthFromRequest } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const auth = await getAuthFromRequest(req)
  if (!auth || auth.role !== 'admin') return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  await connectDB()
  const words = await WordOfDay.find().sort({ date: -1 }).limit(7)
  return NextResponse.json({ words })
}

export async function POST(req: NextRequest) {
  const auth = await getAuthFromRequest(req)
  if (!auth || auth.role !== 'admin') return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  const { word, hint, bonusPoints, date } = await req.json()
  if (!word || !date) return NextResponse.json({ message: 'word and date required' }, { status: 400 })
  await connectDB()
  const wod = await WordOfDay.findOneAndUpdate(
    { date },
    { word: word.toLowerCase().trim(), hint: hint || '', bonusPoints: bonusPoints || 500, date },
    { upsert: true, new: true }
  )
  return NextResponse.json({ wod }, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const auth = await getAuthFromRequest(req)
  if (!auth || auth.role !== 'admin') return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  const { date } = await req.json()
  await connectDB()
  await WordOfDay.findOneAndDelete({ date })
  return NextResponse.json({ message: 'Deleted' })
}