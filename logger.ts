type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const orderedLevels: LogLevel[] = ['debug', 'info', 'warn', 'error'];

function getConfiguredLevel(): LogLevel {
  const raw = (process.env.LOG_LEVEL || 'info').toLowerCase();
  return orderedLevels.includes(raw as LogLevel) ? (raw as LogLevel) : 'info';
}

const configuredLevel = getConfiguredLevel();

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
