import type { ActiveTrip, DriverStatus } from '../types/drive';

export const tripStatusOrder: ActiveTrip['status'][] = ['accepted', 'arrived_at_pickup', 'in-progress', 'completed'];

export const tripStepLabels: Record<ActiveTrip['status'], string> = {
  accepted: 'To pickup',
  arrived_at_pickup: 'Waiting',
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
    label: 'Head to pickup',
    subtitle: 'Navigate to pickup. Tap "Arrived" when you reach the pickup point.',
    accentColor: '#10B981',
    actionLabel: 'Arrived at Pickup',
  },
  arrived_at_pickup: {
    label: 'Waiting at pickup',
    subtitle: 'You are at the pickup point. Confirm the rider and start the trip.',
    accentColor: '#3B82F6',
    actionLabel: 'Start Trip',
  },
  'in-progress': {
    label: 'On trip',
    subtitle: 'Rider is onboard. Follow the route to dropoff and complete the trip.',
    accentColor: '#F59E0B',
    actionLabel: 'Complete Trip',
  },
  completed: {
    label: 'Trip completed',
    subtitle: 'Ride payout posted. Wrap up this trip, then go back online for the next request.',
    accentColor: '#14B8A6',
    actionLabel: 'Done',
  },
};

export const getNextTripStatus = (status: ActiveTrip['status']): ActiveTrip['status'] | null => {
  const currentIndex = tripStatusOrder.indexOf(status);
  return tripStatusOrder[currentIndex + 1] ?? null;
};

export const DRIVER_CANCEL_REASONS = [
  { value: 'vehicle_issue', label: 'Vehicle issue' },
  { value: 'personal_emergency', label: 'Personal emergency' },
  { value: 'rider_not_found', label: 'Cannot find rider' },
  { value: 'safety_concern', label: 'Safety concern' },
  { value: 'other', label: 'Other' },
] as const;

export type DriverCancelReason = typeof DRIVER_CANCEL_REASONS[number]['value'];
