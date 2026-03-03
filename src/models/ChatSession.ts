import mongoose, { Schema, Document, Types } from 'mongoose';

// ============================================================================
// Types
// ============================================================================

export interface IChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface IChatSession extends Document {
  userId: Types.ObjectId;
  title: string;
  documentIds: string[];
  messages: IChatMessage[];
  outputLanguage: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Schema
// ============================================================================

const ChatMessageSchema = new Schema<IChatMessage>({
  role: { 
    type: String, 
    enum: ['user', 'assistant'], 
    required: true 
  },
  content: { 
    type: String, 
    required: true 
  },
  timestamp: { 
    type: Date, 
    default: Date.now 
  },
}, { _id: false });

const ChatSessionSchema = new Schema<IChatSession>({
  userId: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true 
  },
  title: { 
    type: String, 
    default: 'New Chat',
    maxlength: 100
  },
  documentIds: [{ 
    type: String 
  }],
  messages: [ChatMessageSchema],
  outputLanguage: { 
    type: String, 
    default: 'en',
    maxlength: 10
  },
}, {
  timestamps: true,
});

// Index for efficient queries
ChatSessionSchema.index({ userId: 1, updatedAt: -1 });

export default mongoose.model<IChatSession>('ChatSession', ChatSessionSchema);
