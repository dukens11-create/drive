export type SectionKey =
  | 'dashboard'
  | 'analytics'
  | 'drivers'
  | 'rides'
  | 'payments'
  | 'users'
  | 'support'
  | 'safety'
  | 'promotions'
  | 'settings'
  | 'reports';

export type SessionUser = {
  id: string;
  email?: string;
  phone?: string;
  role: string;
};

export type Session = {
  accessToken: string;
  refreshToken?: string;
  user: SessionUser;
};

export type DriverSummary = {
  userId: string;
  status: string;
  verificationState: string;
  availabilityStatus: string;
  available: boolean;
  rating: number;
  acceptanceRate: number;
  cancellationRate: number;
  earningsCents: number;
  documents: string[];
  lat?: number;
  lng?: number;
  tripCount: number;
  completedTrips: number;
  activeRideId?: string;
  incidentsCount: number;
  walletBalanceCents: number;
  user?: SessionUser & { suspended?: boolean };
};

export type RiderSummary = {
  user: SessionUser;
  tripCount: number;
  completedTrips: number;
  activeTrips: number;
  spendingCents: number;
  retentionScore: number;
};

export type TicketSummary = {
  id: string;
  userId: string;
  type: string;
  message: string;
  status: string;
  resolution?: string;
  replies: Array<{ id: string; authorRole: string; message: string; createdAt: string }>;
  createdAt: string;
  updatedAt: string;
  user?: SessionUser;
};

export type IncidentSummary = {
  id: string;
  userId?: string;
  rideId?: string;
  type: string;
  details?: string;
  lat?: number;
  lng?: number;
  level?: string;
  status: string;
  createdAt: string;
  resolvedAt?: string;
  user?: SessionUser;
};

export type PaymentSummary = {
  id: string;
  rideId?: string;
  riderId?: string;
  driverId?: string;
  amountCents: number;
  currency: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  capturedAt?: string;
  refundedAt?: string;
};

export type AdminExportJob = {
  id: string;
  dataType: string;
  format: string;
  filename: string;
  rowCount: number;
  columns: string[];
  filters?: Record<string, unknown>;
  requestedAt: string;
  requestedBy?: string;
  reusedFromId?: string;
};

export type AdminImportJob = {
  id: string;
  dataType: string;
  format: string;
  status: 'preview' | 'completed' | 'rolled_back';
  totalRecords: number;
  validRecords: number;
  importedCount: number;
  duplicateCount: number;
  errorCount: number;
  requestedAt: string;
  requestedBy?: string;
  errors: string[];
  rollbackAt?: string;
};

export type AdminBulkJob = {
  id: string;
  targetType: string;
  action: string;
  total: number;
  processed: number;
  succeeded: number;
  failed: number;
  requestedAt: string;
  requestedBy?: string;
  errors: string[];
  status: 'completed';
};

export type AdminOverview = {
  stats: {
    totalUsers: number;
    riders: number;
    drivers: number;
    merchants: number;
    totalRides: number;
    activeRides: number;
    completedRides: number;
    totalPayments: number;
    totalRevenueCents: number;
    openTickets: number;
    openIncidents: number;
    pendingDrivers: number;
  };
  realtime: {
    activeDrivers: number;
    activeRides: number;
    highPriorityIncidents: number;
    newTickets: number;
  };
  settings: {
    maintenanceMode: boolean;
    appVersion: string;
    commissionRatePercent: number;
    surgeMultiplier: number;
    featureFlags: Array<{ key: string; label: string; enabled: boolean }>;
    updatedAt: string;
  };
  drivers: DriverSummary[];
  riders: RiderSummary[];
  users: Array<SessionUser & { createdAt?: string; suspended?: boolean }>;
  rides: Array<Record<string, unknown>>;
  tickets: TicketSummary[];
  incidents: IncidentSummary[];
  payments: PaymentSummary[];
  refunds: PaymentSummary[];
  walletLedger: Array<{ id: string; userId: string; kind: string; amountCents: number; reason: string; createdAt: string }>;
  walletBalances: Array<{ userId: string; balanceCents: number }>;
  promos: Array<Record<string, unknown>>;
  markets: Array<Record<string, unknown>>;
  referralEvents: Array<Record<string, unknown>>;
  apiKeys: Array<{ id: string; name: string; keyPreview: string; createdAt: string; revokedAt?: string }>;
  auditLogs: Array<Record<string, unknown>>;
  restaurants: Array<Record<string, unknown>>;
  orders: Array<Record<string, unknown>>;
  reviews: Array<Record<string, unknown>>;
  exportJobs: AdminExportJob[];
  importJobs: AdminImportJob[];
  bulkJobs: AdminBulkJob[];
  analytics: {
    revenueByDay: Array<{ label: string; value: number }>;
    revenueByWeek: Array<{ label: string; value: number }>;
    revenueByMonth: Array<{ label: string; value: number }>;
    tripVolumeByDay: Array<{ label: string; value: number }>;
    userGrowthByDay: Array<{ label: string; value: number }>;
    driverLeaderboard: Array<{ driverId: string; name: string; earningsCents: number; rating: number; tripCount: number }>;
    riderLeaderboard: Array<{ riderId: string; name: string; spendingCents: number; tripCount: number; retentionScore: number }>;
    support: { open: number; pending: number; resolved: number; avgResolutionHours: number; satisfactionScore: number };
    safety: { open: number; underReview: number; resolved: number; dismissed: number };
    finance: { capturedRevenueCents: number; pendingSettlementCents: number; refundedCents: number; walletExposureCents: number };
  };
};

const RETRYABLE_STATUS_CODES = new Set([408, 425, 429, 500, 502, 503, 504]);
export const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';

function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function parseResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(body?.error || body?.message || `Request failed with status ${response.status}`);
  }
  return body as T;
}

async function request<T>(path: string, options: RequestInit = {}, token?: string, attempt = 0): Promise<T> {
  const headers = new Headers(options.headers || {});
  headers.set('content-type', 'application/json');
  if (token) headers.set('authorization', 'Bearer ' + token);
  try {
    const response = await fetch(`${apiBaseUrl}${path}`, { ...options, headers, cache: 'no-store' });
    if (RETRYABLE_STATUS_CODES.has(response.status) && attempt < 2) {
      await wait(200 * (attempt + 1));
      return request<T>(path, options, token, attempt + 1);
    }
    return await parseResponse<T>(response);
  } catch (error) {
    if (attempt < 2) {
      await wait(200 * (attempt + 1));
      return request<T>(path, options, token, attempt + 1);
    }
    throw error;
  }
}

export function decodeToken(token: string): SessionUser {
  const [, payload] = token.split('.');
  const decoded = JSON.parse(atob(payload));
  return {
    id: decoded.sub,
    email: decoded.email,
    phone: decoded.phone,
    role: decoded.role
  };
}

export async function loginAdmin(email: string, password: string): Promise<Session> {
  const body = await request<{ accessToken: string; refreshToken?: string; user?: SessionUser; error?: string }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
  if (!body.accessToken) throw new Error(body.error || 'Missing access token');
  const user = body.user || decodeToken(body.accessToken);
  if (user.role !== 'admin') throw new Error('This account does not have admin access');
  return { accessToken: body.accessToken, refreshToken: body.refreshToken, user };
}

export const adminApi = {
  fetchOverview: (token: string) => request<{ ok: boolean } & AdminOverview>('/api/admin/overview', { method: 'GET' }, token),
  approveDriver: (token: string, userId: string, approved: boolean) => request('/api/admin/approve-driver', { method: 'POST', body: JSON.stringify({ userId, approved }) }, token),
  suspendUser: (token: string, userId: string, suspend: boolean) => request('/api/admin/suspend-user', { method: 'POST', body: JSON.stringify({ userId, suspend }) }, token),
  updateTicket: (token: string, ticketId: string, status: string, resolution?: string) => request('/api/admin/update-ticket', { method: 'POST', body: JSON.stringify({ ticketId, status, resolution }) }, token),
  replyTicket: (token: string, ticketId: string, message: string) => request('/api/support/reply-ticket', { method: 'POST', body: JSON.stringify({ ticketId, message, authorRole: 'admin' }) }, token),
  updateIncident: (token: string, incidentId: string, status: string, details?: string) => request('/api/safety/update-incident', { method: 'POST', body: JSON.stringify({ incidentId, status, details }) }, token),
  updateSettings: (token: string, payload: Record<string, unknown>) => request('/api/admin/update-settings', { method: 'POST', body: JSON.stringify(payload) }, token),
  upsertPromo: (token: string, payload: Record<string, unknown>) => request('/api/admin/upsert-promo', { method: 'POST', body: JSON.stringify(payload) }, token),
  upsertMarket: (token: string, payload: Record<string, unknown>) => request('/api/admin/upsert-market', { method: 'POST', body: JSON.stringify(payload) }, token),
  exportData: (
    token: string,
    payload: Record<string, unknown>
  ) => request<{ export: AdminExportJob & { content: string; contentType: string } }>('/api/admin/export-data', { method: 'POST', body: JSON.stringify(payload) }, token),
  importData: (
    token: string,
    payload: Record<string, unknown>
  ) => request<{ preview?: AdminImportJob; importJob?: AdminImportJob }>('/api/admin/import-data', { method: 'POST', body: JSON.stringify(payload) }, token),
  bulkOperation: (
    token: string,
    payload: Record<string, unknown>
  ) => request<{ job: AdminBulkJob }>('/api/admin/bulk-operation', { method: 'POST', body: JSON.stringify(payload) }, token),
  createApiKey: (token: string, name: string) => request<{ plainTextKey: string }>('/api/admin/create-api-key', { method: 'POST', body: JSON.stringify({ name }) }, token),
  revokeApiKey: (token: string, apiKeyId: string) => request('/api/admin/revoke-api-key', { method: 'POST', body: JSON.stringify({ apiKeyId }) }, token)
};
