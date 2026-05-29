export type DriverStatus = 'available' | 'on-trip' | 'break';

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
  distanceKm: number;
  estimatedFare: number;
  expiresAt: number;
};

export type RideHistoryItem = {
  id: string;
  riderName: string;
  route: string;
  fare: number;
  timeLabel: string;
};
