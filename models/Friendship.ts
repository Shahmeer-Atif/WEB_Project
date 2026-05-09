import mongoose, { Schema, Document } from 'mongoose'

export interface IFriendship extends Document {
  requesterId: string
  receiverId: string
  status: 'pending' | 'accepted' | 'rejected'
  createdAt: Date
}

const FriendshipSchema = new Schema<IFriendship>({
  requesterId: { type: String, required: true },
  receiverId:  { type: String, required: true },
  status:      { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
}, { timestamps: true })

// Prevent duplicate requests
FriendshipSchema.index({ requesterId: 1, receiverId: 1 }, { unique: true })

export default mongoose.models.Friendship || mongoose.model<IFriendship>('Friendship', FriendshipSchema)