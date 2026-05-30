export type UserRole = 'rider' | 'driver' | 'merchant' | 'admin';
export type ThemeMode = 'dark' | 'light';
export type TextScale = 'sm' | 'md' | 'lg';
export type LocaleCode = 'en' | 'es' | 'fr';
export type PortalSection = 'home' | 'auth' | 'book' | 'liveRide' | 'history' | 'rideDetail' | 'wallet' | 'promotions' | 'support' | 'account' | 'scheduled';

export type AuthUser = {
  id: string;
  role: UserRole;
  email?: string;
  phone?: string;
  createdAt?: string;
};

export type AuthSession = {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
};

export type ApiEnvelope<T> = {
  module?: string;
  action?: string;
  ok?: boolean;
  error?: string;
} & T;

export type RideEvent = {
  id: string;
  type: string;
  title: string;
  message: string;
  actorId?: string;
  actorRole?: string;
  createdAt: string;
  rideId?: string;
  rideStatus?: string;
};

export type RideSummary = {
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
  status: 'requested' | 'accepted' | 'started' | 'completed' | 'canceled';
  rating?: number;
  review?: string;
  events?: RideEvent[];
  latestEvent?: RideEvent | null;
  updatedAt: string;
  createdAt: string;
  availableActions?: {
    canCancel: boolean;
    canRate: boolean;
    canViewReceipt: boolean;
    canTrackDriver: boolean;
  };
};

export type RideReceipt = {
  receiptType: string;
  invoiceNumber: string;
  rideId: string;
  riderId: string;
  driverId?: string;
  status: string;
  currency: string;
  issuedAt: string;
  fareBreakdown: {
    currency: string;
    baseFare: number;
    distanceFare: number;
    timeFare: number;
    subtotal: number;
    fareEstimate: number;
    fareEstimateRange: { low: number; high: number };
  };
  surgeMultiplier: number;
  discountCents?: number;
  totalCents: number;
  paymentStatus: string;
  walletEntries: Array<{
    id: string;
    kind: 'credit' | 'debit';
    amountCents: number;
    reason: string;
    createdAt: string;
  }>;
  cancellationReason?: string;
};

export type WalletEntry = {
  id: string;
  kind: 'credit' | 'debit';
  amountCents: number;
  reason: string;
  createdAt: string;
};

export type PaymentMethod = {
  id: string;
  label: string;
  type: 'card' | 'wallet';
  detail: string;
  default?: boolean;
};

export type SavedAddress = {
  id: string;
  label: string;
  address: string;
  note?: string;
};

export type SupportTicket = {
  id: string;
  type: string;
  message: string;
  status: string;
  replies: Array<{
    id: string;
    authorRole: string;
    message: string;
    createdAt: string;
  }>;
  resolution?: string;
  createdAt: string;
  updatedAt: string;
};

export type AddressSuggestion = {
  id: string;
  title: string;
  subtitle: string;
  lat?: number;
  lng?: number;
};
