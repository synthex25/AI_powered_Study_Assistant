"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.asyncHandler = exports.errorHandler = void 0;
const AppError_1 = require("../errors/AppError");
const logger_1 = __importDefault(require("../utils/logger"));
const apiResponse_1 = require("../utils/apiResponse");
const errorHandler = (err, _req, res, _next) => {
    // Log the error
    logger_1.default.error('Error occurred:', {
        message: err.message,
        stack: err.stack,
        name: err.name,
    });
    // Handle known operational errors
    if (err instanceof AppError_1.AppError) {
        (0, apiResponse_1.sendError)(res, err.message, err.statusCode, err.code);
        return;
    }
    // Handle Mongoose validation errors
    if (err.name === 'ValidationError') {
        (0, apiResponse_1.sendError)(res, 'Validation failed', 400, 'VALIDATION_ERROR');
        return;
    }
    // Handle Mongoose duplicate key errors
    if (err.name === 'MongoServerError' && err.code === 11000) {
        (0, apiResponse_1.sendError)(res, 'Duplicate entry', 409, 'CONFLICT');
        return;
    }
    // Handle JWT errors
    if (err.name === 'JsonWebTokenError') {
        (0, apiResponse_1.sendError)(res, 'Invalid token', 401, 'AUTHENTICATION_ERROR');
        return;
    }
    if (err.name === 'TokenExpiredError') {
        (0, apiResponse_1.sendError)(res, 'Token expired', 401, 'AUTHENTICATION_ERROR');
        return;
    }
    // Unknown errors - don't leak details in production
    const message = process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : err.message;
    (0, apiResponse_1.sendError)(res, message, 500, 'INTERNAL_ERROR');
};
exports.errorHandler = errorHandler;
// Async handler wrapper to catch errors in async routes
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
exports.asyncHandler = asyncHandler;
//# sourceMappingURL=errorHandler.js.map