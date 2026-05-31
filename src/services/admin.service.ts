import { createHash, randomBytes } from 'crypto';
import {
  appendAuditLog,
  getActiveSurgeMultiplier,
  getWalletBalanceCents,
  listUsersByRole,
  makeId,
  markStoreDirty,
  store,
  timestamp,
  type AdminApiKey,
  type MarketConfig,
  type PlatformFeatureFlag,
  type PlatformSettings,
  type Promo,
  type User
} from '../database/data.store';

type SafeUser = Omit<User, 'password'> & { suspended?: boolean };
const MS_PER_HOUR = 3_600_000;
const API_KEY_RANDOM_BYTES = 18;

function sanitizeUser(user: (User & { suspended?: boolean }) | undefined): SafeUser | undefined {
  if (!user) return undefined;
  const { password, ...safe } = user;
  return safe;
}

function sanitizeApiKey(apiKey: AdminApiKey) {
  const { keyHash, ...safe } = apiKey;
  return safe;
}

function safeNumber(rawValue: unknown, fallback = 0) {
  const numeric = Number(rawValue);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function optionalNumber(value: any) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : undefined;
}

function dayKey(value?: string) {
  if (!value) return 'unknown';
  return value.slice(0, 10);
}

function monthKey(value?: string) {
  if (!value) return 'unknown';
  return value.slice(0, 7);
}

function weekKey(value?: string) {
  if (!value) return 'unknown';
  const date = new Date(value);
  const utc = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((utc.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${utc.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

function aggregateSeries<T>(
  items: T[],
  getDate: (item: T) => string | undefined,
  getValue: (item: T) => number,
  bucket: 'day' | 'week' | 'month',
  limit = 8
) {
  const map = new Map<string, number>();
  const keyFor = bucket === 'month' ? monthKey : bucket === 'week' ? weekKey : dayKey;
  for (const item of items) {
    const key = keyFor(getDate(item));
    map.set(key, (map.get(key) || 0) + getValue(item));
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-limit)
    .map(([label, value]) => ({ label, value }));
}

function getSettings() {
  return store.platformSettings.get('global') || {
    maintenanceMode: false,
    appVersion: '1.0.0',
    commissionRatePercent: 20,
    surgeMultiplier: getActiveSurgeMultiplier(),
    featureFlags: [],
    updatedAt: timestamp()
  };
}

function isFeatureFlag(value: unknown): value is Partial<PlatformFeatureFlag> {
  return Boolean(value) && typeof value === 'object';
}

function normalizeFeatureFlags(flags: unknown, fallback: PlatformFeatureFlag[]) {
  if (!Array.isArray(flags)) return fallback;
  return flags
    .filter(isFeatureFlag)
    .map(flag => ({
      key: String(flag.key || '').trim(),
      label: String(flag.label || flag.key || '').trim(),
      enabled: Boolean(flag.enabled)
    }))
    .filter(flag => flag.key && flag.label);
}

export async function drivers_pending(_body: any, _params?: any, _query?: any) {
  const pending = Array.from(store.drivers.values()).filter(d => d.status === 'pending');
  return { module: 'admin', action: 'drivers-pending', ok: true, pending };
}

export async function approve_driver(body: any, _params?: any, _query?: any) {
  const profile = store.drivers.get(body?.userId);
  if (!profile) return { module: 'admin', action: 'approve-driver', error: 'driver profile not found' };
  const newStatus = body?.approved === false ? 'rejected' : 'approved';
  profile.status = newStatus;
  if (newStatus === 'rejected') {
    profile.verificationState = 'rejected';
    profile.availabilityStatus = 'unavailable';
    profile.available = false;
  } else {
    profile.verificationState = 'verified';
    if (!profile.availabilityStatus || profile.availabilityStatus === 'unavailable') profile.availabilityStatus = 'offline';
    profile.available = profile.availabilityStatus === 'online';
  }
  markStoreDirty();
  const actor = body?.__actor;
  if (actor) {
    appendAuditLog(actor.sub || actor.id, actor.role, `driver_${newStatus}`, body.userId, 'driver', { approved: body?.approved });
  }
  return { module: 'admin', action: 'approve-driver', ok: true, profile };
}

export async function live_rides(_body: any, _params?: any, _query?: any) {
  const live = Array.from(store.rides.values()).filter(r => r.status === 'requested' || r.status === 'accepted' || r.status === 'started');
  return { module: 'admin', action: 'live-rides', ok: true, live };
}

export async function risk_alerts(_body: any, _params?: any, _query?: any) {
  const alerts = store.safetyIncidents.slice(-50);
  return { module: 'admin', action: 'risk-alerts', ok: true, alerts };
}

export async function refunds(_body: any, _params?: any, _query?: any) {
  const refunds = Array.from(store.payments.values()).filter(p => p.status === 'refunded');
  return { module: 'admin', action: 'refunds', ok: true, refunds, riders: listUsersByRole('rider').map(sanitizeUser) };
}

export async function platform_stats(_body: any, _params?: any, _query?: any) {
  const users = Array.from(store.users.values());
  const rides = Array.from(store.rides.values());
  const payments = Array.from(store.payments.values());
  const totalRevenueCents = payments.filter(p => p.status === 'captured').reduce((s, p) => s + p.amountCents, 0);
  return {
    module: 'admin',
    action: 'platform-stats',
    ok: true,
    stats: {
      totalUsers: users.length,
      riders: users.filter(u => u.role === 'rider').length,
      drivers: users.filter(u => u.role === 'driver').length,
      merchants: users.filter(u => u.role === 'merchant').length,
      totalRides: rides.length,
      activeRides: rides.filter(r => ['requested', 'accepted', 'started'].includes(r.status)).length,
      completedRides: rides.filter(r => r.status === 'completed').length,
      totalPayments: payments.length,
      totalRevenueCents,
      openTickets: Array.from(store.tickets.values()).filter(t => t.status === 'open').length,
      openIncidents: store.safetyIncidents.filter(i => i.status === 'open' || i.status === 'under_review').length,
      pendingDrivers: Array.from(store.drivers.values()).filter(d => d.status === 'pending').length
    }
  };
}

export async function admin_overview(_body: any, _params?: any, _query?: any) {
  const statsResponse = await platform_stats({}, _params, _query);
  const stats = statsResponse.stats;
  const users = Array.from(store.users.values()).map(sanitizeUser);
  const usersById = new Map(users.map(user => [user.id, user]));
  const rides = Array.from(store.rides.values()).sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  const tickets = Array.from(store.tickets.values()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const incidents = [...store.safetyIncidents].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  const payments = Array.from(store.payments.values()).sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  const walletLedger = [...store.walletTx].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const drivers = Array.from(store.drivers.values())
    .map(profile => {
      const driverRides = rides.filter(ride => ride.driverId === profile.userId);
      const completedTrips = driverRides.filter(ride => ride.status === 'completed').length;
      const activeRide = driverRides.find(ride => ['requested', 'accepted', 'started'].includes(ride.status));
      const incidentsCount = incidents.filter(incident => incident.userId === profile.userId).length;
      return {
        ...profile,
        user: usersById.get(profile.userId),
        tripCount: driverRides.length,
        completedTrips,
        activeRideId: activeRide?.id,
        incidentsCount,
        walletBalanceCents: getWalletBalanceCents(profile.userId)
      };
    })
    .sort((a, b) => (b.earningsCents || 0) - (a.earningsCents || 0));

  const riders = users
    .filter(user => user.role === 'rider')
    .map(user => {
      const riderRides = rides.filter(ride => ride.riderId === user.id);
      const spendingCents = payments
        .filter(payment => payment.riderId === user.id && payment.status === 'captured')
        .reduce((sum, payment) => sum + payment.amountCents, 0);
      return {
        user,
        tripCount: riderRides.length,
        completedTrips: riderRides.filter(ride => ride.status === 'completed').length,
        activeTrips: riderRides.filter(ride => ['requested', 'accepted', 'started'].includes(ride.status)).length,
        spendingCents,
        retentionScore: riderRides.length ? Math.min(100, 50 + riderRides.length * 5) : 0
      };
    })
    .sort((a, b) => b.spendingCents - a.spendingCents);

  const ticketsWithUsers = tickets.map(ticket => ({ ...ticket, user: usersById.get(ticket.userId) }));
  const incidentsWithUsers = incidents.map(incident => ({ ...incident, user: incident.userId ? usersById.get(incident.userId) : undefined }));

  const closedTickets = tickets.filter(ticket => ticket.status === 'closed');
  const avgResolutionHours = closedTickets.length
    ? Number(
        (
          closedTickets.reduce((sum, ticket) => {
            const created = new Date(ticket.createdAt).getTime();
            const updated = new Date(ticket.updatedAt).getTime();
            return sum + Math.max(0, updated - created);
          }, 0) /
          closedTickets.length /
          MS_PER_HOUR
        ).toFixed(1)
      )
    : 0;

  return {
    module: 'admin',
    action: 'overview',
    ok: true,
    stats,
    realtime: {
      activeDrivers: drivers.filter(driver => driver.availabilityStatus === 'online' || driver.availabilityStatus === 'assigned').length,
      activeRides: rides.filter(ride => ['requested', 'accepted', 'started'].includes(ride.status)).length,
      highPriorityIncidents: incidents.filter(incident => incident.level === 'high' && incident.status !== 'resolved').length,
      newTickets: tickets.filter(ticket => ticket.status === 'open').length
    },
    settings: getSettings(),
    drivers,
    riders,
    users,
    rides,
    tickets: ticketsWithUsers,
    incidents: incidentsWithUsers,
    payments,
    refunds: payments.filter(payment => payment.status === 'refunded'),
    walletLedger,
    walletBalances: users.map(user => ({ userId: user.id, balanceCents: getWalletBalanceCents(user.id) })),
    promos: Array.from(store.promos.values()).sort((a, b) => a.code.localeCompare(b.code)),
    markets: Array.from(store.markets.values()).sort((a, b) => a.city.localeCompare(b.city)),
    referralEvents: [...store.referralEvents].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    apiKeys: store.adminApiKeys.map(sanitizeApiKey).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    auditLogs: [...store.auditLogs].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 100),
    analytics: {
      revenueByDay: aggregateSeries(payments.filter(payment => payment.status === 'captured'), payment => payment.capturedAt || payment.createdAt, payment => payment.amountCents, 'day'),
      revenueByWeek: aggregateSeries(payments.filter(payment => payment.status === 'captured'), payment => payment.capturedAt || payment.createdAt, payment => payment.amountCents, 'week'),
      revenueByMonth: aggregateSeries(payments.filter(payment => payment.status === 'captured'), payment => payment.capturedAt || payment.createdAt, payment => payment.amountCents, 'month'),
      tripVolumeByDay: aggregateSeries(rides, ride => ride.createdAt, () => 1, 'day'),
      userGrowthByDay: aggregateSeries(Array.from(store.users.values()), user => user.createdAt, () => 1, 'day'),
      driverLeaderboard: drivers.slice(0, 5).map(driver => ({
        driverId: driver.userId,
        name: driver.user?.email || driver.userId,
        earningsCents: driver.earningsCents,
        rating: driver.rating,
        tripCount: driver.tripCount
      })),
      riderLeaderboard: riders.slice(0, 5).map(rider => ({
        riderId: rider.user.id,
        name: rider.user.email || rider.user.id,
        spendingCents: rider.spendingCents,
        tripCount: rider.tripCount,
        retentionScore: rider.retentionScore
      })),
      support: {
        open: tickets.filter(ticket => ticket.status === 'open').length,
        pending: tickets.filter(ticket => ticket.status === 'in_review').length,
        resolved: closedTickets.length,
        avgResolutionHours,
        satisfactionScore: closedTickets.length ? Number(Math.min(99, 84 + closedTickets.length).toFixed(1)) : 0
      },
      safety: {
        open: incidents.filter(incident => incident.status === 'open').length,
        underReview: incidents.filter(incident => incident.status === 'under_review').length,
        resolved: incidents.filter(incident => incident.status === 'resolved').length,
        dismissed: incidents.filter(incident => incident.status === 'dismissed').length
      },
      finance: {
        capturedRevenueCents: payments.filter(payment => payment.status === 'captured').reduce((sum, payment) => sum + payment.amountCents, 0),
        pendingSettlementCents: payments.filter(payment => payment.status === 'requires_capture').reduce((sum, payment) => sum + payment.amountCents, 0),
        refundedCents: payments.filter(payment => payment.status === 'refunded').reduce((sum, payment) => sum + payment.amountCents, 0),
        walletExposureCents: users.reduce((sum, user) => sum + getWalletBalanceCents(user.id), 0)
      }
    }
  };
}

export async function list_users(body: any, _params?: any, _query?: any) {
  const role = body?.role;
  const users = role ? listUsersByRole(role) : Array.from(store.users.values());
  const safeUsers = users.map(sanitizeUser);
  return { module: 'admin', action: 'list-users', ok: true, users: safeUsers };
}

export async function suspend_user(body: any, _params?: any, _query?: any) {
  const user = store.users.get(body?.userId);
  if (!user) return { module: 'admin', action: 'suspend-user', error: 'user not found' };
  const suspend = body?.suspend !== false;
  (user as any).suspended = suspend;
  markStoreDirty();
  const actor = body?.__actor;
  if (actor) {
    appendAuditLog(actor.sub || actor.id, actor.role, suspend ? 'user_suspended' : 'user_unsuspended', body.userId, 'user', { suspend });
  }
  return { module: 'admin', action: 'suspend-user', ok: true, userId: body.userId, suspended: suspend };
}

export async function update_ticket(body: any, _params?: any, _query?: any) {
  const ticket = store.tickets.get(body?.ticketId);
  if (!ticket) return { module: 'admin', action: 'update-ticket', error: 'ticket not found' };
  const allowedStatuses = ['open', 'in_review', 'closed'] as const;
  if (body?.status && allowedStatuses.includes(body.status)) {
    ticket.status = body.status;
    ticket.updatedAt = timestamp();
    if (body?.resolution) ticket.resolution = body.resolution;
  }
  markStoreDirty();
  const actor = body?.__actor;
  if (actor) {
    appendAuditLog(actor.sub || actor.id, actor.role, 'ticket_updated', ticket.id, 'ticket', { status: ticket.status });
  }
  return { module: 'admin', action: 'update-ticket', ok: true, ticket };
}

export async function audit_log(body: any, _params?: any, _query?: any) {
  const limit = Math.min(Number(body?.limit) || 100, 500);
  const logs = store.auditLogs.slice(-limit).reverse();
  return { module: 'admin', action: 'audit-log', ok: true, logs };
}

export async function update_settings(body: any, _params?: any, _query?: any) {
  const current = getSettings();
  const settings: PlatformSettings = {
    maintenanceMode: typeof body?.maintenanceMode === 'boolean' ? body.maintenanceMode : current.maintenanceMode,
    appVersion: typeof body?.appVersion === 'string' && body.appVersion.trim() ? body.appVersion.trim() : current.appVersion,
    commissionRatePercent: safeNumber(body?.commissionRatePercent, current.commissionRatePercent),
    surgeMultiplier: safeNumber(body?.surgeMultiplier, current.surgeMultiplier),
    featureFlags: normalizeFeatureFlags(body?.featureFlags, current.featureFlags),
    updatedAt: timestamp()
  };
  store.platformSettings.set('global', settings);
  store.surgeConfig.set('global', {
    multiplier: settings.surgeMultiplier,
    reason: 'admin_update',
    updatedAt: settings.updatedAt
  });
  const actor = body?.__actor;
  if (actor) {
    appendAuditLog(actor.sub || actor.id, actor.role, 'settings_updated', 'global', 'platform_settings', {
      maintenanceMode: settings.maintenanceMode,
      commissionRatePercent: settings.commissionRatePercent,
      surgeMultiplier: settings.surgeMultiplier
    });
  }
  return { module: 'admin', action: 'update-settings', ok: true, settings };
}

export async function upsert_promo(body: any, _params?: any, _query?: any) {
  const code = String(body?.code || '').trim().toUpperCase();
  if (!code) return { module: 'admin', action: 'upsert-promo', error: 'promo code is required' };
  const existing = store.promos.get(code);
  const promo: Promo = {
    id: existing?.id || makeId('promo'),
    code,
    discountType: body?.discountType === 'percent' ? 'percent' : 'flat',
    discountValue: Math.max(0, safeNumber(body?.discountValue, existing?.discountValue || 0)),
    active: body?.active !== false,
    minFareCents: optionalNumber(body?.minFareCents) ?? existing?.minFareCents,
    maxUsages: optionalNumber(body?.maxUsages) ?? existing?.maxUsages,
    usageCount: existing?.usageCount || 0,
    expiresAt: typeof body?.expiresAt === 'string' && body.expiresAt ? body.expiresAt : existing?.expiresAt,
    createdAt: existing?.createdAt || timestamp()
  };
  store.promos.set(code, promo);
  const actor = body?.__actor;
  if (actor) {
    appendAuditLog(actor.sub || actor.id, actor.role, existing ? 'promo_updated' : 'promo_created', promo.id, 'promo', { code: promo.code });
  }
  return { module: 'admin', action: 'upsert-promo', ok: true, promo };
}

export async function upsert_market(body: any, _params?: any, _query?: any) {
  const marketId = String(body?.id || '').trim();
  const existing = marketId ? store.markets.get(marketId) : undefined;
  const market: MarketConfig = {
    id: existing?.id || makeId('market'),
    name: typeof body?.name === 'string' && body.name.trim() ? body.name.trim() : existing?.name || 'New market',
    city: typeof body?.city === 'string' && body.city.trim() ? body.city.trim() : existing?.city || 'Unknown city',
    country: typeof body?.country === 'string' && body.country.trim() ? body.country.trim() : existing?.country || 'Unknown country',
    status: ['pre_launch', 'active', 'paused', 'sunset'].includes(body?.status) ? body.status : existing?.status || 'pre_launch',
    launchedAt: typeof body?.launchedAt === 'string' && body.launchedAt ? body.launchedAt : existing?.launchedAt,
    createdAt: existing?.createdAt || timestamp(),
    updatedAt: timestamp()
  };
  store.markets.set(market.id, market);
  const actor = body?.__actor;
  if (actor) {
    appendAuditLog(actor.sub || actor.id, actor.role, existing ? 'market_updated' : 'market_created', market.id, 'market', {
      city: market.city,
      status: market.status
    });
  }
  return { module: 'admin', action: 'upsert-market', ok: true, market };
}

export async function create_api_key(body: any, _params?: any, _query?: any) {
  const name = String(body?.name || '').trim();
  if (!name) return { module: 'admin', action: 'create-api-key', error: 'api key name is required' };
  const plainTextKey = `drv_admin_${randomBytes(API_KEY_RANDOM_BYTES).toString('hex')}`;
  const apiKey: AdminApiKey = {
    id: makeId('key'),
    name,
    keyPreview: `${plainTextKey.slice(0, 12)}…${plainTextKey.slice(-4)}`,
    keyHash: createHash('sha256').update(plainTextKey).digest('hex'),
    createdAt: timestamp()
  };
  store.adminApiKeys.push(apiKey);
  const actor = body?.__actor;
  if (actor) {
    appendAuditLog(actor.sub || actor.id, actor.role, 'api_key_created', apiKey.id, 'api_key', { name });
  }
  return { module: 'admin', action: 'create-api-key', ok: true, apiKey: sanitizeApiKey(apiKey), plainTextKey };
}

export async function revoke_api_key(body: any, _params?: any, _query?: any) {
  const apiKey = store.adminApiKeys.find(key => key.id === body?.apiKeyId);
  if (!apiKey) return { module: 'admin', action: 'revoke-api-key', error: 'api key not found' };
  apiKey.revokedAt = timestamp();
  markStoreDirty();
  const actor = body?.__actor;
  if (actor) {
    appendAuditLog(actor.sub || actor.id, actor.role, 'api_key_revoked', apiKey.id, 'api_key', { name: apiKey.name });
  }
  return { module: 'admin', action: 'revoke-api-key', ok: true, apiKey: sanitizeApiKey(apiKey) };
}
