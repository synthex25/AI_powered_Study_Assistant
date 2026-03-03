import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface AwsConfig {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken: string;
  s3Bucket: string;
}

interface Config {
  port: number;
  nodeEnv: string;
  mongoUri: string;
  jwtSecret: string;
  jwtAccessExpiresIn: string;
  jwtRefreshSecret: string;
  jwtRefreshExpiresIn: string;
  googleClientId: string;
  frontendUrl: string;
  corsOrigins: string[];
  emailUser: string;
  emailPassword: string;
  aws: AwsConfig;
  fastapiUrl: string;
  // Storage configuration
  storageProvider: 's3' | 'local';
  localStoragePath: string;
}

const requiredEnvVars = ['MONGO_URI', 'JWT_SECRET', 'JWT_REFRESH_SECRET', 'GOOGLE_CLIENT_ID'] as const;

// Validate required environment variables
const validateEnv = (): void => {
  const missing = requiredEnvVars.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
};

validateEnv();

const config: Config = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGO_URI as string,
  jwtSecret: process.env.JWT_SECRET as string,
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET as string,
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  googleClientId: process.env.GOOGLE_CLIENT_ID as string,
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  corsOrigins: (process.env.CORS_ORIGINS || process.env.FRONTEND_URL || 'http://localhost:5173').split(','),
  emailUser: process.env.EMAIL_USER || '',
  emailPassword: process.env.EMAIL_PASSWORD || '',
  aws: {
    region: process.env.AWS_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    sessionToken: process.env.AWS_SESSION_TOKEN || '',
    s3Bucket: process.env.AWS_S3_BUCKET || 'aws-test-jayesh',
  },
  fastapiUrl: process.env.FASTAPI_URL || 'http://localhost:8000',
  // Storage configuration
  storageProvider: (process.env.STORAGE_PROVIDER || 'local') as 's3' | 'local',
  localStoragePath: process.env.LOCAL_STORAGE_PATH || '../application-data',  // Shared folder at project root
};

export default config;

