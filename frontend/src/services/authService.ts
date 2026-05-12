import api from '../config/axios';
import axios from 'axios';
import type { User } from '../types';

// ============================================================================
// Types
// ============================================================================

// Backend wraps all responses in {success: true, data: {...}} format
interface ApiSuccessResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

// The actual auth data inside the response
interface AuthData {
  accessToken: string;
  refreshToken: string;
  user: User;
}

// Auth response from backend (wrapped)
type AuthResponse = ApiSuccessResponse<AuthData>;

interface RefreshData {
  accessToken: string;
  refreshToken: string;
}

type RefreshResponse = ApiSuccessResponse<RefreshData>;

interface MessageData {
  message: string;
}

type MessageResponse = ApiSuccessResponse<MessageData>;

interface ValidateTokenData {
  valid: boolean;
  user?: User;
}

type ValidateTokenResponse = ApiSuccessResponse<ValidateTokenData>;

interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

interface LoginInput {
  email: string;
  password: string;
}

interface VerifyOtpInput {
  email: string;
  otp: string;
}

// ============================================================================
// Authentication Service
// ============================================================================

/**
 * Authentication service for API calls
 */
export const authService = {
  /**
   * Login with Google OAuth credential
   */
  googleLogin: async (credential: string): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/google', { 
      token: credential 
    });
    return response.data;
  },

  /**
   * Register with email and password
   */
  register: async (input: RegisterInput): Promise<MessageResponse> => {
    const response = await api.post<MessageResponse>('/auth/register', input);
    return response.data;
  },

  /**
   * Login with email and password
   */
  login: async (input: LoginInput): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/login', input);
    return response.data;
  },

  /**
   * Verify OTP code
   */
  verifyOtp: async (input: VerifyOtpInput): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/verify-otp', input);
    return response.data;
  },

  /**
   * Resend OTP code
   */
  resendOtp: async (email: string): Promise<MessageResponse> => {
    const response = await api.post<MessageResponse>('/auth/resend-otp', { email });
    return response.data;
  },

  /**
   * Validate existing JWT token
   */
  validateToken: async (token: string): Promise<ValidateTokenResponse> => {
    const response = await api.post<ValidateTokenResponse>('/auth/validate-token', { 
      token 
    });
    return response.data;
  },

  /**
   * Refresh access token using refresh token
   * Uses raw axios to avoid interceptor loops
   */
   refreshToken: async (refreshToken: string): Promise<RefreshResponse> => {
     const baseUrl =
       (import.meta.env.VITE_API_URL || import.meta.env.VITE_NODE_APP) + '/api';
    const response = await axios.post<RefreshResponse>(
      `${baseUrl}/auth/refresh-token`,
      { refreshToken }
    );
    return response.data;
  },

  /**
   * Logout - revokes refresh token
   */
  logout: async (refreshToken: string): Promise<void> => {
    try {
      await api.post('/auth/logout', { refreshToken });
    } catch {
      // Ignore errors on logout - token may already be invalid
    }
  },

  /**
   * Mark onboarding as complete for the current user
   */
  completeOnboarding: async (): Promise<{ hasSeenOnboarding: boolean }> => {
    const response = await api.post<{ hasSeenOnboarding: boolean }>('/auth/complete-onboarding');
    return response.data;
  },
};

export type { AuthResponse, RefreshResponse };
