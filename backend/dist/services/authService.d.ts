import { TokenPayload } from 'google-auth-library';
import { IUser } from '../types';
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
export declare const hashPassword: (password: string) => Promise<string>;
export declare const verifyPassword: (password: string, hashedPassword: string) => Promise<boolean>;
/**
 * Generate access token (short-lived)
 */
export declare const generateAccessToken: (user: IUser) => string;
/**
 * @deprecated Use generateAccessToken instead
 */
export declare const generateJwtToken: (user: IUser) => string;
/**
 * Verify access token
 */
export declare const verifyJwtToken: (token: string) => JwtPayload;
/**
 * Generate a cryptographically secure refresh token and store it
 */
export declare const generateRefreshToken: (user: IUser) => Promise<string>;
/**
 * Generate both access and refresh tokens
 */
export declare const generateTokenPair: (user: IUser) => Promise<TokenPair>;
/**
 * Refresh access token using a refresh token
 * Uses a tokenPrefix index for O(1) lookup before bcrypt comparison
 */
export declare const refreshAccessToken: (rawRefreshToken: string) => Promise<TokenPair>;
/**
 * Revoke a specific refresh token
 */
export declare const revokeRefreshToken: (rawRefreshToken: string) => Promise<void>;
/**
 * Revoke all refresh tokens for a user (logout everywhere)
 */
export declare const revokeAllUserTokens: (userId: string) => Promise<void>;
export declare const verifyGoogleToken: (idToken: string) => Promise<TokenPayload>;
export declare const googleSignIn: (idToken: string) => Promise<AuthResult>;
export declare const registerUser: (input: RegisterInput) => Promise<{
    message: string;
}>;
export declare const verifyOtp: (email: string, otp: string) => Promise<AuthResult>;
export declare const resendOtp: (email: string) => Promise<{
    message: string;
}>;
export declare const loginWithEmail: (email: string, password: string) => Promise<AuthResult>;
export declare const markOnboardingComplete: (userId: string) => Promise<void>;
//# sourceMappingURL=authService.d.ts.map