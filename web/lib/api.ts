import { apiBaseUrl, enableApiLogs } from './config';
import { getStoredSession, setStoredSession } from './auth-storage';
import type { ApiEnvelope, AuthSession, RideEvent, RideReceipt, RideSummary, SupportTicket, WalletEntry } from './types';

type HttpMethod = 'GET' | 'POST';

type ApiErrorCode = 'network_error' | 'unauthorized' | 'forbidden' | 'not_found' | 'server_error' | 'validation_error' | 'unknown';

type RequestOptions = {
  method?: HttpMethod;
  body?: unknown;
  auth?: boolean;
  retryAttempts?: number;
};

export class HttpError extends Error {
  constructor(readonly code: ApiErrorCode, message: string, readonly status?: number, readonly retryable = false) {
    super(message);
  }
}

function mapError(message: string, status?: number) {
  if (status === 401) return new HttpError('unauthorized', message, status, false);
  if (status === 403) return new HttpError('forbidden', message, status, false);
  if (status === 404) return new HttpError('not_found', message, status, false);
  if (status && status >= 500) return new HttpError('server_error', message, status, true);
  if (status && status >= 400) return new HttpError('validation_error', message, status, false);
  return new HttpError('unknown', message, status, false);
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function refreshStoredSession() {
  const session = getStoredSession();
  if (!session?.refreshToken || !apiBaseUrl) {
    return null;
  }

  const response = await fetch(`${apiBaseUrl}/api/auth/refresh`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: JSON.stringify({ refreshToken: session.refreshToken }),
  });

  const payload = (await response.json()) as ApiEnvelope<{ accessToken: string; refreshToken: string }>;
  if (!response.ok || payload.error) {
    setStoredSession(null);
    return null;
  }

  const nextSession: AuthSession = {
    ...session,
    accessToken: payload.accessToken,
    refreshToken: payload.refreshToken,
  };
  setStoredSession(nextSession);
  return nextSession;
}

async function request<T>(path: string, options: RequestOptions = {}, hasRefreshed = false): Promise<T> {
  const { method = 'GET', body, auth = false, retryAttempts = 1 } = options;
  if (!apiBaseUrl) {
    throw new HttpError('network_error', 'NEXT_PUBLIC_API_BASE_URL is not configured.', undefined, false);
  }

  const session = getStoredSession();
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  };

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

      const payload = (await response.json()) as ApiEnvelope<T>;

      if (response.status === 401 && auth && !hasRefreshed) {
        const nextSession = await refreshStoredSession();
        if (nextSession) {
          return request<T>(path, options, true);
        }
      }

      if (!response.ok || payload.error) {
        throw mapError(payload.error || `Request failed with status ${response.status}`, response.status);
      }

      if (enableApiLogs) {
        console.info('[drive-web-api]', method, path, payload);
      }

      return payload as T;
    } catch (error) {
      if (enableApiLogs) {
        console.error('[drive-web-api:error]', method, path, error);
      }

      if (error instanceof HttpError) {
        if (!error.retryable || attempt === retryAttempts) {
          throw error;
        }
      } else if (attempt === retryAttempts) {
        throw new HttpError('network_error', 'Unable to reach the Drive API. Check the configured base URL and network connection.', undefined, true);
      }

      await sleep(300 * (attempt + 1));
    }
  }

  throw new HttpError('unknown', 'Unexpected request failure.');
}

export const authApi = {
  async signUp(payload: { email?: string; phone?: string; password: string }) {
    const response = await request<ApiEnvelope<{ user: AuthSession['user']; accessToken: string; refreshToken: string }>>('/api/auth/signup', {
      method: 'POST',
      body: { ...payload, role: 'rider' },
    });

    const session: AuthSession = {
      user: response.user,
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
    };
    setStoredSession(session);
    return session;
  },
  async signIn(payload: { email?: string; phone?: string; password: string }) {
    const response = await request<ApiEnvelope<{ user: AuthSession['user']; accessToken: string; refreshToken: string }>>('/api/auth/login', {
      method: 'POST',
      body: payload,
    });

    const session: AuthSession = {
      user: response.user,
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
    };
    setStoredSession(session);
    return session;
  },
  async logout() {
    const session = getStoredSession();
    if (session?.refreshToken) {
      await request('/api/auth/logout', {
        method: 'POST',
        body: { refreshToken: session.refreshToken },
      });
    }
    setStoredSession(null);
  },
};

export const ridesApi = {
  estimate(payload: Record<string, unknown>) {
    return request<ApiEnvelope<{ fareEstimate: number; fareEstimateRange: { low: number; high: number }; surgeMultiplier: number; fareBreakdown: RideReceipt['fareBreakdown'] }>>('/api/rides/estimate', {
      method: 'POST',
      body: payload,
      auth: true,
    });
  },
  request(payload: Record<string, unknown>) {
    return request<ApiEnvelope<{ ride: RideSummary; discountCents?: number }>>('/api/rides/request', {
      method: 'POST',
      body: payload,
      auth: true,
    });
  },
  history(limit = 20) {
    return request<ApiEnvelope<{ rides: RideSummary[]; summary: { total: number; active: number; completed: number; canceled: number } }>>('/api/rides/history', {
      method: 'POST',
      body: { limit },
      auth: true,
    });
  },
  detail(rideId: string) {
    return request<ApiEnvelope<{ ride: RideSummary; receipt: RideReceipt | null; notifications: RideEvent[] }>>('/api/rides/detail', {
      method: 'POST',
      body: { rideId },
      auth: true,
    });
  },
  receipt(rideId: string) {
    return request<ApiEnvelope<{ ride: RideSummary; receipt: RideReceipt }>>('/api/rides/receipt', {
      method: 'POST',
      body: { rideId },
      auth: true,
    });
  },
  notifications(limit = 20) {
    return request<ApiEnvelope<{ notifications: RideEvent[]; total: number }>>('/api/rides/notifications', {
      method: 'POST',
      body: { limit },
      auth: true,
    });
  },
  cancel(rideId: string, reason: string) {
    return request<ApiEnvelope<{ ride: RideSummary; receipt: RideReceipt | null }>>('/api/rides/cancel', {
      method: 'POST',
      body: { rideId, reason },
      auth: true,
    });
  },
  rate(rideId: string, rating: number, review?: string) {
    return request<ApiEnvelope<{ rideId: string; rating: number; review?: string }>>('/api/rides/rate', {
      method: 'POST',
      body: { rideId, rating, review },
      auth: true,
    });
  },
  message(rideId: string, message: string) {
    return request<ApiEnvelope<{ rideId: string; message: RideEvent }>>('/api/rides/message', {
      method: 'POST',
      body: { rideId, message },
      auth: true,
    });
  },
};

export const walletApi = {
  balance(userId: string) {
    return request<ApiEnvelope<{ balanceCents: number }>>('/api/wallet/balance', {
      method: 'POST',
      body: { userId },
      auth: true,
    });
  },
  ledger(userId: string) {
    return request<ApiEnvelope<{ entries: WalletEntry[] }>>('/api/wallet/ledger', {
      method: 'POST',
      body: { userId },
      auth: true,
    });
  },
};

export const supportApi = {
  listTickets(userId: string) {
    return request<ApiEnvelope<{ tickets: SupportTicket[] }>>('/api/support/list-tickets', {
      method: 'POST',
      body: { userId },
      auth: true,
    });
  },
  createTicket(userId: string, type: string, message: string) {
    return request<ApiEnvelope<{ ticket: SupportTicket }>>('/api/support/create-ticket', {
      method: 'POST',
      body: { userId, type, message },
      auth: true,
    });
  },
  getTicket(ticketId: string) {
    return request<ApiEnvelope<{ ticket: SupportTicket }>>('/api/support/get-ticket', {
      method: 'POST',
      body: { ticketId },
      auth: true,
    });
  },
  replyTicket(ticketId: string, message: string) {
    return request<ApiEnvelope<{ ticket: SupportTicket }>>('/api/support/reply-ticket', {
      method: 'POST',
      body: { ticketId, message },
      auth: true,
    });
  },
};

export const marketplaceApi = {
  promos() {
    return request<ApiEnvelope<{ promos: Array<{ id: string; code: string; discountType: string; discountValue: number; usageCount: number; expiresAt?: string }> }>>('/api/marketplace/promos', {
      auth: true,
    });
  },
  referralCode() {
    return request<ApiEnvelope<{ referralCode: string }>>('/api/marketplace/referral/code', {
      auth: true,
    });
  },
  referrals() {
    return request<ApiEnvelope<{ referrals: Array<{ id: string; referredUserId: string; bonusCents: number; paid: boolean; createdAt: string }>; totalBonusCents: number }>>('/api/marketplace/referral/list', {
      auth: true,
    });
  },
  registerReferral(referralCode: string) {
    return request<ApiEnvelope<{ referralEvent: { id: string } }>>('/api/marketplace/referral/register', {
      method: 'POST',
      body: { referralCode },
      auth: true,
    });
  },
  surge() {
    return request<ApiEnvelope<{ multiplier: number; reason?: string }>>('/api/marketplace/surge', {
      auth: true,
    });
  },
};

export const foodApi = {
  listRestaurants(params?: { cuisine?: string; minRating?: number; maxDeliveryMins?: number }) {
    return request<ApiEnvelope<{ restaurants: import('./types').Restaurant[] }>>('/api/food/restaurants', {
      method: 'POST',
      body: params ?? {},
      auth: true,
    });
  },
  getRestaurant(restaurantId: string) {
    return request<ApiEnvelope<{ restaurant: import('./types').Restaurant; menu: import('./types').MenuCategory[] }>>('/api/food/restaurant', {
      method: 'POST',
      body: { restaurantId },
      auth: true,
    });
  },
  placeOrder(payload: {
    restaurantId: string;
    items: import('./types').CartItem[];
    deliveryAddressId: string;
    deliveryInstructions?: string;
    promoCode?: string;
  }) {
    return request<ApiEnvelope<{ order: import('./types').FoodOrder }>>('/api/food/order/place', {
      method: 'POST',
      body: payload,
      auth: true,
    });
  },
  getOrder(orderId: string) {
    return request<ApiEnvelope<{ order: import('./types').FoodOrder }>>('/api/food/order', {
      method: 'POST',
      body: { orderId },
      auth: true,
    });
  },
  listOrders() {
    return request<ApiEnvelope<{ orders: import('./types').FoodOrder[] }>>('/api/food/orders', {
      method: 'POST',
      body: {},
      auth: true,
    });
  },
  rateOrder(orderId: string, rating: number, review?: string) {
    return request<ApiEnvelope<{ orderId: string; rating: number }>>('/api/food/order/rate', {
      method: 'POST',
      body: { orderId, rating, review },
      auth: true,
    });
  },
};
