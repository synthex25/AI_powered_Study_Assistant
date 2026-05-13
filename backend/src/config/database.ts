import mongoose from 'mongoose';
import config from './index';
import logger from '../utils/logger';

export const connectDatabase = async (): Promise<void> => {
  try {
    console.log('🔄 [DB] Attempting connection...');
    const uri = config.mongoUri;
    console.log('[DB] URI exists:', !!uri);
    console.log('[DB] URI length:', uri?.length);
    
    if (!uri) {
      throw new Error('MONGO_URI is undefined or empty');
    }

    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 15000, // 15 seconds
      socketTimeoutMS: 45000,
      family: 4, // Force IPv4
    });
    
    console.log('✅ [DB] Successfully connected to MongoDB');
  } catch (error: any) {
    console.error('❌ [DB] CRITICAL CONNECTION ERROR:');
    console.error('Message:', error.message);
    console.error('Name:', error.name);
    console.error('Code:', error.code);
    if (error.stack) console.error('Stack:', error.stack);
    
    if (process.env.NODE_ENV !== 'test') {
      console.log('Exiting process due to DB failure...');
      process.exit(1);
    }
  }
};



// Handle connection events
mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected');
});

mongoose.connection.on('error', (err) => {
  logger.error('MongoDB error:', err);
});
