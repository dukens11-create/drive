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
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export const store = {
  users: new Map<string, User>(),
  refreshTokens: new Map<string, string>(),
  rides: new Map<string, Ride>(),
  drivers: new Map<string, DriverProfile>(),
  payments: new Map<string, Payment>(),
  walletTx: [] as WalletTx[],
  kycStatus: new Map<string, 'pending' | 'verified' | 'rejected'>(),
  tickets: new Map<string, Ticket>(),
  safetyIncidents: [] as any[],
  merchantProducts: new Map<string, MerchantProduct>(),
  marketplaceDeliveries: new Map<string, MarketplaceDelivery>()
};

const adminId = makeId('user');
store.users.set(adminId, {
  id: adminId,
  email: 'admin@flupflap.com',
  password: 'admin123',
  role: 'admin',
  createdAt: now()
});

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
