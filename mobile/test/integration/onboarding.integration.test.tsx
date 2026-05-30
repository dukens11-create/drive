import { fireEvent, render, waitFor } from '@testing-library/react-native';
import * as Location from 'expo-location';

import OnboardingScreen from '../../app/onboarding';
import { PLACEHOLDER_DRIVER_DOCUMENTS } from '../../src/constants/onboarding';
import { useAuth } from '../../src/context/AuthContext';
import { kycApi } from '../../src/services/api/kycApi';

jest.mock('../../src/context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../../src/services/api/kycApi', () => ({
  kycApi: {
    status: jest.fn(),
    createSession: jest.fn(),
  },
}));

jest.mock('expo-router', () => ({
  Redirect: () => null,
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

describe('OnboardingScreen integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('submits application with fallback location when permission is denied', async () => {
    const completeApplication = jest.fn(async () => undefined);
    const submitDocuments = jest.fn(async () => undefined);
    const refreshOnboarding = jest.fn(async () => undefined);
    jest.spyOn(Location, 'requestForegroundPermissionsAsync').mockResolvedValue({
      status: Location.PermissionStatus.DENIED,
      canAskAgain: false,
      expires: 'never',
      granted: false,
    } as Location.LocationPermissionResponse);

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

    await waitFor(() => expect(completeApplication).toHaveBeenCalledWith({ lat: 37.7749, lng: -122.4194 }));
  });

  test('uploads required placeholder documents for documents step', async () => {
    const submitDocuments = jest.fn(async () => undefined);
    mockUseAuth.mockReturnValue({
      state: 'signed_in',
      session: { accessToken: 'a', refreshToken: 'r', user: { id: 'driver-1', email: 'driver@example.com', role: 'driver' } },
      isOnboardingLoading: false,
      onboardingStep: 'documents',
      onboardingProfile: {
        userId: 'driver-1',
        status: 'pending',
        verificationState: 'documents_pending',
        availabilityStatus: 'offline',
        available: false,
        documents: [],
      },
      errorMessage: null,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      refreshOnboarding: jest.fn(),
      completeApplication: jest.fn(),
      submitDocuments,
    });

    const screen = render(<OnboardingScreen />);
    fireEvent.press(screen.getByText('Upload required documents'));
    await waitFor(() => expect(submitDocuments).toHaveBeenCalledWith(PLACEHOLDER_DRIVER_DOCUMENTS));
  });

  test('refreshes KYC status when onboarding step is kyc', async () => {
    const refreshOnboarding = jest.fn(async () => undefined);
    mockUseAuth.mockReturnValue({
      state: 'signed_in',
      session: { accessToken: 'a', refreshToken: 'r', user: { id: 'driver-1', email: 'driver@example.com', role: 'driver' } },
      isOnboardingLoading: false,
      onboardingStep: 'kyc',
      onboardingProfile: {
        userId: 'driver-1',
        status: 'pending',
        verificationState: 'kyc_pending',
        availabilityStatus: 'offline',
        available: false,
        documents: [],
      },
      errorMessage: null,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      refreshOnboarding,
      completeApplication: jest.fn(),
      submitDocuments: jest.fn(),
    });

    const screen = render(<OnboardingScreen />);
    fireEvent.press(screen.getByText('Refresh KYC status'));

    await waitFor(() => expect(kycApi.status).toHaveBeenCalledWith('driver-1'));
    expect(refreshOnboarding).toHaveBeenCalled();
  });
});
