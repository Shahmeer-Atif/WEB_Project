import mongoose, { Schema, Document } from 'mongoose'

export interface IInvite extends Document {
  senderId: string
  senderUsername: string
  receiverId: string
  roomId: string
  roomName: string
  status: 'pending' | 'accepted' | 'declined'
  expiresAt: Date
  createdAt: Date
}

const InviteSchema = new Schema<IInvite>({
  senderId:        { type: String, required: true },
  senderUsername:  { type: String, required: true },
  receiverId:      { type: String, required: true },
  roomId:          { type: String, required: true },
  roomName:        { type: String, default: 'a room' },
  status:          { type: String, enum: ['pending', 'accepted', 'declined'], default: 'pending' },
  expiresAt:       { type: Date, default: () => new Date(Date.now() + 10 * 60 * 1000) }, // 10 min
}, { timestamps: true })

// Auto-delete expired invites
InviteSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export default mongoose.models.Invite || mongoose.model<IInvite>('Invite', InviteSchema)