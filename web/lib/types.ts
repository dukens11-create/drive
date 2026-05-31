export type UserRole = 'rider' | 'driver' | 'merchant' | 'admin';
export type ThemeMode = 'dark' | 'light';
export type TextScale = 'sm' | 'md' | 'lg';
export type LocaleCode = 'en' | 'es' | 'fr';
export type PortalSection = 'home' | 'auth' | 'book' | 'liveRide' | 'history' | 'rideDetail' | 'wallet' | 'promotions' | 'support' | 'account' | 'scheduled' | 'food' | 'foodCart' | 'foodOrderLive' | 'foodOrders';

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

export type Restaurant = {
  id: string;
  name: string;
  imageUrl?: string;
  cuisine: string[];
  rating: number;
  reviewCount: number;
  deliveryTimeMins: number;
  deliveryFeeCents: number;
  minimumOrderCents: number;
  open: boolean;
  distanceMiles: number;
  priceRange: 1 | 2 | 3;
  description?: string;
};

export type MenuCategory = {
  id: string;
  name: string;
  description?: string;
  items: MenuItem[];
};

export type MenuItem = {
  id: string;
  restaurantId: string;
  categoryId: string;
  name: string;
  description: string;
  priceCents: number;
  imageUrl?: string;
  available: boolean;
  popular?: boolean;
  allergens?: string[];
  calories?: number;
  customizations?: MenuItemCustomization[];
};

export type MenuItemCustomization = {
  id: string;
  label: string;
  required: boolean;
  multiSelect: boolean;
  options: Array<{ id: string; label: string; priceCents: number }>;
};

export type CartItem = {
  menuItemId: string;
  restaurantId: string;
  name: string;
  priceCents: number;
  quantity: number;
  selectedOptions?: Array<{ customizationId: string; optionId: string; label: string; priceCents: number }>;
  specialInstructions?: string;
};

export type FoodOrderStatus =
  | 'placed'
  | 'restaurant_confirmed'
  | 'preparing'
  | 'ready_for_pickup'
  | 'driver_picked_up'
  | 'on_the_way'
  | 'delivered'
  | 'cancelled';

export type FoodOrder = {
  id: string;
  restaurantId: string;
  restaurantName: string;
  riderId: string;
  driverId?: string;
  status: FoodOrderStatus;
  items: CartItem[];
  subtotalCents: number;
  deliveryFeeCents: number;
  taxCents: number;
  discountCents: number;
  totalCents: number;
  deliveryAddressId: string;
  deliveryAddress: string;
  deliveryInstructions?: string;
  estimatedDeliveryMins: number;
  createdAt: string;
  updatedAt: string;
  rating?: number;
  review?: string;
};
