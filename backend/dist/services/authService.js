"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.markOnboardingComplete = exports.loginWithEmail = exports.resendOtp = exports.verifyOtp = exports.registerUser = exports.googleSignIn = exports.verifyGoogleToken = exports.revokeAllUserTokens = exports.revokeRefreshToken = exports.refreshAccessToken = exports.generateTokenPair = exports.generateRefreshToken = exports.verifyJwtToken = exports.generateJwtToken = exports.generateAccessToken = exports.verifyPassword = exports.hashPassword = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = __importDefault(require("crypto"));
const google_auth_library_1 = require("google-auth-library");
const config_1 = __importDefault(require("../config"));
const User_1 = __importDefault(require("../models/User"));
const RefreshToken_1 = __importDefault(require("../models/RefreshToken"));
const AppError_1 = require("../errors/AppError");
const logger_1 = __importDefault(require("../utils/logger"));
const emailService_1 = require("./emailService");
const client = new google_auth_library_1.OAuth2Client(config_1.default.googleClientId);
// Token expiry duration parsing
const parseExpiry = (expiry) => {
    const match = expiry.match(/^(\d+)(m|h|d)$/);
    if (!match)
        return 7 * 24 * 60 * 60 * 1000; // Default 7 days
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
// Password Utilities
// ============================================================================
const hashPassword = async (password) => {
    const salt = await bcryptjs_1.default.genSalt(12);
    return bcryptjs_1.default.hash(password, salt);
};
exports.hashPassword = hashPassword;
const verifyPassword = async (password, hashedPassword) => {
    return bcryptjs_1.default.compare(password, hashedPassword);
};
exports.verifyPassword = verifyPassword;
// ============================================================================
// JWT Utilities
// ============================================================================
/**
 * Generate access token (short-lived)
 */
const generateAccessToken = (user) => {
    const payload = {
        userId: user._id,
        email: user.email,
        name: user.name,
        userType: 'user',
    };
    // expiresIn accepts string like '15m' or number in seconds
    // Cast needed for @types/jsonwebtoken v9 which uses branded StringValue type
    return jsonwebtoken_1.default.sign(payload, config_1.default.jwtSecret, {
        expiresIn: config_1.default.jwtAccessExpiresIn
    });
};
exports.generateAccessToken = generateAccessToken;
/**
 * @deprecated Use generateAccessToken instead
 */
exports.generateJwtToken = exports.generateAccessToken;
/**
 * Verify access token
 */
const verifyJwtToken = (token) => {
    try {
        return jsonwebtoken_1.default.verify(token, config_1.default.jwtSecret);
    }
    catch (error) {
        throw new AppError_1.AuthenticationError('Invalid or expired token');
    }
};
exports.verifyJwtToken = verifyJwtToken;
// ============================================================================
// Refresh Token Utilities
// ============================================================================
/**
 * Generate a cryptographically secure refresh token and store it
 */
const generateRefreshToken = async (user) => {
    // Generate secure random token
    const rawToken = crypto_1.default.randomBytes(64).toString('hex');
    // Hash the token for storage
    const hashedToken = await bcryptjs_1.default.hash(rawToken, 10);
    // Calculate expiry
    const expiresAt = new Date(Date.now() + parseExpiry(config_1.default.jwtRefreshExpiresIn));
    // Store hashed token in database
    await RefreshToken_1.default.create({
        token: hashedToken,
        userId: user._id,
        expiresAt,
    });
    logger_1.default.debug(`Refresh token created for user: ${user.email}`);
    // Return raw token to client
    return rawToken;
};
exports.generateRefreshToken = generateRefreshToken;
/**
 * Generate both access and refresh tokens
 */
const generateTokenPair = async (user) => {
    const accessToken = (0, exports.generateAccessToken)(user);
    const refreshToken = await (0, exports.generateRefreshToken)(user);
    return { accessToken, refreshToken };
};
exports.generateTokenPair = generateTokenPair;
/**
 * Refresh access token using a refresh token
 * Implements token rotation for security
 */
const refreshAccessToken = async (rawRefreshToken) => {
    // Find all non-revoked, non-expired tokens
    const tokens = await RefreshToken_1.default.find({
        isRevoked: false,
        expiresAt: { $gt: new Date() },
    });
    // Find the matching token by comparing hashes
    let matchedToken = null;
    for (const storedToken of tokens) {
        const isMatch = await bcryptjs_1.default.compare(rawRefreshToken, storedToken.token);
        if (isMatch) {
            matchedToken = storedToken;
            break;
        }
    }
    if (!matchedToken) {
        throw new AppError_1.AuthenticationError('Invalid or expired refresh token');
    }
    // Get the user
    const user = await User_1.default.findById(matchedToken.userId);
    if (!user) {
        throw new AppError_1.AuthenticationError('User not found');
    }
    // Token rotation: revoke old token
    matchedToken.isRevoked = true;
    await matchedToken.save();
    // Generate new token pair
    const newTokenPair = await (0, exports.generateTokenPair)(user);
    logger_1.default.info(`Token refreshed for user: ${user.email}`);
    return newTokenPair;
};
exports.refreshAccessToken = refreshAccessToken;
/**
 * Revoke a specific refresh token
 */
const revokeRefreshToken = async (rawRefreshToken) => {
    const tokens = await RefreshToken_1.default.find({
        isRevoked: false,
    });
    for (const storedToken of tokens) {
        const isMatch = await bcryptjs_1.default.compare(rawRefreshToken, storedToken.token);
        if (isMatch) {
            storedToken.isRevoked = true;
            await storedToken.save();
            logger_1.default.info(`Refresh token revoked`);
            return;
        }
    }
};
exports.revokeRefreshToken = revokeRefreshToken;
/**
 * Revoke all refresh tokens for a user (logout everywhere)
 */
const revokeAllUserTokens = async (userId) => {
    await RefreshToken_1.default.updateMany({ userId, isRevoked: false }, { isRevoked: true });
    logger_1.default.info(`All refresh tokens revoked for user: ${userId}`);
};
exports.revokeAllUserTokens = revokeAllUserTokens;
// ============================================================================
// Google OAuth
// ============================================================================
const verifyGoogleToken = async (idToken) => {
    try {
        const ticket = await client.verifyIdToken({
            idToken,
            audience: config_1.default.googleClientId,
        });
        const payload = ticket.getPayload();
        if (!payload) {
            throw new AppError_1.AuthenticationError('Invalid Google token payload');
        }
        return payload;
    }
    catch (error) {
        logger_1.default.error('Google token verification failed:', error);
        throw new AppError_1.AuthenticationError('Invalid Google token');
    }
};
exports.verifyGoogleToken = verifyGoogleToken;
const googleSignIn = async (idToken) => {
    const googlePayload = await (0, exports.verifyGoogleToken)(idToken);
    const { sub, email, name, picture } = googlePayload;
    // Check if user exists with this email
    let user = await User_1.default.findOne({ email });
    if (user) {
        // User exists - check auth provider
        if (user.authProvider === 'email') {
            // User registered with email, link Google account
            user.googleId = sub;
            user.authProvider = 'both';
            user.picture = picture;
            await user.save();
            logger_1.default.info(`Linked Google account for user: ${email}`);
        }
        else if (!user.googleId) {
            // Update googleId if not set
            user.googleId = sub;
            await user.save();
        }
    }
    else {
        // Create new Google-only user
        user = await User_1.default.create({
            googleId: sub,
            email,
            name,
            picture,
            authProvider: 'google',
            isEmailVerified: true, // Google emails are verified
        });
        logger_1.default.info(`New Google user created: ${email}`);
    }
    const tokens = await (0, exports.generateTokenPair)(user);
    logger_1.default.info(`User logged in via Google: ${email}`);
    return { ...tokens, user };
};
exports.googleSignIn = googleSignIn;
// ============================================================================
// Email/Password Authentication
// ============================================================================
const passwordValidation_1 = require("../utils/passwordValidation");
const registerUser = async (input) => {
    const { name, email, password } = input;
    console.log("Registering user:", { name, email, password: '***' });
    // Validate password strength
    const passwordValidation = (0, passwordValidation_1.validatePassword)(password);
    if (!passwordValidation.isValid) {
        throw new AppError_1.ValidationError(passwordValidation.errors[0]);
    }
    // Check if user already exists
    const existingUser = await User_1.default.findOne({ email });
    if (existingUser) {
        if (existingUser.authProvider === 'google') {
            throw new AppError_1.ValidationError('This email is registered with Google. Please use Google Sign-in.');
        }
        if (existingUser.isEmailVerified) {
            throw new AppError_1.ValidationError('An account with this email already exists. Please login.');
        }
        // User exists but not verified - resend OTP
        const otp = (0, emailService_1.generateOtp)();
        existingUser.otp = otp;
        existingUser.otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
        existingUser.password = await (0, exports.hashPassword)(password);
        existingUser.name = name;
        await existingUser.save();
        await (0, emailService_1.sendOtpEmail)(email, otp, name);
        logger_1.default.info(`OTP resent to unverified user: ${email}`);
        return { message: 'Verification code sent to your email' };
    }
    // Create new user
    const hashedPassword = await (0, exports.hashPassword)(password);
    const otp = (0, emailService_1.generateOtp)();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await User_1.default.create({
        name,
        email,
        password: hashedPassword,
        authProvider: 'email',
        isEmailVerified: false,
        otp,
        otpExpiry,
    });
    await (0, emailService_1.sendOtpEmail)(email, otp, name);
    logger_1.default.info(`New user registered: ${email}`);
    return { message: 'Verification code sent to your email' };
};
exports.registerUser = registerUser;
const verifyOtp = async (email, otp) => {
    const user = await User_1.default.findOne({ email });
    if (!user) {
        throw new AppError_1.ValidationError('User not found');
    }
    if (user.isEmailVerified) {
        throw new AppError_1.ValidationError('Email is already verified');
    }
    if (!user.otp || !user.otpExpiry) {
        throw new AppError_1.ValidationError('No OTP found. Please request a new one.');
    }
    if (new Date() > user.otpExpiry) {
        throw new AppError_1.ValidationError('OTP has expired. Please request a new one.');
    }
    if (user.otp !== otp) {
        throw new AppError_1.ValidationError('Invalid OTP');
    }
    // Verify user
    user.isEmailVerified = true;
    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();
    const tokens = await (0, exports.generateTokenPair)(user);
    logger_1.default.info(`User verified: ${email}`);
    return { ...tokens, user };
};
exports.verifyOtp = verifyOtp;
const resendOtp = async (email) => {
    const user = await User_1.default.findOne({ email });
    if (!user) {
        throw new AppError_1.ValidationError('User not found');
    }
    if (user.isEmailVerified) {
        throw new AppError_1.ValidationError('Email is already verified');
    }
    const otp = (0, emailService_1.generateOtp)();
    user.otp = otp;
    user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();
    await (0, emailService_1.sendOtpEmail)(email, otp, user.name);
    logger_1.default.info(`OTP resent: ${email}`);
    return { message: 'Verification code sent to your email' };
};
exports.resendOtp = resendOtp;
const loginWithEmail = async (email, password) => {
    const user = await User_1.default.findOne({ email });
    if (!user) {
        throw new AppError_1.AuthenticationError('Invalid email or password');
    }
    // Check auth provider
    if (user.authProvider === 'google') {
        throw new AppError_1.ValidationError('This account uses Google Sign-in. Please login with Google.');
    }
    // Check if email is verified
    if (!user.isEmailVerified) {
        throw new AppError_1.ValidationError('Please verify your email first');
    }
    // Verify password
    if (!user.password) {
        throw new AppError_1.AuthenticationError('Invalid email or password');
    }
    const isValid = await (0, exports.verifyPassword)(password, user.password);
    if (!isValid) {
        throw new AppError_1.AuthenticationError('Invalid email or password');
    }
    const tokens = await (0, exports.generateTokenPair)(user);
    logger_1.default.info(`User logged in via email: ${email}`);
    return { ...tokens, user };
};
exports.loginWithEmail = loginWithEmail;
// ============================================================================
// Onboarding
// ============================================================================
const markOnboardingComplete = async (userId) => {
    const user = await User_1.default.findById(userId);
    if (!user) {
        throw new AppError_1.ValidationError('User not found');
    }
    user.hasSeenOnboarding = true;
    await user.save();
    logger_1.default.info(`Onboarding marked complete for user: ${user.email}`);
};
exports.markOnboardingComplete = markOnboardingComplete;
//# sourceMappingURL=authService.js.map