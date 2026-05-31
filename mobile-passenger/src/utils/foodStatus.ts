import type { FoodOrderStatus } from '../types/food';

export const foodOrderStatusOrder: FoodOrderStatus[] = [
  'placed',
  'confirmed',
  'preparing',
  'ready_for_pickup',
  'driver_picked_up',
  'on_the_way',
  'delivered',
];

export const foodOrderStatusLabels: Record<FoodOrderStatus, string> = {
  placed: 'Order Placed',
  confirmed: 'Restaurant Confirmed',
  preparing: 'Preparing',
  ready_for_pickup: 'Ready for Pickup',
  driver_picked_up: 'Driver Picked Up',
  on_the_way: 'On the Way',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

export const isFoodOrderActive = (status: FoodOrderStatus): boolean => status !== 'delivered' && status !== 'cancelled';

export const getFoodOrderProgress = (status: FoodOrderStatus): number => {
  const index = foodOrderStatusOrder.indexOf(status);
  if (index < 0) {
    return 0;
  }
  return Math.round(((index + 1) / foodOrderStatusOrder.length) * 100);
};
