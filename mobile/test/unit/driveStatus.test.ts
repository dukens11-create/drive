import { getNextTripStatus, tripStatusOrder } from '../../src/utils/driveStatus';

describe('driveStatus utilities', () => {
  test('trip status order remains stable for lifecycle progression', () => {
    expect(tripStatusOrder).toEqual(['accepted', 'in-progress', 'completed']);
  });

  test('getNextTripStatus advances status and ends at completed', () => {
    expect(getNextTripStatus('accepted')).toBe('in-progress');
    expect(getNextTripStatus('in-progress')).toBe('completed');
    expect(getNextTripStatus('completed')).toBeNull();
  });
});
