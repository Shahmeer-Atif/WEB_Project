import mongoose, { Schema, Document } from 'mongoose'

export interface IWordOfDay extends Document {
  word: string
  hint: string
  bonusPoints: number
  date: string // YYYY-MM-DD
  createdAt: Date
}

const WordOfDaySchema = new Schema<IWordOfDay>({
  word:         { type: String, required: true },
  hint:         { type: String, default: '' },
  bonusPoints:  { type: Number, default: 500 },
  date:         { type: String, required: true, unique: true },
}, { timestamps: true })

export default mongoose.models.WordOfDay || mongoose.model<IWordOfDay>('WordOfDay', WordOfDaySchema)