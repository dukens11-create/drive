import { randomBytes, randomUUID, scryptSync } from 'crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { env } from './env';

export type Role = 'rider' | 'driver' | 'merchant' | 'admin';

export type User = {
  id: string;
  email?: string;
  phone?: string;
  password: string;
  role: Role;
  createdAt: string;
};

export type RideStatus = 'requested' | 'accepted' | 'started' | 'completed' | 'canceled';

export type RideEvent = {
  id: string;
  type: string;
  title: string;
  message: string;
  actorId?: string;
  actorRole?: string;
  createdAt: string;
};

export type Ride = {
  id: string;
  riderId: string;
  driverId?: string;
  pickupLat?: number;
  pickupLng?: number;
  dropoffLat?: number;
  dropoffLng?: number;
  miles: number;
  minutes: number;
  fareEstimate: number;
  surgeMultiplier?: number;
  promoId?: string;
  discountCents?: number;
  status: RideStatus;
  rating?: number;
  review?: string;
  ratedAt?: string;
  canceledAt?: string;
  cancellationReason?: string;
  events?: RideEvent[];
  createdAt: string;
  updatedAt: string;
};

export type SurgeConfig = {
  multiplier: number;
  reason?: string;
  updatedAt: string;
};

export type Promo = {
  id: string;
  code: string;
  discountType: 'flat' | 'percent';
  discountValue: number;
  minFareCents?: number;
  maxUsages?: number;
  usageCount: number;
  expiresAt?: string;
  createdAt: string;
};

export type ReferralCode = {
  code: string;
  userId: string;
  createdAt: string;
};

export type ReferralEvent = {
  id: string;
  referrerUserId: string;
  referredUserId: string;
  bonusCents: number;
  paid: boolean;
  rideId?: string;
  createdAt: string;
};

export type MarketConfig = {
  id: string;
  name: string;
  city: string;
  country: string;
  status: 'pre_launch' | 'active' | 'paused' | 'sunset';
  launchedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type DriverProfile = {
  userId: string;
  status: 'pending' | 'approved' | 'rejected';
  verificationState: 'documents_pending' | 'kyc_pending' | 'verified' | 'rejected';
  availabilityStatus: 'offline' | 'online' | 'assigned' | 'unavailable';
  available: boolean;
  lat?: number;
  lng?: number;
  rating: number;
  acceptanceRate: number;
  cancellationRate: number;
  earningsCents: number;
  documents: string[];
};

export type Payment = {
  id: string;
  rideId?: string;
  riderId?: string;
  driverId?: string;
  provider: 'stripe_mock';
  providerIntentId: string;
  providerCheckoutSessionId: string;
  clientSecret: string;
  amountCents: number;
  currency: string;
  status: 'requires_capture' | 'captured' | 'refunded' | 'failed';
  capturedAt?: string;
  refundedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type WalletTx = {
  id: string;
  userId: string;
  kind: 'credit' | 'debit';
  amountCents: number;
  reason: string;
  createdAt: string;
};

export type TicketReply = {
  id: string;
  ticketId: string;
  authorId: string;
  authorRole: string;
  message: string;
  createdAt: string;
};
export type WalletBalance = {
  userId: string;
  balanceCents: number;
  updatedAt: string;
};

export type Ticket = {
  id: string;
  userId: string;
  type: string;
  message: string;
  status: 'open' | 'in_review' | 'closed';
  resolution?: string;
  replies: TicketReply[];
  createdAt: string;
  updatedAt: string;
};

export type SafetyIncidentStatus = 'open' | 'under_review' | 'resolved' | 'dismissed';

export type SafetyIncident = {
  id: string;
  userId?: string;
  rideId?: string;
  type: string;
  details?: string;
  lat?: number;
  lng?: number;
  level?: string;
  status: SafetyIncidentStatus;
  resolvedAt?: string;
  resolvedBy?: string;
  createdAt: string;
};

export type AuditLog = {
  id: string;
  actorId: string;
  actorRole: string;
  action: string;
  targetId?: string;
  targetType?: string;
  details?: Record<string, unknown>;
  createdAt: string;
};

export type MerchantProduct = {
  id: string;
  merchantId: string;
  name: string;
  priceCents: number;
  inStock: boolean;
  createdAt: string;
};

export type MarketplaceDelivery = {
  id: string;
  orderId: string;
  status: 'requested' | 'assigned' | 'delivered';
  etaMinutes: number;
  createdAt: string;
};

const now = () => new Date().toISOString();

export function makeId(prefix: string) {
  return `${prefix}_${randomUUID().replace(/-/g, '').slice(0, 12)}`;
}

function hashPassword(password: string) {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

type PersistedStore = {
  users: User[];
  refreshTokens: Array<[string, { userId: string; expiresAt: string }]>;
  rides: Ride[];
  drivers: DriverProfile[];
  payments: Payment[];
  walletTx: WalletTx[];
  walletBalances: WalletBalance[];
  kycStatus: Array<[string, 'pending' | 'verified' | 'rejected']>;
  tickets: Ticket[];
  safetyIncidents: SafetyIncident[];
  merchantProducts: MerchantProduct[];
  marketplaceDeliveries: MarketplaceDelivery[];
  auditLogs: AuditLog[];
  surgeConfig: Array<[string, SurgeConfig]>;
  promos: Array<[string, Promo]>;
  referralCodes: Array<[string, ReferralCode]>;
  referralEvents: ReferralEvent[];
  markets: Array<[string, MarketConfig]>;
};

let isHydrating = false;
let persistQueued = false;
let lastSerializedStore = '';
const MUTATING_ARRAY_METHODS = ['copyWithin', 'fill', 'pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'] as const;

function queuePersist() {
  if (env.dataStoreMode !== 'file' || isHydrating || persistQueued) return;
  persistQueued = true;
  const timer = setTimeout(() => {
    persistQueued = false;
    persistStore();
  }, 250);
  timer.unref();
}

class PersistentMap<K, V> extends Map<K, V> {
  override set(key: K, value: V) {
    const result = super.set(key, value);
    queuePersist();
    return result;
  }

  override delete(key: K) {
    const result = super.delete(key);
    if (result) queuePersist();
    return result;
  }

  override clear() {
    if (this.size > 0) {
      super.clear();
      queuePersist();
      return;
    }
    super.clear();
  }
}

function createPersistentArray<T>() {
  const target: T[] = [];
  return new Proxy(target, {
    get(arr, prop, receiver) {
      if (typeof prop === 'string' && MUTATING_ARRAY_METHODS.includes(prop as any)) {
        return (...args: any[]) => {
          const result = (Array.prototype as any)[prop].apply(arr, args);
          queuePersist();
          return result;
        };
      }
      return Reflect.get(arr, prop, receiver);
    },
    set(arr, prop, value, receiver) {
      const result = Reflect.set(arr, prop, value, receiver);
      // Skip direct "length" updates because mutating methods already queue persistence.
      if (prop !== 'length') queuePersist();
      return result;
    }
  }) as T[];
}

export const store = {
  users: new PersistentMap<string, User>(),
  refreshTokens: new PersistentMap<string, { userId: string; expiresAt: string }>(),
  rides: new PersistentMap<string, Ride>(),
  drivers: new PersistentMap<string, DriverProfile>(),
  payments: new PersistentMap<string, Payment>(),
  walletTx: createPersistentArray<WalletTx>(),
  walletBalances: new PersistentMap<string, WalletBalance>(),
  kycStatus: new PersistentMap<string, 'pending' | 'verified' | 'rejected'>(),
  tickets: new PersistentMap<string, Ticket>(),
  safetyIncidents: createPersistentArray<SafetyIncident>(),
  merchantProducts: new PersistentMap<string, MerchantProduct>(),
  marketplaceDeliveries: new PersistentMap<string, MarketplaceDelivery>(),
  auditLogs: createPersistentArray<AuditLog>(),
  surgeConfig: new PersistentMap<string, SurgeConfig>(),
  promos: new PersistentMap<string, Promo>(),
  referralCodes: new PersistentMap<string, ReferralCode>(),
  referralEvents: createPersistentArray<ReferralEvent>(),
  markets: new PersistentMap<string, MarketConfig>()
};

function toSerializableStore(): PersistedStore {
  return {
    users: Array.from(store.users.values()),
    refreshTokens: Array.from(store.refreshTokens.entries()),
    rides: Array.from(store.rides.values()),
    drivers: Array.from(store.drivers.values()),
    payments: Array.from(store.payments.values()),
    walletTx: [...store.walletTx],
    walletBalances: Array.from(store.walletBalances.values()),
    kycStatus: Array.from(store.kycStatus.entries()),
    tickets: Array.from(store.tickets.values()),
    safetyIncidents: [...store.safetyIncidents],
    merchantProducts: Array.from(store.merchantProducts.values()),
    marketplaceDeliveries: Array.from(store.marketplaceDeliveries.values()),
    auditLogs: [...store.auditLogs],
    surgeConfig: Array.from(store.surgeConfig.entries()),
    promos: Array.from(store.promos.entries()),
    referralCodes: Array.from(store.referralCodes.entries()),
    referralEvents: [...store.referralEvents],
    markets: Array.from(store.markets.entries())
  };
}

function persistStore() {
  if (env.dataStoreMode !== 'file') return;
  const payload = JSON.stringify(toSerializableStore(), null, 2);
  if (payload === lastSerializedStore) return;
  const resolvedPath = path.resolve(env.dataStoreFile);
  mkdirSync(path.dirname(resolvedPath), { recursive: true });
  writeFileSync(resolvedPath, payload, 'utf8');
  lastSerializedStore = payload;
}

function hydrateStore() {
  if (env.dataStoreMode !== 'file') return;
  const resolvedPath = path.resolve(env.dataStoreFile);
  if (!existsSync(resolvedPath)) return;
  const raw = readFileSync(resolvedPath, 'utf8');
  if (!raw.trim()) return;
  const parsed = JSON.parse(raw) as Partial<PersistedStore>;

  isHydrating = true;
  try {
    for (const user of parsed.users || []) store.users.set(user.id, user);
    for (const [tokenHash, refreshToken] of parsed.refreshTokens || []) {
      if (typeof refreshToken === 'string') {
        store.refreshTokens.set(tokenHash, {
          userId: refreshToken,
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString()
        });
        continue;
      }
      if (refreshToken?.userId && refreshToken?.expiresAt) {
        store.refreshTokens.set(tokenHash, refreshToken);
      }
    }
    for (const ride of parsed.rides || []) store.rides.set(ride.id, ride);
    for (const driver of parsed.drivers || []) store.drivers.set(driver.userId, driver);
    for (const payment of parsed.payments || []) store.payments.set(payment.id, payment);
    for (const tx of parsed.walletTx || []) store.walletTx.push(tx);
    for (const walletBalance of parsed.walletBalances || []) store.walletBalances.set(walletBalance.userId, walletBalance);
    for (const [userId, status] of parsed.kycStatus || []) store.kycStatus.set(userId, status);
    for (const ticket of parsed.tickets || []) store.tickets.set(ticket.id, ticket);
    for (const incident of parsed.safetyIncidents || []) store.safetyIncidents.push(incident);
    for (const product of parsed.merchantProducts || []) store.merchantProducts.set(product.id, product);
    for (const delivery of parsed.marketplaceDeliveries || []) store.marketplaceDeliveries.set(delivery.id, delivery);
    for (const log of parsed.auditLogs || []) store.auditLogs.push(log);
    for (const [key, cfg] of parsed.surgeConfig || []) store.surgeConfig.set(key, cfg);
    for (const [code, promo] of parsed.promos || []) store.promos.set(code, promo);
    for (const [code, ref] of parsed.referralCodes || []) store.referralCodes.set(code, ref);
    for (const ev of parsed.referralEvents || []) store.referralEvents.push(ev);
    for (const [id, market] of parsed.markets || []) store.markets.set(id, market);
  } finally {
    isHydrating = false;
  }

  lastSerializedStore = JSON.stringify(toSerializableStore(), null, 2);
}

hydrateStore();

const hasAdmin = Array.from(store.users.values()).some(user => user.role === 'admin');
if (!hasAdmin) {
  const adminId = makeId('user');
  store.users.set(adminId, {
    id: adminId,
    email: 'admin@flupflap.com',
    password: hashPassword(env.adminSeedPassword),
    role: 'admin',
    createdAt: timestamp()
  });
}

export function markStoreDirty() {
  queuePersist();
}

if (env.dataStoreMode === 'file') {
  process.once('beforeExit', persistStore);
  process.once('SIGINT', persistStore);
  process.once('SIGTERM', persistStore);
}

export function listUsersByRole(role: Role) {
  return Array.from(store.users.values()).filter(u => u.role === role);
}

export function getWalletBalanceCents(userId: string) {
  const cached = store.walletBalances.get(userId);
  if (cached) return cached.balanceCents;
  const computed = store.walletTx.reduce((sum, tx) => {
    if (tx.userId !== userId) return sum;
    return tx.kind === 'credit' ? sum + tx.amountCents : sum - tx.amountCents;
  }, 0);
  store.walletBalances.set(userId, { userId, balanceCents: computed, updatedAt: now() });
  return computed;
}

export function appendAuditLog(
  actorId: string,
  actorRole: string,
  action: string,
  targetId?: string,
  targetType?: string,
  details?: Record<string, unknown>
) {
  const entry: AuditLog = {
    id: makeId('audit'),
    actorId,
    actorRole,
    action,
    targetId,
    targetType,
    details,
    createdAt: now()
  };
  store.auditLogs.push(entry);
  return entry;
}

export function pushWalletTx(userId: string, kind: 'credit' | 'debit', amountCents: number, reason: string) {
  const tx = { id: makeId('wtx'), userId, kind, amountCents, reason, createdAt: now() };
  store.walletTx.push(tx);
  const prior = store.walletBalances.get(userId)?.balanceCents || 0;
  const next = kind === 'credit' ? prior + amountCents : prior - amountCents;
  store.walletBalances.set(userId, { userId, balanceCents: next, updatedAt: now() });
  return tx;
}

export function getActiveSurgeMultiplier(): number {
  const cfg = store.surgeConfig.get('global');
  if (!cfg) return 1.0;
  return cfg.multiplier;
}

export function getPromoByCode(code: string): Promo | undefined {
  return store.promos.get(code.toUpperCase());
}

export function hasUserUsedPromo(userId: string, promoId: string): boolean {
  return Array.from(store.rides.values()).some(r => r.riderId === userId && r.promoId === promoId);
}

export function getPendingReferralEvent(referredUserId: string): ReferralEvent | undefined {
  return store.referralEvents.find(ev => ev.referredUserId === referredUserId && !ev.paid);
}

export function countCompletedRidesForRider(riderId: string): number {
  return Array.from(store.rides.values()).filter(r => r.riderId === riderId && r.status === 'completed').length;
}

export function timestamp() {
  return now();
}
