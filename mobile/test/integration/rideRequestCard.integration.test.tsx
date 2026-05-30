import { fireEvent, render } from '@testing-library/react-native';

import { RideRequestCard } from '../../src/components/drive/RideRequestCard';
import { useDriveRealtime } from '../../src/context/DriveRealtimeContext';

jest.mock('../../src/context/DriveRealtimeContext', () => ({
  useDriveRealtime: jest.fn(),
}));

const mockUseDriveRealtime = useDriveRealtime as jest.MockedFunction<typeof useDriveRealtime>;

describe('RideRequestCard integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('accepts incoming request from card action', () => {
    const acceptRequest = jest.fn();
    const declineRequest = jest.fn();
    const advanceTrip = jest.fn();
    mockUseDriveRealtime.mockReturnValue({
      activeRequest: {
        id: 'request-1',
        riderName: 'Olivia',
        rideType: 'standard',
        pickupAddress: 'Pickup',
        dropoffAddress: 'Dropoff',
        pickupPosition: { latitude: 1, longitude: 1 },
        dropoffPosition: { latitude: 2, longitude: 2 },
        pickupDistanceKm: 1.2,
        tripDistanceKm: 3.4,
        estimatedFare: 21.5,
        surgeMultiplier: 1.2,
        pickupEtaMinutes: 4,
        riderRating: 4.9,
        directionTag: 'toward_downtown',
        expiresAt: Date.now() + 10000,
      },
      activeTrip: null,
      requestTimeLeft: 12,
      acceptRequest,
      declineRequest,
      advanceTrip,
      profile: {} as never,
      metrics: {} as never,
      location: { latitude: 0, longitude: 0 },
      nearbyRequests: [],
      rideHistory: [],
      notifications: [],
      isLoading: false,
      error: null,
      onboardingRequired: false,
      setOnline: jest.fn(),
      refreshData: jest.fn(),
    });

    const screen = render(<RideRequestCard />);
    fireEvent.press(screen.getByText('Accept'));
    expect(acceptRequest).toHaveBeenCalledTimes(1);
  });

  test('advances trip status from active trip card action', () => {
    const advanceTrip = jest.fn();
    mockUseDriveRealtime.mockReturnValue({
      activeRequest: null,
      activeTrip: {
        id: 'trip-1',
        rideId: 'trip-1',
        riderName: 'Daniel',
        rideType: 'standard',
        pickupAddress: 'Pickup',
        dropoffAddress: 'Dropoff',
        pickupPosition: { latitude: 1, longitude: 1 },
        dropoffPosition: { latitude: 2, longitude: 2 },
        pickupDistanceKm: 1,
        tripDistanceKm: 4,
        estimatedFare: 18.25,
        surgeMultiplier: 1,
        pickupEtaMinutes: 2,
        riderRating: 4.9,
        directionTag: 'toward_downtown',
        status: 'in-progress',
        timeline: [{ id: 'event-1', title: 'Trip started', message: 'Rider onboard', createdAt: new Date().toISOString() }],
      },
      requestTimeLeft: 0,
      acceptRequest: jest.fn(),
      declineRequest: jest.fn(),
      advanceTrip,
      profile: {} as never,
      metrics: {} as never,
      location: { latitude: 0, longitude: 0 },
      nearbyRequests: [],
      rideHistory: [],
      notifications: [],
      isLoading: false,
      error: null,
      onboardingRequired: false,
      setOnline: jest.fn(),
      refreshData: jest.fn(),
    });

    const screen = render(<RideRequestCard />);
    fireEvent.press(screen.getByText('Complete Trip'));
    expect(advanceTrip).toHaveBeenCalledTimes(1);
  });
});
