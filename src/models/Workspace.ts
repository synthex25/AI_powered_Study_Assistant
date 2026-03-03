import mongoose, { Document, Schema } from 'mongoose';

// ============================================================================
// Generated Content Interfaces
// ============================================================================

interface Flashcard {
  front: string;
  back: string;
}

interface Quiz {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation?: string;
}

interface GeneratedContent {
  title?: string;
  summary?: string;
  notes?: string;  // HTML content
  flashcards?: Flashcard[];
  quizzes?: Quiz[];
  keyConcepts?: string[];
  recommendations?: string;
  generatedAt?: Date;
}

// ============================================================================
// Workspace Interface & Schema
// ============================================================================

export interface IWorkspace extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  sources: mongoose.Types.ObjectId[];
  generatedContent?: GeneratedContent;
  isProcessing: boolean;
  language: string;
  lastProcessedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const WorkspaceSchema = new Schema<IWorkspace>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    sources: [{
      type: Schema.Types.ObjectId,
      ref: 'Source',
    }],
    generatedContent: {
      title: String,
      summary: String,
      notes: String,
      flashcards: [{
        front: String,
        back: String,
      }],
      quizzes: [{
        question: String,
        options: [String],
        correctAnswer: String,
        explanation: String,
      }],
      keyConcepts: [String],
      recommendations: String,
      generatedAt: Date,
    },
    isProcessing: {
      type: Boolean,
      default: false,
    },
    language: {
      type: String,
      default: 'en',
    },
    lastProcessedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Index for user's workspaces sorted by update time
WorkspaceSchema.index({ userId: 1, updatedAt: -1 });

// Virtual for source count
WorkspaceSchema.virtual('sourceCount').get(function() {
  return this.sources?.length || 0;
});

export const Workspace = mongoose.model<IWorkspace>('Workspace', WorkspaceSchema);
export default Workspace;
