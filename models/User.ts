import mongoose, { Document, Schema } from 'mongoose'

export interface IUser extends Document {
  username: string
  email: string
  passwordHash: string
  role: 'admin' | 'user'
  isActive: boolean
  gamesPlayed: number
  totalScore: number
  createdAt: Date
  lastSeen: Date
}

const UserSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      minlength: [2, 'Username must be at least 2 characters'],
      maxlength: [16, 'Username cannot exceed 16 characters'],
      match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers and underscores'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    passwordHash: {
      type: String,
      required: true,
      // Never select passwordHash by default — must be explicitly requested
      select: false,
    },
    role: {
      type: String,
      enum: ['admin', 'user'],
      default: 'user',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    gamesPlayed: {
      type: Number,
      default: 0,
    },
    totalScore: {
      type: Number,
      default: 0,
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true, // adds createdAt + updatedAt automatically
  }
)

// Prevent model re-compilation during Next.js hot reload
export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema)