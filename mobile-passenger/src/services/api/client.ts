import { apiBaseUrl } from '../config/apiConfig';
import { logError, logEvent, startPerformanceTimer } from '../observability';

type AuthSnapshot = {
  accessToken: string;
  refreshToken: string;
} | null;

type AuthHandlers = {
  getSession: () => AuthSnapshot;
  refreshSession: () => Promise<boolean>;
};

const defaultHeaders = {
  Accept: 'application/json',
  'Content-Type': 'application/json',
};
const RETRY_DELAY_BASE_MS = 300;

let authHandlers: AuthHandlers | null = null;

export type ApiError = {
  message: string;
  status?: number;
  code: 'network_error' | 'unauthorized' | 'forbidden' | 'not_found' | 'server_error' | 'validation_error' | 'unknown';
  retryable: boolean;
};

export class HttpError extends Error {
  readonly details: ApiError;

  constructor(details: ApiError) {
    super(details.message);
    this.details = details;
  }
}

export const configureApiAuth = (handlers: AuthHandlers | null) => {
  authHandlers = handlers;
};

const mapError = (message: string, status?: number): ApiError => {
  if (status === 401) {
    return { message, status, code: 'unauthorized', retryable: false };
  }
  if (status === 403) {
    return { message, status, code: 'forbidden', retryable: false };
  }
  if (status === 404) {
    return { message, status, code: 'not_found', retryable: false };
  }
  if (status && status >= 500) {
    return { message, status, code: 'server_error', retryable: true };
  }
  if (status && status >= 400) {
    return { message, status, code: 'validation_error', retryable: false };
  }
  return { message, status, code: 'unknown', retryable: false };
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type RequestOptions = {
  method?: 'GET' | 'POST';
  body?: unknown;
  auth?: boolean;
  retryAttempts?: number;
};

async function request<T>(path: string, options: RequestOptions = {}, hasRefreshed = false): Promise<T> {
  const { method = 'GET', body, auth = false, retryAttempts = 1 } = options;
  const stopRequestTimerInternal = startPerformanceTimer('api_request_duration', {
    path,
    method,
    auth,
  });
  let timerStopped = false;
  const stopRequestTimer = (attributes: Record<string, boolean | number | string>) => {
    if (timerStopped) {
      return;
    }
    timerStopped = true;
    stopRequestTimerInternal(attributes);
  };
  const session = authHandlers?.getSession() ?? null;

  const headers: Record<string, string> = { ...defaultHeaders };
  if (auth && session?.accessToken) {
    headers.Authorization = ['Bearer', session.accessToken].join(' ');
  }

  for (let attempt = 0; attempt <= retryAttempts; attempt += 1) {
    try {
      const response = await fetch(`${apiBaseUrl}${path}`, {
        method,
        headers,
        body: method === 'GET' ? undefined : JSON.stringify(body ?? {}),
      });

      const text = await response.text();
      const payload = text ? (JSON.parse(text) as { error?: string }) : {};

      if (response.status === 401 && auth && !hasRefreshed && authHandlers?.refreshSession) {
        const refreshed = await authHandlers.refreshSession();
        if (refreshed) {
          const retriedResponse = await request<T>(path, options, true);
          stopRequestTimer({
            attempt,
            refreshedSession: true,
            statusCode: response.status,
            success: true,
          });
          logEvent('api_session_refreshed', { path, method });
          return retriedResponse;
        }
      }

      if (!response.ok || payload.error) {
        const details = mapError(payload.error || `Request failed with status ${response.status}`, response.status);
        stopRequestTimer({
          attempt,
          statusCode: response.status,
          success: false,
        });
        logError('api_request_failed', details.message, {
          path,
          method,
          statusCode: response.status,
          retryable: details.retryable,
        });
        throw new HttpError(details);
      }

      stopRequestTimer({
        attempt,
        statusCode: response.status,
        success: true,
      });
      logEvent('api_request_succeeded', {
        path,
        method,
        statusCode: response.status,
      });
      return payload as T;
    } catch (error) {
      if (error instanceof HttpError) {
        if (!error.details.retryable || attempt === retryAttempts) {
          stopRequestTimer({
            attempt,
            success: false,
          });
          throw error;
        }
      } else if (attempt === retryAttempts) {
        stopRequestTimer({
          attempt,
          success: false,
        });
        logError('api_network_request_failed', error, {
          path,
          method,
        });
        throw new HttpError({
          message: 'Network request failed. Please check your connection and try again.',
          code: 'network_error',
          retryable: true,
        });
      }

      await sleep(RETRY_DELAY_BASE_MS * (attempt + 1));
    }
  }

  throw new HttpError({ message: 'Unexpected request failure.', code: 'unknown', retryable: false });
}

export const apiClient = {
  get: <T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>) => request<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'POST', body }),
};
