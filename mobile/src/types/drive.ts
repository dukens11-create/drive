export type DriverStatus = 'offline' | 'onboarding' | 'waiting' | 'accepted' | 'arrived_at_pickup' | 'in-progress' | 'completed';

export type RideType = 'standard' | 'comfort' | 'xl';
export type DirectionPreference = 'any' | 'toward_downtown' | 'away_from_downtown';

export type DriverPreferences = {
  rideTypes: RideType[];
  minimumRiderRating: number;
  directionPreference: DirectionPreference;
  availabilityWindows?: Array<{ day: string; start: string; end: string }>;
};

export type DriverProfile = {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string;
  vehicleStatus: 'good' | 'service-soon';
  isOnline: boolean;
  status: DriverStatus;
  preferences: DriverPreferences;
  trustScore?: number;
  verificationBadge?: 'verified' | 'pending';
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
  rideType: RideType;
  pickupAddress: string;
  dropoffAddress: string;
  pickupPosition: LatLng;
  dropoffPosition: LatLng;
  pickupDistanceKm: number;
  tripDistanceKm: number;
  estimatedFare: number;
  surgeMultiplier: number;
  pickupEtaMinutes: number;
  riderRating: number;
  directionTag: Exclude<DirectionPreference, 'any'>;
  expiresAt: number;
};

export type ActiveTrip = Omit<RideRequest, 'expiresAt'> & {
  status: Extract<DriverStatus, 'accepted' | 'arrived_at_pickup' | 'in-progress' | 'completed'>;
  rideId: string;
  timeline: Array<{ id: string; title: string; message: string; createdAt: string }>;
  passengerRating?: number;
  passengerReview?: string;
  waitingSince?: string;
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

export type FoodDeliveryStatus =
  | 'going_to_restaurant'
  | 'at_restaurant'
  | 'delivering'
  | 'completed';

export type FoodDeliveryRequest = {
  id: string;
  restaurantName: string;
  restaurantAddress: string;
  restaurantPosition: LatLng;
  customerName: string;
  customerAddress: string;
  customerPosition: LatLng;
  items: Array<{ name: string; quantity: number }>;
  estimatedPickupDistanceKm: number;
  estimatedDeliveryDistanceKm: number;
  estimatedEarnings: number;
  estimatedTimeMinutes: number;
  deliveryInstructions?: string;
  expiresAt: number;
};

export type ActiveFoodDelivery = Omit<FoodDeliveryRequest, 'expiresAt'> & {
  status: FoodDeliveryStatus;
  deliveryId: string;
};

export type DriverMode = 'rides' | 'food' | 'both';
