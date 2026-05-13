"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const formatLog = (level, message, meta) => ({
    timestamp: new Date().toISOString(),
    level,
    message,
    meta: meta instanceof Error ? { error: meta.message, stack: meta.stack, ...meta } : meta,
});
const log = (level, message, meta) => {
    const entry = formatLog(level, message, meta);
    let metaString = '';
    if (meta) {
        if (meta instanceof Error) {
            metaString = `\n${meta.stack || meta.message}`;
        }
        else {
            try {
                metaString = `\n${JSON.stringify(meta, null, 2)}`;
            }
            catch (e) {
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
    info: (message, meta) => log('info', message, meta),
    warn: (message, meta) => log('warn', message, meta),
    error: (message, meta) => log('error', message, meta),
    debug: (message, meta) => log('debug', message, meta),
};
exports.default = logger;
//# sourceMappingURL=logger.js.map