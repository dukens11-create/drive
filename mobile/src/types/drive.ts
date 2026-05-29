export type DriverStatus = 'offline' | 'waiting' | 'accepted' | 'arriving' | 'picked-up' | 'in-progress' | 'completed';

export type DriverProfile = {
  id: string;
  name: string;
  avatarUrl: string;
  vehicleStatus: 'good' | 'service-soon';
  isOnline: boolean;
  status: DriverStatus;
};

export type DriverMetrics = {
  earningsToday: number;
  tripsCompleted: number;
  hoursOnline: number;
};

export type LatLng = {
  latitude: number;
  longitude: number;
};

export type NearbyRequest = {
  id: string;
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
  status: Exclude<DriverStatus, 'offline' | 'waiting'>;
};

export type RideHistoryItem = {
  id: string;
  riderName: string;
  route: string;
  fare: number;
  timeLabel: string;
};
