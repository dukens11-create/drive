import type { FoodDeliveryStatus } from '../types/drive';

export const foodDeliveryStatusOrder: FoodDeliveryStatus[] = [
  'going_to_restaurant',
  'at_restaurant',
  'delivering',
  'completed',
];

export const foodDeliveryStatusLabels: Record<FoodDeliveryStatus, string> = {
  going_to_restaurant: 'Going to Restaurant',
  at_restaurant: 'At Restaurant',
  delivering: 'Delivering to Customer',
  completed: 'Delivered',
};

export const foodDeliveryActionLabels: Record<FoodDeliveryStatus, string> = {
  going_to_restaurant: 'Arrived at Restaurant',
  at_restaurant: 'Picked Up Order',
  delivering: 'Complete Delivery',
  completed: 'Done',
};

export const getNextFoodDeliveryStatus = (status: FoodDeliveryStatus): FoodDeliveryStatus | null => {
  const index = foodDeliveryStatusOrder.indexOf(status);
  return foodDeliveryStatusOrder[index + 1] ?? null;
};
