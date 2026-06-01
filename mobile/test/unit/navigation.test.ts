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
    expect(route?.waypoints.length).toBeGreaterThanOrEqual(3);
    expect(route?.steps.length).toBeGreaterThanOrEqual(2);
    expect(route?.remainingDistanceKm).toBeGreaterThan(0);
    expect(route?.currentTarget).toBe('pickup');
    expect(route?.currentStep.arrow).toMatch(/↑|↗|→|↘|↓|↙|←|↖/);
    expect(route?.voiceInstruction).toMatch(/kilometers remaining|arriving/i);
    expect(route?.upcomingSteps.length).toBeGreaterThanOrEqual(1);
    expect(['light', 'moderate', 'heavy']).toContain(route?.trafficLevel);
    expect(route?.nextInstruction).toMatch(/pickup/i);
  });

  test('buildNavigationRoute shifts current target to dropoff once trip is in progress', () => {
    const route = buildNavigationRoute(origin, { ...acceptedTrip, status: 'in-progress' });
    expect(route).not.toBeNull();
    expect(route?.currentTarget).toBe('dropoff');
    expect(route?.nextInstruction).toMatch(/dropoff/i);
    expect(route?.currentTargetDistanceKm).toBeGreaterThan(0);
  });

  test('buildNavigationRoute emits arrival notifications near the active target', () => {
    const route = buildNavigationRoute(acceptedTrip.pickupPosition, acceptedTrip);
    expect(route).not.toBeNull();
    expect(route?.arrivalMessage).toMatch(/arriving at pickup/i);
    expect(route?.voiceInstruction).toMatch(/arriving at pickup/i);
  });

  test('buildNavigationRoute returns null after trip completion', () => {
    const route = buildNavigationRoute(origin, { ...acceptedTrip, status: 'completed' });
    expect(route).toBeNull();
  });
});
