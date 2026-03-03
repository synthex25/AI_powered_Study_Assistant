import { Request } from 'express';
import { Document } from 'mongoose';
import { JwtPayload } from 'jsonwebtoken';

// User document interface
export interface IHeatMapEntry {
  date: string;
  value: number;
}

export interface IQuizEntry {
  name: string;
  totalScore: number;
  obtainedScore: number;
  date: string;
}

export interface IUser extends Document {
  email: string;
  password?: string;
  authProvider: 'google' | 'email' | 'both';
  isEmailVerified: boolean;
  otp?: string;
  otpExpiry?: Date;
  googleId?: string;
  name: string;
  picture?: string;
  isActive: boolean;
  heatMap: IHeatMapEntry[];
  quiz: IQuizEntry[];
  hasSeenOnboarding: boolean;
  createdAt: Date;
}

// JWT Payload
export interface IJwtPayload extends JwtPayload {
  userId: string;
  email: string;
  name: string;
  userType?: string;
}

// Extended Express Request with user
export interface AuthRequest extends Request {
  user?: IJwtPayload;
}

// Google Token Payload
export interface GoogleTokenPayload {
  sub: string;
  email: string;
  name: string;
  picture: string;
}

// Request body types
export interface GoogleSignInBody {
  token: string;
}

export interface ValidateTokenBody {
  token: string;
}

export interface UpdateHeatMapBody {
  date: string;
}

export interface UpdateQuizBody {
  title: string;
  totalScore: number;
  obtainedScore: number;
  date: string;
}

// ChatSession types
export interface CreateChatSessionBody {
  title?: string;
  documentIds?: string[];
  outputLanguage?: string;
}

export interface UpdateChatSessionBody {
  title?: string;
  outputLanguage?: string;
}

export interface AddMessageBody {
  role: 'user' | 'assistant';
  content: string;
}

export interface TranslateTextBody {
  text: string;
  targetLanguage: string;
  sourceLanguage?: string;
}
