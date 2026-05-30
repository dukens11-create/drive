import { fireEvent, render, waitFor } from '@testing-library/react-native';

import OnboardingScreen from '../../app/onboarding';
import { RideRequestCard } from '../../src/components/drive/RideRequestCard';
import { useAuth } from '../../src/context/AuthContext';
import { useDriveRealtime } from '../../src/context/DriveRealtimeContext';

jest.mock('../../src/context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../../src/context/DriveRealtimeContext', () => ({
  useDriveRealtime: jest.fn(),
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseDriveRealtime = useDriveRealtime as jest.MockedFunction<typeof useDriveRealtime>;

describe('critical path e2e flows', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('onboarding flow can submit application for a signed-in driver', async () => {
    const completeApplication = jest.fn(async () => undefined);
    const submitDocuments = jest.fn(async () => undefined);
    const refreshOnboarding = jest.fn(async () => undefined);

    mockUseAuth.mockReturnValue({
      state: 'signed_in',
      session: { accessToken: 'a', refreshToken: 'r', user: { id: 'driver-1', email: 'driver@example.com', role: 'driver' } },
      isOnboardingLoading: false,
      onboardingStep: 'application',
      onboardingProfile: null,
      errorMessage: null,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      refreshOnboarding,
      completeApplication,
      submitDocuments,
    });

    const screen = render(<OnboardingScreen />);
    fireEvent.press(screen.getByText('Submit application'));
    await waitFor(() => expect(completeApplication).toHaveBeenCalled());

  });

  test('ride lifecycle flow can accept and advance to completion action', () => {
    const acceptRequest = jest.fn();
    const advanceTrip = jest.fn();

    mockUseDriveRealtime
      .mockReturnValueOnce({
        activeRequest: {
          id: 'mock-request-1',
          riderName: 'Olivia',
          rideType: 'standard',
          pickupAddress: 'Pickup',
          dropoffAddress: 'Dropoff',
          pickupPosition: { latitude: 1, longitude: 1 },
          dropoffPosition: { latitude: 2, longitude: 2 },
          pickupDistanceKm: 1,
          tripDistanceKm: 3,
          estimatedFare: 10,
          surgeMultiplier: 1,
          pickupEtaMinutes: 2,
          riderRating: 4.9,
          directionTag: 'toward_downtown',
          expiresAt: Date.now() + 10000,
        },
        activeTrip: null,
        requestTimeLeft: 20,
        acceptRequest,
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
      })
      .mockReturnValueOnce({
        activeRequest: null,
        activeTrip: {
          id: 'trip-1',
          rideId: 'trip-1',
          riderName: 'Olivia',
          rideType: 'standard',
          pickupAddress: 'Pickup',
          dropoffAddress: 'Dropoff',
          pickupPosition: { latitude: 1, longitude: 1 },
          dropoffPosition: { latitude: 2, longitude: 2 },
          pickupDistanceKm: 1,
          tripDistanceKm: 3,
          estimatedFare: 10,
          surgeMultiplier: 1,
          pickupEtaMinutes: 2,
          riderRating: 4.9,
          directionTag: 'toward_downtown',
          status: 'in-progress',
          timeline: [{ id: 'event-1', title: 'Trip started', message: 'Rider onboard', createdAt: new Date().toISOString() }],
        },
        requestTimeLeft: 0,
        acceptRequest,
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

    const requestCard = render(<RideRequestCard />);
    fireEvent.press(requestCard.getByText('Accept'));
    expect(acceptRequest).toHaveBeenCalledTimes(1);

    const tripCard = render(<RideRequestCard />);
    fireEvent.press(tripCard.getByText('Complete Trip'));
    expect(advanceTrip).toHaveBeenCalledTimes(1);
  });
});
