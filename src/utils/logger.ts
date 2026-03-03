type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  meta?: unknown;
}

const formatLog = (level: LogLevel, message: string, meta?: unknown): LogEntry => ({
  timestamp: new Date().toISOString(),
  level,
  message,
  meta,
});

const log = (level: LogLevel, message: string, meta?: unknown): void => {
  const entry = formatLog(level, message, meta);
  const logString = `[${entry.timestamp}] [${entry.level.toUpperCase()}] ${entry.message}`;

  switch (level) {
    case 'error':
      console.error(logString, meta ? JSON.stringify(meta, null, 2) : '');
      break;
    case 'warn':
      console.warn(logString, meta ? JSON.stringify(meta, null, 2) : '');
      break;
    case 'debug':
      if (process.env.NODE_ENV !== 'production') {
        console.debug(logString, meta ? JSON.stringify(meta, null, 2) : '');
      }
      break;
    default:
      console.log(logString, meta ? JSON.stringify(meta, null, 2) : '');
  }
};

const logger = {
  info: (message: string, meta?: unknown) => log('info', message, meta),
  warn: (message: string, meta?: unknown) => log('warn', message, meta),
  error: (message: string, meta?: unknown) => log('error', message, meta),
  debug: (message: string, meta?: unknown) => log('debug', message, meta),
};

export default logger;
