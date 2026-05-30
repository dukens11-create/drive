import type { ActiveTrip, DriverStatus } from '../types/drive';

export const tripStatusOrder: ActiveTrip['status'][] = ['accepted', 'in-progress', 'completed'];

export const tripStepLabels: Record<ActiveTrip['status'], string> = {
  accepted: 'To pickup',
  'in-progress': 'On trip',
  completed: 'Wrap up',
};

export const driverStatusMeta: Record<DriverStatus, { label: string; subtitle: string; accentColor: string; actionLabel?: string }> = {
  offline: {
    label: 'Offline',
    subtitle: 'Go online to start receiving ride requests.',
    accentColor: '#71717A',
  },
  onboarding: {
    label: 'Onboarding required',
    subtitle: 'Complete driver onboarding before going online.',
    accentColor: '#F97316',
  },
  waiting: {
    label: 'Waiting for requests',
    subtitle: 'You are online and visible to nearby riders.',
    accentColor: '#22C55E',
  },
  accepted: {
    label: 'Head to pickup',
    subtitle: 'Navigate to pickup, confirm your rider, then start the trip.',
    accentColor: '#10B981',
    actionLabel: 'Start trip',
  },
  'in-progress': {
    label: 'On trip',
    subtitle: 'Rider is onboard. Follow the route to dropoff and complete the trip.',
    accentColor: '#F59E0B',
    actionLabel: 'Complete trip',
  },
  completed: {
    label: 'Trip completed',
    subtitle: 'Ride payout posted. Wrap up this trip, then go back online for the next request.',
    accentColor: '#14B8A6',
    actionLabel: 'Ready for next ride',
  },
};

export const getNextTripStatus = (status: ActiveTrip['status']): ActiveTrip['status'] | null => {
  const currentIndex = tripStatusOrder.indexOf(status);
  return tripStatusOrder[currentIndex + 1] ?? null;
};
