import express from 'express';
import cors from 'cors';
import path from 'path';
import config from './config';
import { connectDatabase } from './config/database';
import authRoutes from './routes/authRoutes';
import masterRoutes from './routes/masterRoutes';
import chatRoutes from './routes/chatRoutes';
import workspaceRoutes from './routes/workspaceRoutes';
import verifyToken from './middleware/jwtAuth';
import { errorHandler } from './middleware/errorHandler';
import logger from './utils/logger';

// Initialize Express app
const app = express();

// CORS configuration
const corsOptions = {
  origin: config.corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  optionsSuccessStatus: 200,
};

// Base Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from application-data
// Using absolute path to the shared folder at project root
const storagePath = path.resolve(__dirname, '../../application-data');
app.use('/storage', express.static(storagePath));

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/master', verifyToken, masterRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/workspaces', workspaceRoutes);

// Global error handler (must be last)
app.use(errorHandler);

// Start server
const startServer = async (): Promise<void> => {
  try {
    // Connect to database
    await connectDatabase();

    // Start listening
    app.listen(config.port, () => {
      logger.info(`🚀 Server running on port ${config.port} in ${config.nodeEnv} mode`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;
