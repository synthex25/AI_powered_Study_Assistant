"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.completeOnboarding = exports.logout = exports.refreshToken = exports.validateToken = exports.resendOtp = exports.verifyOtp = exports.login = exports.register = exports.googleSignIn = void 0;
const authService = __importStar(require("../services/authService"));
const apiResponse_1 = require("../utils/apiResponse");
const errorHandler_1 = require("../middleware/errorHandler");
const logger_1 = __importDefault(require("../utils/logger"));
// ============================================================================
// Google OAuth
// ============================================================================
exports.googleSignIn = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { token } = req.body;
    logger_1.default.debug('Google sign-in attempt');
    const result = await authService.googleSignIn(token);
    (0, apiResponse_1.sendSuccess)(res, result, 'Login successful');
});
// ============================================================================
// Email/Password Authentication
// ============================================================================
exports.register = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { name, email, password } = req.body;
    logger_1.default.debug(`Registration attempt for: ${email}`);
    const result = await authService.registerUser({ name, email, password });
    (0, apiResponse_1.sendSuccess)(res, result, result.message);
});
exports.login = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { email, password } = req.body;
    logger_1.default.debug(`Login attempt for: ${email}`);
    const result = await authService.loginWithEmail(email, password);
    (0, apiResponse_1.sendSuccess)(res, result, 'Login successful');
});
exports.verifyOtp = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { email, otp } = req.body;
    logger_1.default.debug(`OTP verification for: ${email}`);
    const result = await authService.verifyOtp(email, otp);
    (0, apiResponse_1.sendSuccess)(res, result, 'Email verified successfully');
});
exports.resendOtp = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { email } = req.body;
    logger_1.default.debug(`Resend OTP for: ${email}`);
    const result = await authService.resendOtp(email);
    (0, apiResponse_1.sendSuccess)(res, result, result.message);
});
// ============================================================================
// Token Validation & Refresh
// ============================================================================
exports.validateToken = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { token } = req.body;
    logger_1.default.debug('Token validation request');
    if (!token) {
        (0, apiResponse_1.sendUnauthorized)(res, 'No token provided');
        return;
    }
    const decoded = authService.verifyJwtToken(token);
    (0, apiResponse_1.sendSuccess)(res, { valid: true, user: decoded });
});
/**
 * Refresh access token using refresh token
 * Implements token rotation for security
 */
exports.refreshToken = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { refreshToken } = req.body;
    logger_1.default.debug('Token refresh request');
    if (!refreshToken) {
        (0, apiResponse_1.sendUnauthorized)(res, 'No refresh token provided');
        return;
    }
    const tokens = await authService.refreshAccessToken(refreshToken);
    (0, apiResponse_1.sendSuccess)(res, tokens, 'Token refreshed successfully');
});
/**
 * Logout - revokes the refresh token
 */
exports.logout = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { refreshToken } = req.body;
    logger_1.default.debug('Logout request');
    if (refreshToken) {
        await authService.revokeRefreshToken(refreshToken);
    }
    (0, apiResponse_1.sendSuccess)(res, null, 'Logged out successfully');
});
// ============================================================================
// Onboarding
// ============================================================================
exports.completeOnboarding = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        (0, apiResponse_1.sendUnauthorized)(res, 'No token provided');
        return;
    }
    const token = authHeader.split(' ')[1];
    const decoded = authService.verifyJwtToken(token);
    logger_1.default.debug(`Completing onboarding for user: ${decoded.email}`);
    await authService.markOnboardingComplete(decoded.userId);
    (0, apiResponse_1.sendSuccess)(res, { hasSeenOnboarding: true }, 'Onboarding marked as complete');
});
//# sourceMappingURL=authController.js.map