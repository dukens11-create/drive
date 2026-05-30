export type ApiEnvelope<T> = {
  module?: string;
  action?: string;
  ok?: boolean;
  error?: string;
} & T;

export type AuthUser = {
  id: string;
  role: 'rider' | 'driver' | 'merchant' | 'admin';
  email?: string;
  phone?: string;
  createdAt?: string;
};

export type AuthSession = {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
};

export type DriverProfileResponse = {
  userId: string;
  status: 'pending' | 'approved' | 'rejected';
  verificationState: 'documents_pending' | 'kyc_pending' | 'verified' | 'rejected';
  availabilityStatus: 'offline' | 'online' | 'assigned' | 'unavailable';
  available: boolean;
  lat?: number;
  lng?: number;
  rating?: number;
  acceptanceRate?: number;
  cancellationRate?: number;
  earningsCents?: number;
  documents?: string[];
};

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
  events?: RideEvent[];
  latestEvent?: RideEvent | null;
  updatedAt: string;
  createdAt: string;
};

export type DriverEarnings = {
  earningsCents: number;
  rideCount: number;
  rideEarnings: Array<{
    rideId: string;
    amountCents: number;
    createdAt: string;
  }>;
};
