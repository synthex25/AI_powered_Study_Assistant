import mongoose, { Document, Schema } from 'mongoose';

// ============================================================================
// Source Interface & Schema
// ============================================================================

export interface ISource extends Document {
  workspaceId: mongoose.Types.ObjectId;
  type: 'pdf' | 'text' | 'url';
  name: string;
  
  // For S3 stored files (PDF/Text)
  s3Key?: string;
  s3Bucket?: string;
  fileSize?: number;
  
  // For URL sources
  sourceUrl?: string;
  
  // Preview of extracted content
  extractedTextPreview?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

const SourceSchema = new Schema<ISource>(
  {
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['pdf', 'text', 'url'],
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    s3Key: {
      type: String,
    },
    s3Bucket: {
      type: String,
    },
    fileSize: {
      type: Number,
    },
    sourceUrl: {
      type: String,
    },
    extractedTextPreview: {
      type: String,
      maxlength: 1000,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient querying
SourceSchema.index({ workspaceId: 1, createdAt: -1 });

export const Source = mongoose.model<ISource>('Source', SourceSchema);
export default Source;
