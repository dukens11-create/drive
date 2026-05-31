import { foodDeliveryActionLabels, foodDeliveryStatusLabels, foodDeliveryStatusOrder, getNextFoodDeliveryStatus } from '../../src/utils/foodDeliveryStatus';

describe('foodDeliveryStatus utilities', () => {
  test('status order starts at going_to_restaurant and ends at completed', () => {
    expect(foodDeliveryStatusOrder[0]).toBe('going_to_restaurant');
    expect(foodDeliveryStatusOrder[foodDeliveryStatusOrder.length - 1]).toBe('completed');
  });

  test('getNextFoodDeliveryStatus advances through lifecycle', () => {
    expect(getNextFoodDeliveryStatus('going_to_restaurant')).toBe('at_restaurant');
    expect(getNextFoodDeliveryStatus('at_restaurant')).toBe('delivering');
    expect(getNextFoodDeliveryStatus('delivering')).toBe('completed');
    expect(getNextFoodDeliveryStatus('completed')).toBeNull();
  });

  test('all statuses have labels and action labels', () => {
    for (const status of foodDeliveryStatusOrder) {
      expect(foodDeliveryStatusLabels[status]).toBeTruthy();
      expect(foodDeliveryActionLabels[status]).toBeTruthy();
    }
  });
});
