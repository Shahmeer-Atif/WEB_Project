import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import WordOfDay from '@/models/WordOfDay'

// Public GET - today's word of the day
export async function GET() {
  await connectDB()
  const today = new Date().toISOString().slice(0, 10)
  const wod = await WordOfDay.findOne({ date: today })
  if (!wod) return NextResponse.json({ word: 'PARADOX', hint: 'A statement that contradicts itself', bonusPoints: 500 })
  return NextResponse.json({ word: wod.word.toUpperCase(), hint: wod.hint, bonusPoints: wod.bonusPoints, date: wod.date })
}