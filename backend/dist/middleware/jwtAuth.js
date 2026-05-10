"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = __importDefault(require("../config"));
const apiResponse_1 = require("../utils/apiResponse");
const logger_1 = __importDefault(require("../utils/logger"));
const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];
    if (!token) {
        (0, apiResponse_1.sendUnauthorized)(res, 'No token provided');
        return;
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, config_1.default.jwtSecret);
        req.user = decoded;
        next();
    }
    catch (error) {
        logger_1.default.warn('Token verification failed:', { error: error.message });
        (0, apiResponse_1.sendUnauthorized)(res, 'Invalid or expired token');
    }
};
exports.default = verifyToken;
//# sourceMappingURL=jwtAuth.js.map