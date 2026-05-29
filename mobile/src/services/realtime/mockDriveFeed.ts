import type { LatLng, NearbyRequest, RideHistoryItem } from '../../types/drive';

const downtown: LatLng = { latitude: 37.7749, longitude: -122.4194 };

const randomOffset = (spread = 0.04) => (Math.random() - 0.5) * spread;

export const getSeedLocation = (): LatLng => downtown;

export const buildTripPoint = (spread = 0.018): LatLng => ({
  latitude: downtown.latitude + randomOffset(spread),
  longitude: downtown.longitude + randomOffset(spread),
});

export const buildNearbyRequests = (): NearbyRequest[] =>
  Array.from({ length: 4 }).map((_, index) => ({
    id: `nearby-${index + 1}`,
    position: buildTripPoint(),
    distanceKm: Number((0.6 + Math.random() * 3.4).toFixed(1)),
    surgeMultiplier: Number((1 + Math.random() * 1.2).toFixed(1)),
  }));

export const seedRideHistory = (): RideHistoryItem[] => [
  { id: 'trip-1', riderName: 'Noah B.', route: 'Market St → Mission Bay', fare: 18.2, timeLabel: '12:35 PM' },
  { id: 'trip-2', riderName: 'Ivy L.', route: 'SOMA → Union Square', fare: 12.4, timeLabel: '11:58 AM' },
  { id: 'trip-3', riderName: 'Amir K.', route: 'Folsom → Embarcadero', fare: 21.8, timeLabel: '11:08 AM' },
];
