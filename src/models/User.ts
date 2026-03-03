import mongoose, { Schema } from 'mongoose';
import { IUser } from '../types';

const UserSchema: Schema = new Schema({
  // Auth fields
  email: { type: String, required: true, unique: true },
  password: { type: String }, // Null for Google-only users
  authProvider: { 
    type: String, 
    enum: ['google', 'email', 'both'], 
    required: true,
    default: 'email'
  },
  
  // Email verification
  isEmailVerified: { type: Boolean, default: false },
  otp: { type: String },
  otpExpiry: { type: Date },
  
  // Google OAuth fields
  googleId: { type: String, unique: true, sparse: true },
  
  // Profile fields
  name: { type: String, required: true },
  picture: { type: String },
  isActive: { type: Boolean, default: true },
  
  // Activity tracking
  heatMap: [{
    date: { type: String, required: true },
    value: { type: Number, required: true, default: 0 },
  }],
  quiz: [{
    name: { type: String, required: true },
    totalScore: { type: Number, required: true },
    obtainedScore: { type: Number, required: true },
    date: { type: String, required: true },
  }],
  
  // Onboarding tracking
  hasSeenOnboarding: { type: Boolean, default: false },
  
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model<IUser>('User', UserSchema);
