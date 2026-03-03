import jwt, { SignOptions } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { OAuth2Client, TokenPayload } from 'google-auth-library';
import config from '../config';
import User from '../models/User';
import RefreshToken from '../models/RefreshToken';
import { IUser } from '../types';
import { AuthenticationError, ValidationError } from '../errors/AppError';
import logger from '../utils/logger';
import { generateOtp, sendOtpEmail } from './emailService';

const client = new OAuth2Client(config.googleClientId);

// Token expiry duration parsing
const parseExpiry = (expiry: string): number => {
  const match = expiry.match(/^(\d+)(m|h|d)$/);
  if (!match) return 7 * 24 * 60 * 60 * 1000; // Default 7 days
  const value = parseInt(match[1]);
  const unit = match[2];
  switch (unit) {
    case 'm': return value * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * 24 * 60 * 60 * 1000;
    default: return 7 * 24 * 60 * 60 * 1000;
  }
};

// ============================================================================
// Types
// ============================================================================

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: IUser;
}

export interface JwtPayload {
  userId: string;
  email: string;
  name: string;
  userType: string;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

// ============================================================================
// Password Utilities
// ============================================================================

export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
};

export const verifyPassword = async (
  password: string,
  hashedPassword: string
): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword);
};

// ============================================================================
// JWT Utilities
// ============================================================================

/**
 * Generate access token (short-lived)
 */
export const generateAccessToken = (user: IUser): string => {
  const payload = {
    userId: user._id,
    email: user.email,
    name: user.name,
    userType: 'user',
  };
  
  // expiresIn accepts string like '15m' or number in seconds
  // Cast needed for @types/jsonwebtoken v9 which uses branded StringValue type
  return jwt.sign(payload, config.jwtSecret, { 
    expiresIn: config.jwtAccessExpiresIn 
  } as SignOptions);
};

/**
 * @deprecated Use generateAccessToken instead
 */
export const generateJwtToken = generateAccessToken;

/**
 * Verify access token
 */
export const verifyJwtToken = (token: string): JwtPayload => {
  try {
    return jwt.verify(token, config.jwtSecret) as JwtPayload;
  } catch (error) {
    throw new AuthenticationError('Invalid or expired token');
  }
};

// ============================================================================
// Refresh Token Utilities
// ============================================================================

/**
 * Generate a cryptographically secure refresh token and store it
 */
export const generateRefreshToken = async (user: IUser): Promise<string> => {
  // Generate secure random token
  const rawToken = crypto.randomBytes(64).toString('hex');
  
  // Hash the token for storage
  const hashedToken = await bcrypt.hash(rawToken, 10);
  
  // Calculate expiry
  const expiresAt = new Date(Date.now() + parseExpiry(config.jwtRefreshExpiresIn));
  
  // Store hashed token in database
  await RefreshToken.create({
    token: hashedToken,
    userId: user._id,
    expiresAt,
  });
  
  logger.debug(`Refresh token created for user: ${user.email}`);
  
  // Return raw token to client
  return rawToken;
};

/**
 * Generate both access and refresh tokens
 */
export const generateTokenPair = async (user: IUser): Promise<TokenPair> => {
  const accessToken = generateAccessToken(user);
  const refreshToken = await generateRefreshToken(user);
  
  return { accessToken, refreshToken };
};

/**
 * Refresh access token using a refresh token
 * Implements token rotation for security
 */
export const refreshAccessToken = async (rawRefreshToken: string): Promise<TokenPair> => {
  // Find all non-revoked, non-expired tokens
  const tokens = await RefreshToken.find({
    isRevoked: false,
    expiresAt: { $gt: new Date() },
  });
  
  // Find the matching token by comparing hashes
  let matchedToken = null;
  for (const storedToken of tokens) {
    const isMatch = await bcrypt.compare(rawRefreshToken, storedToken.token);
    if (isMatch) {
      matchedToken = storedToken;
      break;
    }
  }
  
  if (!matchedToken) {
    throw new AuthenticationError('Invalid or expired refresh token');
  }
  
  // Get the user
  const user = await User.findById(matchedToken.userId);
  if (!user) {
    throw new AuthenticationError('User not found');
  }
  
  // Token rotation: revoke old token
  matchedToken.isRevoked = true;
  await matchedToken.save();
  
  // Generate new token pair
  const newTokenPair = await generateTokenPair(user);
  logger.info(`Token refreshed for user: ${user.email}`);
  
  return newTokenPair;
};

/**
 * Revoke a specific refresh token
 */
export const revokeRefreshToken = async (rawRefreshToken: string): Promise<void> => {
  const tokens = await RefreshToken.find({
    isRevoked: false,
  });
  
  for (const storedToken of tokens) {
    const isMatch = await bcrypt.compare(rawRefreshToken, storedToken.token);
    if (isMatch) {
      storedToken.isRevoked = true;
      await storedToken.save();
      logger.info(`Refresh token revoked`);
      return;
    }
  }
};

/**
 * Revoke all refresh tokens for a user (logout everywhere)
 */
export const revokeAllUserTokens = async (userId: string): Promise<void> => {
  await RefreshToken.updateMany(
    { userId, isRevoked: false },
    { isRevoked: true }
  );
  logger.info(`All refresh tokens revoked for user: ${userId}`);
};

// ============================================================================
// Google OAuth
// ============================================================================

export const verifyGoogleToken = async (idToken: string): Promise<TokenPayload> => {
  try {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: config.googleClientId,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      throw new AuthenticationError('Invalid Google token payload');
    }

    return payload;
  } catch (error) {
    logger.error('Google token verification failed:', error);
    throw new AuthenticationError('Invalid Google token');
  }
};

export const googleSignIn = async (idToken: string): Promise<AuthResult> => {
  const googlePayload = await verifyGoogleToken(idToken);
  const { sub, email, name, picture } = googlePayload;

  // Check if user exists with this email
  let user = await User.findOne({ email });
  
  if (user) {
    // User exists - check auth provider
    if (user.authProvider === 'email') {
      // User registered with email, link Google account
      user.googleId = sub;
      user.authProvider = 'both';
      user.picture = picture;
      await user.save();
      logger.info(`Linked Google account for user: ${email}`);
    } else if (!user.googleId) {
      // Update googleId if not set
      user.googleId = sub;
      await user.save();
    }
  } else {
    // Create new Google-only user
    user = await User.create({
      googleId: sub,
      email,
      name,
      picture,
      authProvider: 'google',
      isEmailVerified: true, // Google emails are verified
    });
    logger.info(`New Google user created: ${email}`);
  }

  const tokens = await generateTokenPair(user);
  logger.info(`User logged in via Google: ${email}`);

  return { ...tokens, user };
};

// ============================================================================
// Email/Password Authentication
// ============================================================================

import { validatePassword } from '../utils/passwordValidation';

export const registerUser = async (input: RegisterInput): Promise<{ message: string }> => {
  const { name, email, password } = input;
  console.log("Registering user:", { name, email, password: '***' });

  // Validate password strength
  const passwordValidation = validatePassword(password);
  if (!passwordValidation.isValid) {
    throw new ValidationError(passwordValidation.errors[0]);
  }

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  
  if (existingUser) {
    if (existingUser.authProvider === 'google') {
      throw new ValidationError('This email is registered with Google. Please use Google Sign-in.');
    }
    if (existingUser.isEmailVerified) {
      throw new ValidationError('An account with this email already exists. Please login.');
    }
    // User exists but not verified - resend OTP
    const otp = generateOtp();
    existingUser.otp = otp;
    existingUser.otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    existingUser.password = await hashPassword(password);
    existingUser.name = name;
    await existingUser.save();
    
    await sendOtpEmail(email, otp, name);
    logger.info(`OTP resent to unverified user: ${email}`);
    
    return { message: 'Verification code sent to your email' };
  }

  // Create new user
  const hashedPassword = await hashPassword(password);
  const otp = generateOtp();
  const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  await User.create({
    name,
    email,
    password: hashedPassword,
    authProvider: 'email',
    isEmailVerified: false,
    otp,
    otpExpiry,
  });

  await sendOtpEmail(email, otp, name);
  logger.info(`New user registered: ${email}`);

  return { message: 'Verification code sent to your email' };
};

export const verifyOtp = async (email: string, otp: string): Promise<AuthResult> => {
  const user = await User.findOne({ email });

  if (!user) {
    throw new ValidationError('User not found');
  }

  if (user.isEmailVerified) {
    throw new ValidationError('Email is already verified');
  }

  if (!user.otp || !user.otpExpiry) {
    throw new ValidationError('No OTP found. Please request a new one.');
  }

  if (new Date() > user.otpExpiry) {
    throw new ValidationError('OTP has expired. Please request a new one.');
  }

  if (user.otp !== otp) {
    throw new ValidationError('Invalid OTP');
  }

  // Verify user
  user.isEmailVerified = true;
  user.otp = undefined;
  user.otpExpiry = undefined;
  await user.save();

  const tokens = await generateTokenPair(user);
  logger.info(`User verified: ${email}`);

  return { ...tokens, user };
};

export const resendOtp = async (email: string): Promise<{ message: string }> => {
  const user = await User.findOne({ email });

  if (!user) {
    throw new ValidationError('User not found');
  }

  if (user.isEmailVerified) {
    throw new ValidationError('Email is already verified');
  }

  const otp = generateOtp();
  user.otp = otp;
  user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
  await user.save();

  await sendOtpEmail(email, otp, user.name);
  logger.info(`OTP resent: ${email}`);

  return { message: 'Verification code sent to your email' };
};

export const loginWithEmail = async (
  email: string,
  password: string
): Promise<AuthResult> => {
  const user = await User.findOne({ email });

  if (!user) {
    throw new AuthenticationError('Invalid email or password');
  }

  // Check auth provider
  if (user.authProvider === 'google') {
    throw new ValidationError('This account uses Google Sign-in. Please login with Google.');
  }

  // Check if email is verified
  if (!user.isEmailVerified) {
    throw new ValidationError('Please verify your email first');
  }

  // Verify password
  if (!user.password) {
    throw new AuthenticationError('Invalid email or password');
  }

  const isValid = await verifyPassword(password, user.password);
  if (!isValid) {
    throw new AuthenticationError('Invalid email or password');
  }

  const tokens = await generateTokenPair(user);
  logger.info(`User logged in via email: ${email}`);

  return { ...tokens, user };
};

// ============================================================================
// Onboarding
// ============================================================================

export const markOnboardingComplete = async (userId: string): Promise<void> => {
  const user = await User.findById(userId);
  
  if (!user) {
    throw new ValidationError('User not found');
  }

  user.hasSeenOnboarding = true;
  await user.save();
  
  logger.info(`Onboarding marked complete for user: ${user.email}`);
};
