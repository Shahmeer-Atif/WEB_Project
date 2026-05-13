import mongoose, { Schema, Document } from 'mongoose'

export interface IPasswordResetToken extends Document {
  userId: string
  token: string
  expiresAt: Date
  used: boolean
}

const PasswordResetTokenSchema = new Schema<IPasswordResetToken>({
  userId:    { type: String, required: true },
  token:     { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true },
  used:      { type: Boolean, default: false },
})

// Auto-delete expired tokens
PasswordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export default mongoose.models.PasswordResetToken || mongoose.model<IPasswordResetToken>('PasswordResetToken', PasswordResetTokenSchema)
