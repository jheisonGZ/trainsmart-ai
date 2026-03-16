import { env } from '../config/env';
import { sanitizeForLog } from '../utils/sanitize';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const levelOrder: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function shouldLog(level: LogLevel) {
  return levelOrder[level] >= levelOrder[env.LOG_LEVEL];
}

function write(level: LogLevel, message: string, meta?: unknown) {
  if (!shouldLog(level)) {
    return;
  }

  const payload = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...(meta !== undefined ? { meta: sanitizeForLog(meta) } : {}),
  };

  const serialized = JSON.stringify(payload);

  if (level === 'error') {
    console.error(serialized);
    return;
  }

  if (level === 'warn') {
    console.warn(serialized);
    return;
  }

  console.log(serialized);
}

export const logger = {
  debug(message: string, meta?: unknown) {
    write('debug', message, meta);
  },
  info(message: string, meta?: unknown) {
    write('info', message, meta);
  },
  warn(message: string, meta?: unknown) {
    write('warn', message, meta);
  },
  error(message: string, meta?: unknown) {
    write('error', message, meta);
  },
};
