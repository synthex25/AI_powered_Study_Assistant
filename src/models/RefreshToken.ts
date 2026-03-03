import mongoose, { Schema, Document, Types } from 'mongoose';

// ============================================================================
// Interface
// ============================================================================

export interface IRefreshToken extends Document {
  token: string;           // Hashed refresh token
  userId: Types.ObjectId;  // Reference to user
  expiresAt: Date;         // Token expiration
  createdAt: Date;         // For audit/cleanup
  isRevoked: boolean;      // Revocation flag
}

// ============================================================================
// Schema
// ============================================================================

const RefreshTokenSchema: Schema = new Schema({
  token: { 
    type: String, 
    required: true, 
    unique: true,
    index: true 
  },
  userId: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true 
  },
  expiresAt: { 
    type: Date, 
    required: true,
    index: { expires: 0 }  // TTL index - auto-delete expired tokens
  },
  isRevoked: { 
    type: Boolean, 
    default: false 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
});

// ============================================================================
// Indexes
// ============================================================================

// Compound index for efficient lookup of valid tokens
RefreshTokenSchema.index({ token: 1, isRevoked: 1 });

// Index for cleaning up user's tokens
RefreshTokenSchema.index({ userId: 1, isRevoked: 1 });

export default mongoose.model<IRefreshToken>('RefreshToken', RefreshTokenSchema);
