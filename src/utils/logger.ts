import { env } from '../config/env';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const orderedLevels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
const configuredLevel = env.logLevel as LogLevel;

function shouldLog(level: LogLevel) {
  return orderedLevels.indexOf(level) >= orderedLevels.indexOf(configuredLevel);
}

function write(level: LogLevel, message: string, meta?: Record<string, unknown>) {
  if (!shouldLog(level)) return;
  const payload = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...(meta ? { meta } : {})
  };
  const line = JSON.stringify(payload);
  if (level === 'error') {
    console.error(line);
    return;
  }
  if (level === 'warn') {
    console.warn(line);
    return;
  }
  console.log(line);
}

export const logger = {
  debug(message: string, meta?: Record<string, unknown>) {
    write('debug', message, meta);
  },
  info(message: string, meta?: Record<string, unknown>) {
    write('info', message, meta);
  },
  warn(message: string, meta?: Record<string, unknown>) {
    write('warn', message, meta);
  },
  error(message: string, meta?: Record<string, unknown>) {
    write('error', message, meta);
  }
};
