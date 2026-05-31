import { foodOrderStatusLabels, foodOrderStatusOrder, getFoodOrderProgress, isFoodOrderActive } from '../../src/utils/foodStatus';

describe('foodStatus utilities', () => {
  test('status order is stable', () => {
    expect(foodOrderStatusOrder[0]).toBe('placed');
    expect(foodOrderStatusOrder[foodOrderStatusOrder.length - 1]).toBe('delivered');
  });

  test('isFoodOrderActive returns false for terminal states', () => {
    expect(isFoodOrderActive('delivered')).toBe(false);
    expect(isFoodOrderActive('cancelled')).toBe(false);
  });

  test('isFoodOrderActive returns true for non-terminal states', () => {
    expect(isFoodOrderActive('placed')).toBe(true);
    expect(isFoodOrderActive('preparing')).toBe(true);
    expect(isFoodOrderActive('on_the_way')).toBe(true);
  });

  test('getFoodOrderProgress returns 0 for unknown status', () => {
    expect(getFoodOrderProgress('cancelled')).toBe(0);
  });

  test('getFoodOrderProgress returns 100 for delivered', () => {
    expect(getFoodOrderProgress('delivered')).toBe(100);
  });

  test('all statuses have labels', () => {
    for (const status of foodOrderStatusOrder) {
      expect(foodOrderStatusLabels[status]).toBeTruthy();
    }
  });
});
