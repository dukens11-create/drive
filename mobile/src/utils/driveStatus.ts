import type { ActiveTrip, DriverStatus } from '../types/drive';

export const tripStatusOrder: ActiveTrip['status'][] = ['accepted', 'arriving', 'picked-up', 'in-progress', 'completed'];

export const tripStepLabels: Record<ActiveTrip['status'], string> = {
  accepted: 'Accepted',
  arriving: 'Arriving',
  'picked-up': 'Picked up',
  'in-progress': 'On trip',
  completed: 'Completed',
};

export const driverStatusMeta: Record<DriverStatus, { label: string; subtitle: string; accentColor: string; actionLabel?: string }> = {
  offline: {
    label: 'Offline',
    subtitle: 'Go online to start receiving ride requests.',
    accentColor: '#71717A',
  },
  waiting: {
    label: 'Waiting for requests',
    subtitle: 'You are online and visible to nearby riders.',
    accentColor: '#22C55E',
  },
  accepted: {
    label: 'Ride accepted',
    subtitle: 'Review pickup details and head to the rider.',
    accentColor: '#10B981',
    actionLabel: 'Head to pickup',
  },
  arriving: {
    label: 'Arriving at pickup',
    subtitle: 'You are almost at the pickup point.',
    accentColor: '#0EA5E9',
    actionLabel: 'Mark as arrived',
  },
  'picked-up': {
    label: 'Rider picked up',
    subtitle: 'Confirm the rider is in the car and start the trip.',
    accentColor: '#8B5CF6',
    actionLabel: 'Start trip',
  },
  'in-progress': {
    label: 'Trip in progress',
    subtitle: 'Navigate to the destination and complete the ride.',
    accentColor: '#F59E0B',
    actionLabel: 'Complete trip',
  },
  completed: {
    label: 'Trip completed',
    subtitle: 'Ride payout posted. Ready for the next request.',
    accentColor: '#14B8A6',
    actionLabel: 'Ready for next ride',
  },
};

export const getNextTripStatus = (status: ActiveTrip['status']): ActiveTrip['status'] | null => {
  const currentIndex = tripStatusOrder.indexOf(status);
  return tripStatusOrder[currentIndex + 1] ?? null;
};
