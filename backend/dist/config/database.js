"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDatabase = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const index_1 = __importDefault(require("./index"));
const logger_1 = __importDefault(require("../utils/logger"));
const connectDatabase = async () => {
    try {
        await mongoose_1.default.connect(index_1.default.mongoUri, {
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
            heartbeatFrequencyMS: 10000,
        });
        logger_1.default.info('✅ MongoDB connected successfully');
    }
    catch (error) {
        logger_1.default.error('❌ MongoDB connection error:', error);
        if (process.env.NODE_ENV !== 'test') {
            process.exit(1);
        }
    }
};
exports.connectDatabase = connectDatabase;
// Handle connection events
mongoose_1.default.connection.on('disconnected', () => {
    logger_1.default.warn('MongoDB disconnected');
});
mongoose_1.default.connection.on('error', (err) => {
    logger_1.default.error('MongoDB error:', err);
});
//# sourceMappingURL=database.js.map