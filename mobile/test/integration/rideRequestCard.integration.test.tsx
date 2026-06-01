import { fireEvent, render, waitFor } from '@testing-library/react-native';

import { useAccessibilitySettings } from '../../src/context/AccessibilityContext';
import { useDriveRealtime } from '../../src/context/DriveRealtimeContext';
import { useLocale } from '../../src/context/LocaleContext';
import { ridesApi } from '../../src/services/api/ridesApi';

jest.mock('../../src/context/DriveRealtimeContext', () => ({
  useDriveRealtime: jest.fn(),
}));

jest.mock('../../src/context/AccessibilityContext', () => ({
  useAccessibilitySettings: jest.fn(),
}));

jest.mock('../../src/context/LocaleContext', () => ({
  useLocale: jest.fn(),
}));

jest.mock('../../src/services/api/ridesApi', () => ({
  ridesApi: {
    ratePassenger: jest.fn(),
  },
}));

import { RideRequestCard } from '../../src/components/drive/RideRequestCard';

const mockUseDriveRealtime = useDriveRealtime as jest.MockedFunction<typeof useDriveRealtime>;
const mockUseAccessibilitySettings = useAccessibilitySettings as jest.MockedFunction<typeof useAccessibilitySettings>;
const mockUseLocale = useLocale as jest.MockedFunction<typeof useLocale>;
const mockRatePassenger = ridesApi.ratePassenger as jest.MockedFunction<typeof ridesApi.ratePassenger>;

describe('RideRequestCard integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRatePassenger.mockResolvedValue({
      ok: true,
      rideId: 'trip-1',
      rating: 5,
      comment: '',
    });
    mockUseAccessibilitySettings.mockReturnValue({
      highContrastEnabled: false,
      textScale: 'default',
      maxFontSizeMultiplier: 1,
      setHighContrastEnabled: jest.fn(),
      setTextScale: jest.fn(),
    });
    mockUseLocale.mockReturnValue({
      locale: 'en',
      isRTL: false,
      localeLabel: 'English',
      setLocale: jest.fn(async () => undefined),
      t: (key: string) => key,
      formatCurrency: (value: number) => `$${value.toFixed(2)}`,
      formatNumber: (value: number) => `${value}`,
      formatDate: (value: string | number | Date) => new Date(value).toISOString(),
      formatTime: (value: string | number | Date) => new Date(value).toISOString(),
    });
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
      isOfflineMode: false,
      setOnline: jest.fn(),
      updatePreferences: jest.fn(),
      refreshData: jest.fn(),
    });

    const screen = render(<RideRequestCard />);
    expect(screen.getByText('Incoming ride request')).toBeTruthy();
    expect(screen.getByText('Sound alert active')).toBeTruthy();
    expect(screen.getByText('Estimated earnings')).toBeTruthy();
    expect(screen.getByText(/Swipe to accept/i)).toBeTruthy();
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
      isOfflineMode: false,
      setOnline: jest.fn(),
      updatePreferences: jest.fn(),
      refreshData: jest.fn(),
    });

    const screen = render(<RideRequestCard />);
    fireEvent.press(screen.getByText('Complete Trip'));
    expect(advanceTrip).toHaveBeenCalledTimes(1);
  });

  test('declines incoming request from card action', () => {
    const declineRequest = jest.fn();
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
      requestTimeLeft: 3,
      acceptRequest: jest.fn(),
      declineRequest,
      advanceTrip: jest.fn(),
      profile: {} as never,
      metrics: {} as never,
      location: { latitude: 0, longitude: 0 },
      nearbyRequests: [],
      rideHistory: [],
      notifications: [],
      isLoading: false,
      error: null,
      onboardingRequired: false,
      isOfflineMode: false,
      setOnline: jest.fn(),
      updatePreferences: jest.fn(),
      refreshData: jest.fn(),
    });

    const screen = render(<RideRequestCard />);
    fireEvent.press(screen.getByText('Reject'));
    expect(declineRequest).toHaveBeenCalledTimes(1);
  });

  test('submits passenger rating when completed trip is unrated', async () => {
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
        status: 'completed',
        timeline: [{ id: 'event-1', title: 'Trip complete', message: 'Dropoff reached', createdAt: new Date().toISOString() }],
      },
      requestTimeLeft: 0,
      acceptRequest: jest.fn(),
      declineRequest: jest.fn(),
      advanceTrip: jest.fn(),
      profile: {} as never,
      metrics: {} as never,
      location: { latitude: 0, longitude: 0 },
      nearbyRequests: [],
      rideHistory: [],
      notifications: [],
      isLoading: false,
      error: null,
      onboardingRequired: false,
      isOfflineMode: false,
      setOnline: jest.fn(),
      updatePreferences: jest.fn(),
      refreshData: jest.fn(),
    });

    const screen = render(<RideRequestCard />);
    fireEvent.press(screen.getByText('Submit rating'));
    await waitFor(() => expect(mockRatePassenger).toHaveBeenCalledWith('trip-1', 5, ''));
  });

  test('shows passenger rating error when submission fails', async () => {
    mockRatePassenger.mockRejectedValueOnce(new Error('Unable to connect'));
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
        status: 'completed',
        timeline: [{ id: 'event-1', title: 'Trip complete', message: 'Dropoff reached', createdAt: new Date().toISOString() }],
      },
      requestTimeLeft: 0,
      acceptRequest: jest.fn(),
      declineRequest: jest.fn(),
      advanceTrip: jest.fn(),
      profile: {} as never,
      metrics: {} as never,
      location: { latitude: 0, longitude: 0 },
      nearbyRequests: [],
      rideHistory: [],
      notifications: [],
      isLoading: false,
      error: null,
      onboardingRequired: false,
      isOfflineMode: false,
      setOnline: jest.fn(),
      updatePreferences: jest.fn(),
      refreshData: jest.fn(),
    });

    const screen = render(<RideRequestCard />);
    fireEvent.press(screen.getByLabelText('Rate 3 stars'));
    fireEvent.changeText(screen.getByPlaceholderText('Optional passenger feedback'), 'Unsafe behavior');
    fireEvent.press(screen.getByText('Submit rating'));

    await waitFor(() => expect(screen.getByText('Unable to connect')).toBeTruthy());
    expect(mockRatePassenger).toHaveBeenCalledWith('trip-1', 3, 'Unsafe behavior');
  });
});
