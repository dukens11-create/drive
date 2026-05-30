import type { ActiveTrip, DriverStatus } from '../types/drive';

export const tripStatusOrder: ActiveTrip['status'][] = ['accepted', 'in-progress', 'completed'];

export const tripStepLabels: Record<ActiveTrip['status'], string> = {
  accepted: 'Pickup',
  'in-progress': 'On Trip',
  completed: 'Complete',
};

export const driverStatusMeta: Record<DriverStatus, { label: string; subtitle: string; accentColor: string; actionLabel?: string }> = {
  offline: {
    label: 'Offline',
    subtitle: 'Go online to start receiving ride requests.',
    accentColor: '#71717A',
  },
  onboarding: {
    label: 'Onboarding Required',
    subtitle: 'Complete driver onboarding before going online.',
    accentColor: '#F97316',
  },
  waiting: {
    label: 'Looking for Requests',
    subtitle: 'You are online and visible to nearby riders.',
    accentColor: '#22C55E',
  },
  accepted: {
    label: 'En Route to Pickup',
    subtitle: 'Head to the pickup location and wait for the rider.',
    accentColor: '#10B981',
    actionLabel: 'Start Trip',
  },
  'in-progress': {
    label: 'Trip in Progress',
    subtitle: 'Navigate to the drop-off destination.',
    accentColor: '#F59E0B',
    actionLabel: 'Complete Trip',
  },
  completed: {
    label: 'Trip Complete',
    subtitle: 'Payout posted — ready for your next ride.',
    accentColor: '#14B8A6',
    actionLabel: 'Done',
  },
};

export const getNextTripStatus = (status: ActiveTrip['status']): ActiveTrip['status'] | null => {
  const currentIndex = tripStatusOrder.indexOf(status);
  return tripStatusOrder[currentIndex + 1] ?? null;
};
