export type DriverStatus = 'offline' | 'onboarding' | 'waiting' | 'accepted' | 'in-progress' | 'completed';

export type DriverProfile = {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string;
  vehicleStatus: 'good' | 'service-soon';
  isOnline: boolean;
  status: DriverStatus;
};

export type DriverMetrics = {
  earningsToday: number;
  tripsCompleted: number;
  hoursOnline: number;
  earningsPerTrip: number;
  earningsPerHour: number;
};

export type LatLng = {
  latitude: number;
  longitude: number;
};

export type NearbyRequest = {
  id: string;
  zoneName: string;
  position: LatLng;
  distanceKm: number;
  surgeMultiplier: number;
};

export type RideRequest = {
  id: string;
  riderName: string;
  pickupAddress: string;
  dropoffAddress: string;
  pickupPosition: LatLng;
  dropoffPosition: LatLng;
  pickupDistanceKm: number;
  tripDistanceKm: number;
  estimatedFare: number;
  pickupEtaMinutes: number;
  riderRating: number;
  expiresAt: number;
};

export type ActiveTrip = Omit<RideRequest, 'expiresAt'> & {
  status: Extract<DriverStatus, 'accepted' | 'in-progress' | 'completed'>;
  rideId: string;
  timeline: Array<{ id: string; title: string; message: string; createdAt: string }>;
};

export type RideHistoryItem = {
  id: string;
  riderName: string;
  route: string;
  fare: number;
  timeLabel: string;
  miles: number;
  date: string;
};
