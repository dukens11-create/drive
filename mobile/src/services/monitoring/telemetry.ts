type TelemetryEventPayload = Record<string, string | number | boolean | null | undefined>;

const formatError = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }
  return typeof error === 'string' ? error : 'Unknown error';
};

export const trackDriverEvent = (event: string, payload?: TelemetryEventPayload) => {
  console.info(`[driver-event] ${event}`, payload ?? {});
};

export const logDriverError = (scope: string, error: unknown, payload?: TelemetryEventPayload) => {
  console.error(`[driver-error] ${scope}: ${formatError(error)}`, payload ?? {});
};

export const logDriverWarning = (scope: string, warning: unknown, payload?: TelemetryEventPayload) => {
  console.warn(`[driver-warning] ${scope}: ${formatError(warning)}`, payload ?? {});
};
