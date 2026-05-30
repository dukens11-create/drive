import type { LatLng, NearbyRequest, RideHistoryItem } from '../../types/drive';

const downtown: LatLng = { latitude: 37.7749, longitude: -122.4194 };
const pointOffsets = [0.22, -0.18, 0.3, -0.12, 0.14, -0.26];
const nearbyZones = ['Mission Bay', 'SoMa', 'Downtown', 'Financial District'];
const nearbyDistances = [0.9, 1.3, 2.1, 3.2];
const nearbySurge = [1.1, 1.4, 1.2, 1.5];

export const getSeedLocation = (): LatLng => downtown;

export const buildTripPoint = (index = 0, spread = 0.018): LatLng => ({
  latitude: downtown.latitude + pointOffsets[index % pointOffsets.length] * spread,
  longitude: downtown.longitude + pointOffsets[(index + 2) % pointOffsets.length] * spread,
});

export const buildNearbyRequests = (): NearbyRequest[] =>
  nearbyDistances.map((distanceKm, index) => ({
    id: `nearby-${index + 1}`,
    zoneName: nearbyZones[index],
    position: buildTripPoint(index + 1),
    distanceKm,
    surgeMultiplier: nearbySurge[index],
  }));

export const seedRideHistory = (): RideHistoryItem[] => [
  { id: 'trip-1', riderName: 'Noah B.', route: 'Market St → Mission Bay', fare: 18.2, timeLabel: '12:35 PM', miles: 2.3, date: new Date().toISOString() },
  { id: 'trip-2', riderName: 'Ivy L.', route: 'SOMA → Union Square', fare: 12.4, timeLabel: '11:58 AM', miles: 1.6, date: new Date().toISOString() },
  { id: 'trip-3', riderName: 'Amir K.', route: 'Folsom → Embarcadero', fare: 21.8, timeLabel: '11:08 AM', miles: 3.1, date: new Date().toISOString() },
];
