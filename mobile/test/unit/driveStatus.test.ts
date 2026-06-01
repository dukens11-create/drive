import { getNextTripStatus, tripStatusOrder } from '../../src/utils/driveStatus';

describe('driveStatus utilities', () => {
  test('trip status order remains stable for lifecycle progression', () => {
    expect(tripStatusOrder).toEqual(['accepted', 'arrived_at_pickup', 'in-progress', 'completed']);
  });

  test('getNextTripStatus advances status and ends at completed', () => {
    expect(getNextTripStatus('accepted')).toBe('arrived_at_pickup');
    expect(getNextTripStatus('arrived_at_pickup')).toBe('in-progress');
    expect(getNextTripStatus('in-progress')).toBe('completed');
    expect(getNextTripStatus('completed')).toBeNull();
  });
});
