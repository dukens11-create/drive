import { Platform } from 'react-native';

type Primitive = string | number | boolean | null;
type EventAttributes = Record<string, Primitive | undefined>;
type ErrorLike = Error | string | unknown;

type TelemetryEvent = {
  name: string;
  attributes: Record<string, Primitive>;
  timestamp: string;
};

type LogLevel = 'debug' | 'info' | 'warn' | 'error';
type PerformanceMemory = {
  usedJSHeapSize?: number;
};
type ErrorUtilsShape = {
  getGlobalHandler?: () => (error: Error, isFatal?: boolean) => void;
  setGlobalHandler?: (handler: (error: Error, isFatal?: boolean) => void) => void;
};

const MAX_BUFFERED_ITEMS = 200;
const appStartTimestampMs = Date.now();
let crashReportingRegistered = false;
let sequence = 0;

const telemetryBuffer: TelemetryEvent[] = [];

function normalizeAttributes(attributes: EventAttributes = {}): Record<string, Primitive> {
  const normalized: Record<string, Primitive> = {};
  Object.entries(attributes).forEach(([key, value]) => {
    if (value !== undefined) {
      normalized[key] = value;
    }
  });
  return normalized;
}

function pushTelemetryEvent(name: string, attributes: EventAttributes = {}) {
  const event: TelemetryEvent = {
    name,
    attributes: normalizeAttributes(attributes),
    timestamp: new Date().toISOString(),
  };

  telemetryBuffer.push(event);
  if (telemetryBuffer.length > MAX_BUFFERED_ITEMS) {
    telemetryBuffer.shift();
  }

  sequence += 1;
  console.log(`[telemetry:${sequence}] ${event.name}`, event.attributes);
}

function describeError(error: ErrorLike): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Unknown error';
}

export function logEvent(name: string, attributes: EventAttributes = {}) {
  pushTelemetryEvent(name, attributes);
}

export function logMessage(level: LogLevel, message: string, attributes: EventAttributes = {}) {
  const normalized = normalizeAttributes(attributes);
  const payload = {
    level,
    message,
    ...normalized,
  };

  if (level === 'error') {
    console.error('[drive]', payload);
    return;
  }
  if (level === 'warn') {
    console.warn('[drive]', payload);
    return;
  }
  console.log('[drive]', payload);
}

export function logError(eventName: string, error: ErrorLike, attributes: EventAttributes = {}) {
  const message = describeError(error);
  pushTelemetryEvent(eventName, {
    ...attributes,
    errorMessage: message,
  });
  logMessage('error', eventName, {
    ...attributes,
    errorMessage: message,
  });
}

export function markAppStartupComplete(source: string) {
  const startupMs = Date.now() - appStartTimestampMs;
  pushTelemetryEvent('app_startup_completed', {
    source,
    startupMs,
    platform: Platform.OS,
  });
}

export function startPerformanceTimer(name: string, attributes: EventAttributes = {}) {
  const hasPerformanceNow = typeof globalThis.performance?.now === 'function';
  const getTime = hasPerformanceNow && globalThis.performance ? () => globalThis.performance.now() : () => Date.now();
  const start = getTime();

  return (result: EventAttributes = {}) => {
    const end = getTime();
    const durationMs = Number((end - start).toFixed(2));
    pushTelemetryEvent(name, {
      ...attributes,
      ...result,
      durationMs,
    });
    return durationMs;
  };
}

export function trackMemoryUsage(reason: string) {
  const memory = (globalThis as { performance?: { memory?: PerformanceMemory } }).performance?.memory;
  if (!memory || typeof memory.usedJSHeapSize !== 'number') {
    return;
  }

  pushTelemetryEvent('memory_usage_sampled', {
    reason,
    usedJsHeapBytes: memory.usedJSHeapSize,
  });
}

export function setupCrashReporting() {
  if (crashReportingRegistered) {
    return;
  }
  crashReportingRegistered = true;

  const maybeErrorUtils = (globalThis as { ErrorUtils?: ErrorUtilsShape }).ErrorUtils;
  const previousHandler = maybeErrorUtils?.getGlobalHandler?.();

  maybeErrorUtils?.setGlobalHandler?.((error: Error, isFatal?: boolean) => {
    pushTelemetryEvent('app_crash_captured', {
      isFatal: Boolean(isFatal),
      errorMessage: error.message,
    });
    logMessage('error', 'app_crash_captured', {
      isFatal: Boolean(isFatal),
      errorMessage: error.message,
    });

    if (previousHandler) {
      previousHandler(error, isFatal);
    }
  });
}
