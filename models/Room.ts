import mongoose, { Schema, Document } from 'mongoose'

export interface IRoom extends Document {
  roomId: string
  name: string
  hostId: string
  maxPlayers: number
  rounds: number
  drawTime: number
  isPrivate: boolean
  phase: 'waiting' | 'playing' | 'ended'
  playerCount: number
  createdAt: Date
}

const RoomSchema = new Schema<IRoom>({
  roomId:      { type: String, required: true, unique: true },
  name:        { type: String, default: 'Quick Room' },
  hostId:      { type: String, required: true },
  maxPlayers:  { type: Number, default: 8 },
  rounds:      { type: Number, default: 5 },
  drawTime:    { type: Number, default: 60 },
  isPrivate:   { type: Boolean, default: false },
  phase:       { type: String, enum: ['waiting', 'playing', 'ended'], default: 'waiting' },
  playerCount: { type: Number, default: 0 },
}, { timestamps: true })

export default mongoose.models.Room || mongoose.model<IRoom>('Room', RoomSchema)