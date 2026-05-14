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
  status: RideStatus;
  rating?: number;
  createdAt: string;
  updatedAt: string;
};

export type DriverProfile = {
  userId: string;
  status: 'pending' | 'approved' | 'rejected';
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
  amountCents: number;
  currency: string;
  status: 'requires_capture' | 'captured' | 'refunded';
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

export type Ticket = {
  id: string;
  userId: string;
  type: string;
  message: string;
  status: 'open' | 'in_review' | 'closed';
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
  kycStatus: Array<[string, 'pending' | 'verified' | 'rejected']>;
  tickets: Ticket[];
  safetyIncidents: any[];
  merchantProducts: MerchantProduct[];
  marketplaceDeliveries: MarketplaceDelivery[];
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
  kycStatus: new PersistentMap<string, 'pending' | 'verified' | 'rejected'>(),
  tickets: new PersistentMap<string, Ticket>(),
  safetyIncidents: createPersistentArray<any>(),
  merchantProducts: new PersistentMap<string, MerchantProduct>(),
  marketplaceDeliveries: new PersistentMap<string, MarketplaceDelivery>()
};

function toSerializableStore(): PersistedStore {
  return {
    users: Array.from(store.users.values()),
    refreshTokens: Array.from(store.refreshTokens.entries()),
    rides: Array.from(store.rides.values()),
    drivers: Array.from(store.drivers.values()),
    payments: Array.from(store.payments.values()),
    walletTx: [...store.walletTx],
    kycStatus: Array.from(store.kycStatus.entries()),
    tickets: Array.from(store.tickets.values()),
    safetyIncidents: [...store.safetyIncidents],
    merchantProducts: Array.from(store.merchantProducts.values()),
    marketplaceDeliveries: Array.from(store.marketplaceDeliveries.values())
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
    for (const [userId, status] of parsed.kycStatus || []) store.kycStatus.set(userId, status);
    for (const ticket of parsed.tickets || []) store.tickets.set(ticket.id, ticket);
    for (const incident of parsed.safetyIncidents || []) store.safetyIncidents.push(incident);
    for (const product of parsed.merchantProducts || []) store.merchantProducts.set(product.id, product);
    for (const delivery of parsed.marketplaceDeliveries || []) store.marketplaceDeliveries.set(delivery.id, delivery);
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
    createdAt: now()
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
  return store.walletTx.reduce((sum, tx) => {
    if (tx.userId !== userId) return sum;
    return tx.kind === 'credit' ? sum + tx.amountCents : sum - tx.amountCents;
  }, 0);
}

export function pushWalletTx(userId: string, kind: 'credit' | 'debit', amountCents: number, reason: string) {
  const tx = { id: makeId('wtx'), userId, kind, amountCents, reason, createdAt: now() };
  store.walletTx.push(tx);
  return tx;
}

export function timestamp() {
  return now();
}
