"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const formatLog = (level, message, meta) => ({
    timestamp: new Date().toISOString(),
    level,
    message,
    meta,
});
const log = (level, message, meta) => {
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
    info: (message, meta) => log('info', message, meta),
    warn: (message, meta) => log('warn', message, meta),
    error: (message, meta) => log('error', message, meta),
    debug: (message, meta) => log('debug', message, meta),
};
exports.default = logger;
//# sourceMappingURL=logger.js.map