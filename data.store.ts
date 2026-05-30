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
  passengerRating?: number;
  passengerReview?: string;
  passengerRatedAt?: string;
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
  active?: boolean;
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

export type AdminApiKey = {
  id: string;
  name: string;
  keyPreview: string;
  keyHash: string;
  createdAt: string;
  lastUsedAt?: string;
  revokedAt?: string;
};

export type PlatformFeatureFlag = {
  key: string;
  label: string;
  enabled: boolean;
};

export type PlatformSettings = {
  maintenanceMode: boolean;
  appVersion: string;
  commissionRatePercent: number;
  surgeMultiplier: number;
  featureFlags: PlatformFeatureFlag[];
  updatedAt: string;
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

// ─── Scheduled Rides ────────────────────────────────────────────────────────

export type ScheduledRideStatus = 'scheduled' | 'dispatched' | 'completed' | 'canceled';

export type ScheduledRide = {
  id: string;
  riderId: string;
  pickupLat?: number;
  pickupLng?: number;
  dropoffLat?: number;
  dropoffLng?: number;
  pickupAddress?: string;
  dropoffAddress?: string;
  scheduledAt: string;
  status: ScheduledRideStatus;
  rideId?: string;
  reminderSentAt?: string;
  canceledAt?: string;
  cancellationReason?: string;
  createdAt: string;
  updatedAt: string;
};

// ─── Subscription Plans ──────────────────────────────────────────────────────

export type SubscriptionTier = 'basic' | 'premium' | 'unlimited';

export type SubscriptionPlan = {
  id: string;
  name: string;
  tier: SubscriptionTier;
  priceCents: number;
  billingCycleDays: number;
  ridesIncluded: number | 'unlimited';
  discountPercent: number;
  features: string[];
  active: boolean;
  createdAt: string;
};

export type UserSubscription = {
  id: string;
  userId: string;
  planId: string;
  tier: SubscriptionTier;
  status: 'active' | 'canceled' | 'expired' | 'past_due';
  ridesUsedThisCycle: number;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  canceledAt?: string;
  createdAt: string;
  updatedAt: string;
};

// ─── Loyalty Program ────────────────────────────────────────────────────────

export type LoyaltyTier = 'bronze' | 'silver' | 'gold' | 'platinum';

export type LoyaltyAccount = {
  userId: string;
  points: number;
  tier: LoyaltyTier;
  lifetimePoints: number;
  createdAt: string;
  updatedAt: string;
};

export type LoyaltyTransaction = {
  id: string;
  userId: string;
  points: number;
  type: 'earn' | 'redeem' | 'expire' | 'bonus';
  reason: string;
  rideId?: string;
  createdAt: string;
};

// ─── Corporate Accounts ──────────────────────────────────────────────────────

export type CorporateAccountStatus = 'active' | 'suspended' | 'pending';

export type CorporateAccount = {
  id: string;
  companyName: string;
  billingEmail: string;
  adminUserId: string;
  status: CorporateAccountStatus;
  creditLimitCents: number;
  usedCreditCents: number;
  invoiceCycleDays: number;
  allowedEmployeeIds: string[];
  createdAt: string;
  updatedAt: string;
};

export type CorporateRideTag = {
  rideId: string;
  corporateAccountId: string;
  employeeId: string;
  billableCents: number;
  invoiced: boolean;
  createdAt: string;
};

// ─── Carpooling ──────────────────────────────────────────────────────────────

export type CarpoolRideStatus = 'open' | 'full' | 'in_progress' | 'completed' | 'canceled';

export type CarpoolPassenger = {
  userId: string;
  pickupLat?: number;
  pickupLng?: number;
  dropoffLat?: number;
  dropoffLng?: number;
  fareShareCents: number;
  joinedAt: string;
};

export type CarpoolRide = {
  id: string;
  driverId?: string;
  maxPassengers: number;
  passengers: CarpoolPassenger[];
  routeStartLat?: number;
  routeStartLng?: number;
  routeEndLat?: number;
  routeEndLng?: number;
  status: CarpoolRideStatus;
  departsAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
};

// ─── Fraud Detection ────────────────────────────────────────────────────────

export type FraudRiskLevel = 'low' | 'medium' | 'high' | 'critical';

export type FraudAlert = {
  id: string;
  userId: string;
  rideId?: string;
  paymentId?: string;
  riskLevel: FraudRiskLevel;
  signals: string[];
  score: number;
  reviewed: boolean;
  reviewedBy?: string;
  reviewedAt?: string;
  action?: 'none' | 'warn' | 'suspend' | 'ban';
  createdAt: string;
};

// ─── Two-Factor Authentication ───────────────────────────────────────────────

export type TotpEntry = {
  userId: string;
  secret: string;
  enabled: boolean;
  verifiedAt?: string;
  backupCodes: string[];
  createdAt: string;
};

// ─── Notification Log ────────────────────────────────────────────────────────

export type NotificationChannel = 'sms' | 'email' | 'push';

export type NotificationLog = {
  id: string;
  userId?: string;
  channel: NotificationChannel;
  recipient: string;
  template: string;
  status: 'sent' | 'failed' | 'queued';
  provider: string;
  errorMessage?: string;
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
  adminApiKeys: AdminApiKey[];
  platformSettings: Array<[string, PlatformSettings]>;
  scheduledRides: ScheduledRide[];
  subscriptionPlans: Array<[string, SubscriptionPlan]>;
  userSubscriptions: Array<[string, UserSubscription]>;
  loyaltyAccounts: Array<[string, LoyaltyAccount]>;
  loyaltyTransactions: LoyaltyTransaction[];
  corporateAccounts: Array<[string, CorporateAccount]>;
  corporateRideTags: CorporateRideTag[];
  carpoolRides: Array<[string, CarpoolRide]>;
  fraudAlerts: FraudAlert[];
  totpEntries: Array<[string, TotpEntry]>;
  notificationLogs: NotificationLog[];
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
  markets: new PersistentMap<string, MarketConfig>(),
  adminApiKeys: createPersistentArray<AdminApiKey>(),
  platformSettings: new PersistentMap<string, PlatformSettings>(),
  scheduledRides: new PersistentMap<string, ScheduledRide>(),
  subscriptionPlans: new PersistentMap<string, SubscriptionPlan>(),
  userSubscriptions: new PersistentMap<string, UserSubscription>(),
  loyaltyAccounts: new PersistentMap<string, LoyaltyAccount>(),
  loyaltyTransactions: createPersistentArray<LoyaltyTransaction>(),
  corporateAccounts: new PersistentMap<string, CorporateAccount>(),
  corporateRideTags: createPersistentArray<CorporateRideTag>(),
  carpoolRides: new PersistentMap<string, CarpoolRide>(),
  fraudAlerts: createPersistentArray<FraudAlert>(),
  totpEntries: new PersistentMap<string, TotpEntry>(),
  notificationLogs: createPersistentArray<NotificationLog>()
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
    markets: Array.from(store.markets.entries()),
    adminApiKeys: [...store.adminApiKeys],
    platformSettings: Array.from(store.platformSettings.entries()),
    scheduledRides: Array.from(store.scheduledRides.values()),
    subscriptionPlans: Array.from(store.subscriptionPlans.entries()),
    userSubscriptions: Array.from(store.userSubscriptions.entries()),
    loyaltyAccounts: Array.from(store.loyaltyAccounts.entries()),
    loyaltyTransactions: [...store.loyaltyTransactions],
    corporateAccounts: Array.from(store.corporateAccounts.entries()),
    corporateRideTags: [...store.corporateRideTags],
    carpoolRides: Array.from(store.carpoolRides.entries()),
    fraudAlerts: [...store.fraudAlerts],
    totpEntries: Array.from(store.totpEntries.entries()),
    notificationLogs: [...store.notificationLogs]
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
    for (const apiKey of parsed.adminApiKeys || []) store.adminApiKeys.push(apiKey);
    for (const [key, settings] of parsed.platformSettings || []) store.platformSettings.set(key, settings);
    for (const ride of parsed.scheduledRides || []) store.scheduledRides.set(ride.id, ride);
    for (const [id, plan] of parsed.subscriptionPlans || []) store.subscriptionPlans.set(id, plan);
    for (const [id, sub] of parsed.userSubscriptions || []) store.userSubscriptions.set(id, sub);
    for (const [id, acct] of parsed.loyaltyAccounts || []) store.loyaltyAccounts.set(id, acct);
    for (const tx of parsed.loyaltyTransactions || []) store.loyaltyTransactions.push(tx);
    for (const [id, corp] of parsed.corporateAccounts || []) store.corporateAccounts.set(id, corp);
    for (const tag of parsed.corporateRideTags || []) store.corporateRideTags.push(tag);
    for (const [id, carpool] of parsed.carpoolRides || []) store.carpoolRides.set(id, carpool);
    for (const alert of parsed.fraudAlerts || []) store.fraudAlerts.push(alert);
    for (const [id, totp] of parsed.totpEntries || []) store.totpEntries.set(id, totp);
    for (const log of parsed.notificationLogs || []) store.notificationLogs.push(log);
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
    email: 'admin@drive.com',
    password: hashPassword(env.adminSeedPassword),
    role: 'admin',
    createdAt: timestamp()
  });
}

if (!store.platformSettings.get('global')) {
  store.platformSettings.set('global', {
    maintenanceMode: false,
    appVersion: '1.0.0',
    commissionRatePercent: 20,
    surgeMultiplier: 1,
    featureFlags: [
      { key: 'liveDispatchMap', label: 'Live dispatch map', enabled: true },
      { key: 'walletOps', label: 'Wallet operations', enabled: true },
      { key: 'safetyEscalations', label: 'Safety escalations', enabled: true },
      { key: 'reportExports', label: 'Report exports', enabled: true }
    ],
    updatedAt: timestamp()
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
  const promo = store.promos.get(code.toUpperCase());
  if (!promo || promo.active === false) return undefined;
  if (promo.expiresAt && new Date(promo.expiresAt).getTime() <= Date.now()) return undefined;
  return promo;
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

// ─── Loyalty helpers ────────────────────────────────────────────────────────

export function getLoyaltyTier(lifetimePoints: number): LoyaltyTier {
  if (lifetimePoints >= 10000) return 'platinum';
  if (lifetimePoints >= 3000) return 'gold';
  if (lifetimePoints >= 750) return 'silver';
  return 'bronze';
}

export function getOrCreateLoyaltyAccount(userId: string): LoyaltyAccount {
  const existing = store.loyaltyAccounts.get(userId);
  if (existing) return existing;
  const acct: LoyaltyAccount = {
    userId,
    points: 0,
    tier: 'bronze',
    lifetimePoints: 0,
    createdAt: now(),
    updatedAt: now()
  };
  store.loyaltyAccounts.set(userId, acct);
  return acct;
}

export function awardLoyaltyPoints(userId: string, points: number, reason: string, rideId?: string) {
  const acct = getOrCreateLoyaltyAccount(userId);
  acct.points += points;
  acct.lifetimePoints += points;
  acct.tier = getLoyaltyTier(acct.lifetimePoints);
  acct.updatedAt = now();
  store.loyaltyAccounts.set(userId, acct);

  const tx: LoyaltyTransaction = {
    id: makeId('ltx'),
    userId,
    points,
    type: 'earn',
    reason,
    rideId,
    createdAt: now()
  };
  store.loyaltyTransactions.push(tx);
  markStoreDirty();
  return tx;
}

// ─── Subscription helpers ────────────────────────────────────────────────────

export function getActiveSubscription(userId: string): UserSubscription | undefined {
  return Array.from(store.userSubscriptions.values()).find(
    s => s.userId === userId && s.status === 'active' && new Date(s.currentPeriodEnd).getTime() > Date.now()
  );
}

// ─── Corporate account helpers ────────────────────────────────────────────────

export function getCorporateAccountForEmployee(employeeId: string): CorporateAccount | undefined {
  return Array.from(store.corporateAccounts.values()).find(
    c => c.status === 'active' && c.allowedEmployeeIds.includes(employeeId)
  );
}
