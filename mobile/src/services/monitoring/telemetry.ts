type TelemetryPayload = Record<string, string | number | boolean | null | undefined>;

const formatError = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }
  return typeof error === 'string' ? error : 'Unknown error';
};

export const trackDriverEvent = (event: string, payload?: TelemetryPayload) => {
  if (!__DEV__) {
    return;
  }
  console.info(`[driver-event] ${event}`, payload ?? {});
};

export const logDriverError = (scope: string, error: unknown, payload?: TelemetryPayload) => {
  console.warn(`[driver-error] ${scope}: ${formatError(error)}`, payload ?? {});
};
