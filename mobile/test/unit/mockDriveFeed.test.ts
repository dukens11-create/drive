import { buildIncomingRideRequests, buildNearbyRequests, estimateRequestExpirationSeconds } from '../../src/services/realtime/mockDriveFeed';

describe('mockDriveFeed', () => {
  test('ranks requests using preferences and filters declined ids', () => {
    const nearby = buildNearbyRequests();
    const requests = buildIncomingRideRequests({
      nearbyRequests: nearby,
      declinedRequestIds: ['mock-request-1'],
      driverPreferences: {
        rideTypes: ['comfort'],
        minimumRiderRating: 4.85,
        directionPreference: 'toward_downtown',
      },
    });

    expect(requests.length).toBeGreaterThan(0);
    expect(requests[0].rideType).toBe('comfort');
    expect(requests.some((request) => request.id === 'mock-request-1')).toBe(false);
  });

  test('returns fallback request when strict preferences remove all matches', () => {
    const requests = buildIncomingRideRequests({
      driverPreferences: {
        rideTypes: ['xl'],
        minimumRiderRating: 4.99,
        directionPreference: 'toward_downtown',
      },
      declinedRequestIds: ['mock-request-1', 'mock-request-2', 'mock-request-3', 'mock-request-4'],
    });

    expect(requests).toHaveLength(1);
    expect(requests[0].id).toBe('mock-request-1');
  });

  test('estimateRequestExpirationSeconds drops with higher distance and surge', () => {
    const base = estimateRequestExpirationSeconds({
      id: 'r1',
      riderName: 'A',
      rideType: 'standard',
      pickupAddress: 'A',
      dropoffAddress: 'B',
      pickupPosition: { latitude: 0, longitude: 0 },
      dropoffPosition: { latitude: 1, longitude: 1 },
      pickupDistanceKm: 1,
      tripDistanceKm: 3,
      estimatedFare: 10,
      surgeMultiplier: 1,
      pickupEtaMinutes: 2,
      riderRating: 4.9,
      directionTag: 'toward_downtown',
    });
    const surge = estimateRequestExpirationSeconds({
      id: 'r2',
      riderName: 'A',
      rideType: 'standard',
      pickupAddress: 'A',
      dropoffAddress: 'B',
      pickupPosition: { latitude: 0, longitude: 0 },
      dropoffPosition: { latitude: 1, longitude: 1 },
      pickupDistanceKm: 4,
      tripDistanceKm: 3,
      estimatedFare: 10,
      surgeMultiplier: 1.5,
      pickupEtaMinutes: 2,
      riderRating: 4.9,
      directionTag: 'toward_downtown',
    });

    expect(base).toBeGreaterThan(surge);
    expect(surge).toBeGreaterThanOrEqual(10);
  });
});
