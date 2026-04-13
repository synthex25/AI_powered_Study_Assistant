/// <reference types="vite/client" />

// User types
export interface User {
  _id: string;
  googleId: string;
  email: string;
  name: string;
  picture: string;
  isActive: boolean;
  heatMap: HeatMapEntry[];
  quiz: QuizEntry[];
  hasSeenOnboarding?: boolean;
  createdAt: string;
}

export interface HeatMapEntry {
  date: string;
  value: number;
}

export interface QuizEntry {
  name: string;
  totalScore: number;
  obtainedScore: number;
  date: string;
}

// Auth state types
export interface UserState {
  user: User | null;
  token: string | null;
  role: string | null;
}

// Redux action payloads
export interface SetUserPayload {
  user: User;
  token: string;
  role?: string;
}

// API response types
export interface AuthResponse {
  token: string;
  user: User;
}

export interface ValidateTokenResponse {
  valid: boolean;
  user?: User;
  message?: string;
}

export interface HeatMapQuizResponse {
  heatMap: HeatMapEntry[];
  quiz: QuizEntry[];
}

// Class/Chat types
export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface ClassState {
  classid: string;
  className: string;
  chatHistory: Message[];
}

// ============================================================================
// Workspace Types
// ============================================================================

export interface Source {
  _id: string;
  workspaceId: string;
  type: 'pdf' | 'text' | 'url';
  name: string;
  s3Key?: string;
  sourceUrl?: string;
  content?: string;  // For text sources
  fileSize?: number;
  extractedTextPreview?: string;
  createdAt: string;
}

export interface Flashcard {
  front: string;
  back: string;
}

export interface Quiz {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation?: string;
}

export interface GeneratedContent {
  title?: string;
  summary?: string;
  notes?: string;
  flashcards?: Flashcard[];
  quizzes?: Quiz[];
  keyConcepts?: string[];
  recommendations?: string;
  youtube_links?: any[]; // TODO: Define specific type
  website_links?: any[]; // TODO: Define specific type
  generatedAt?: string;
}

export interface Workspace {
  _id: string;
  userId: string;
  name: string;
  description?: string;
  sources: Source[];
  generatedContent?: GeneratedContent;
  isProcessing: boolean;
  language: string;
  lastProcessedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Master state types
export interface MasterState {
  isOpen: boolean;
}

// Vite environment variables
interface ImportMetaEnv {
  readonly VITE_NODE_APP: string;
  readonly VITE_FAST_API: string;
  readonly VITE_GOOGLE_CLIENT_ID: string;
}


