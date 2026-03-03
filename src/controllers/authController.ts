import { Request, Response } from 'express';
import * as authService from '../services/authService';
import { sendSuccess, sendUnauthorized } from '../utils/apiResponse';
import { asyncHandler } from '../middleware/errorHandler';
import { GoogleSignInBody, ValidateTokenBody } from '../types';
import logger from '../utils/logger';

// ============================================================================
// Request Body Types
// ============================================================================

interface RegisterBody {
  name: string;
  email: string;
  password: string;
}

interface LoginBody {
  email: string;
  password: string;
}

interface VerifyOtpBody {
  email: string;
  otp: string;
}

interface ResendOtpBody {
  email: string;
}

// ============================================================================
// Google OAuth
// ============================================================================

export const googleSignIn = asyncHandler(
  async (req: Request<object, object, GoogleSignInBody>, res: Response): Promise<void> => {
    const { token } = req.body;
    logger.debug('Google sign-in attempt');

    const result = await authService.googleSignIn(token);
    sendSuccess(res, result, 'Login successful');
  }
);

// ============================================================================
// Email/Password Authentication
// ============================================================================

export const register = asyncHandler(
  async (req: Request<object, object, RegisterBody>, res: Response): Promise<void> => {
    const { name, email, password } = req.body;
    logger.debug(`Registration attempt for: ${email}`);

    const result = await authService.registerUser({ name, email, password });
    sendSuccess(res, result, result.message);
  }
);

export const login = asyncHandler(
  async (req: Request<object, object, LoginBody>, res: Response): Promise<void> => {
    const { email, password } = req.body;
    logger.debug(`Login attempt for: ${email}`);

    const result = await authService.loginWithEmail(email, password);
    sendSuccess(res, result, 'Login successful');
  }
);

export const verifyOtp = asyncHandler(
  async (req: Request<object, object, VerifyOtpBody>, res: Response): Promise<void> => {
    const { email, otp } = req.body;
    logger.debug(`OTP verification for: ${email}`);

    const result = await authService.verifyOtp(email, otp);
    sendSuccess(res, result, 'Email verified successfully');
  }
);

export const resendOtp = asyncHandler(
  async (req: Request<object, object, ResendOtpBody>, res: Response): Promise<void> => {
    const { email } = req.body;
    logger.debug(`Resend OTP for: ${email}`);

    const result = await authService.resendOtp(email);
    sendSuccess(res, result, result.message);
  }
);

// ============================================================================
// Token Validation & Refresh
// ============================================================================

export const validateToken = asyncHandler(
  async (req: Request<object, object, ValidateTokenBody>, res: Response): Promise<void> => {
    const { token } = req.body;
    logger.debug('Token validation request');

    if (!token) {
      sendUnauthorized(res, 'No token provided');
      return;
    }

    const decoded = authService.verifyJwtToken(token);
    sendSuccess(res, { valid: true, user: decoded });
  }
);

interface RefreshTokenBody {
  refreshToken: string;
}

/**
 * Refresh access token using refresh token
 * Implements token rotation for security
 */
export const refreshToken = asyncHandler(
  async (req: Request<object, object, RefreshTokenBody>, res: Response): Promise<void> => {
    const { refreshToken } = req.body;
    logger.debug('Token refresh request');

    if (!refreshToken) {
      sendUnauthorized(res, 'No refresh token provided');
      return;
    }

    const tokens = await authService.refreshAccessToken(refreshToken);
    sendSuccess(res, tokens, 'Token refreshed successfully');
  }
);

/**
 * Logout - revokes the refresh token
 */
export const logout = asyncHandler(
  async (req: Request<object, object, RefreshTokenBody>, res: Response): Promise<void> => {
    const { refreshToken } = req.body;
    logger.debug('Logout request');

    if (refreshToken) {
      await authService.revokeRefreshToken(refreshToken);
    }

    sendSuccess(res, null, 'Logged out successfully');
  }
);

// ============================================================================
// Onboarding
// ============================================================================

export const completeOnboarding = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      sendUnauthorized(res, 'No token provided');
      return;
    }

    const token = authHeader.split(' ')[1];
    const decoded = authService.verifyJwtToken(token);
    
    logger.debug(`Completing onboarding for user: ${decoded.email}`);

    await authService.markOnboardingComplete(decoded.userId);
    sendSuccess(res, { hasSeenOnboarding: true }, 'Onboarding marked as complete');
  }
);
