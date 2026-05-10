"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const config_1 = __importDefault(require("./config"));
const database_1 = require("./config/database");
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const masterRoutes_1 = __importDefault(require("./routes/masterRoutes"));
const chatRoutes_1 = __importDefault(require("./routes/chatRoutes"));
const workspaceRoutes_1 = __importDefault(require("./routes/workspaceRoutes"));
const jwtAuth_1 = __importDefault(require("./middleware/jwtAuth"));
const errorHandler_1 = require("./middleware/errorHandler");
const logger_1 = __importDefault(require("./utils/logger"));
// Initialize Express app
const app = (0, express_1.default)();
// CORS configuration
const corsOptions = {
    origin: config_1.default.corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    optionsSuccessStatus: 200,
};
// Base Middleware
app.use((0, cors_1.default)(corsOptions));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Serve static files from application-data
// Using absolute path to the shared folder at project root
const storagePath = path_1.default.resolve(__dirname, '../../application-data');
app.use('/storage', express_1.default.static(storagePath));
// Health check endpoint
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// API Routes
app.use('/api/auth', authRoutes_1.default);
app.use('/api/master', jwtAuth_1.default, masterRoutes_1.default);
app.use('/api/chat', chatRoutes_1.default);
app.use('/api/workspaces', workspaceRoutes_1.default);
// Global error handler (must be last)
app.use(errorHandler_1.errorHandler);
// Start server
const startServer = async () => {
    try {
        // Connect to database
        await (0, database_1.connectDatabase)();
        // Start listening
        app.listen(config_1.default.port, () => {
            logger_1.default.info(`🚀 Server running on port ${config_1.default.port} in ${config_1.default.nodeEnv} mode`);
        });
    }
    catch (error) {
        logger_1.default.error('Failed to start server:', error);
        process.exit(1);
    }
};
// Start server only when run directly (not when imported by tests)
if (require.main === module) {
    startServer();
}
exports.default = app;
//# sourceMappingURL=server.js.map