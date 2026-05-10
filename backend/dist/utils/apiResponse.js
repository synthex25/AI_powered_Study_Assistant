"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendBadRequest = exports.sendUnauthorized = exports.sendNotFound = exports.sendCreated = exports.sendError = exports.sendSuccess = void 0;
const sendSuccess = (res, data, message, statusCode = 200) => {
    return res.status(statusCode).json({
        success: true,
        data,
        message,
    });
};
exports.sendSuccess = sendSuccess;
const sendError = (res, message, statusCode = 500, code, errors) => {
    return res.status(statusCode).json({
        success: false,
        message,
        code,
        errors,
    });
};
exports.sendError = sendError;
const sendCreated = (res, data, message) => {
    return (0, exports.sendSuccess)(res, data, message, 201);
};
exports.sendCreated = sendCreated;
const sendNotFound = (res, message = 'Resource not found') => {
    return (0, exports.sendError)(res, message, 404, 'NOT_FOUND');
};
exports.sendNotFound = sendNotFound;
const sendUnauthorized = (res, message = 'Unauthorized') => {
    return (0, exports.sendError)(res, message, 401, 'UNAUTHORIZED');
};
exports.sendUnauthorized = sendUnauthorized;
const sendBadRequest = (res, message, errors) => {
    return (0, exports.sendError)(res, message, 400, 'BAD_REQUEST', errors);
};
exports.sendBadRequest = sendBadRequest;
//# sourceMappingURL=apiResponse.js.map