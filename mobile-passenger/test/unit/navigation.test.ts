import { buildNavigationRoute, distanceKmBetween } from '../../src/utils/navigation';
import type { ActiveTrip } from '../../src/types/drive';

const origin = { latitude: 37.7749, longitude: -122.4194 };

const acceptedTrip: ActiveTrip = {
  id: 'trip-1',
  rideId: 'trip-1',
  riderName: 'Rider',
  rideType: 'standard',
  pickupAddress: 'Pickup',
  dropoffAddress: 'Dropoff',
  pickupPosition: { latitude: 37.7849, longitude: -122.4094 },
  dropoffPosition: { latitude: 37.7949, longitude: -122.3994 },
  pickupDistanceKm: 1.2,
  tripDistanceKm: 4.2,
  estimatedFare: 18.5,
  surgeMultiplier: 1.2,
  pickupEtaMinutes: 4,
  riderRating: 4.9,
  directionTag: 'toward_downtown',
  status: 'accepted',
  timeline: [],
};

describe('navigation utilities', () => {
  test('distanceKmBetween returns zero for identical coordinates', () => {
    expect(distanceKmBetween(origin, origin)).toBeCloseTo(0, 6);
  });

  test('buildNavigationRoute returns pickup + dropoff route for accepted trip', () => {
    const route = buildNavigationRoute(origin, acceptedTrip);
    expect(route).not.toBeNull();
    expect(route?.waypoints).toHaveLength(3);
    expect(route?.steps).toHaveLength(2);
    expect(route?.remainingDistanceKm).toBeGreaterThan(0);
    expect(route?.nextInstruction).toMatch(/pickup/i);
  });

  test('buildNavigationRoute returns null after trip completion', () => {
    const route = buildNavigationRoute(origin, { ...acceptedTrip, status: 'completed' });
    expect(route).toBeNull();
  });
});
