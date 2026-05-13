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
  meta: meta instanceof Error ? { error: meta.message, stack: meta.stack, ...meta } : meta,
});

const log = (level: LogLevel, message: string, meta?: unknown): void => {
  const entry = formatLog(level, message, meta);
  let metaString = '';
  
  if (meta) {
    if (meta instanceof Error) {
      metaString = `\n${meta.stack || meta.message}`;
    } else {
      try {
        metaString = `\n${JSON.stringify(meta, null, 2)}`;
      } catch (e) {
        metaString = `\n[Unserializable Meta]`;
      }
    }
  }

  const logString = `[${entry.timestamp}] [${entry.level.toUpperCase()}] ${entry.message}${metaString}`;


  switch (level) {
    case 'error':
      console.error(logString);
      break;
    case 'warn':
      console.warn(logString);
      break;
    case 'debug':
      if (process.env.NODE_ENV !== 'production') {
        console.debug(logString);
      }
      break;
    default:
      console.log(logString);
  }
};


const logger = {
  info: (message: string, meta?: unknown) => log('info', message, meta),
  warn: (message: string, meta?: unknown) => log('warn', message, meta),
  error: (message: string, meta?: unknown) => log('error', message, meta),
  debug: (message: string, meta?: unknown) => log('debug', message, meta),
};

export default logger;
