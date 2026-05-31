import { apiClient } from './client';
import type { FoodOrder, MenuCategory, Restaurant } from '../../types/food';

export const foodApi = {
  listRestaurants: (_params?: { cuisine?: string; query?: string; lat?: number; lng?: number }) =>
    apiClient.get<{ restaurants: Restaurant[] }>('/api/food/restaurants', { auth: true }),

  getRestaurant: (id: string) =>
    apiClient.get<{ restaurant: Restaurant; menu: MenuCategory[] }>(`/api/food/restaurants/${id}`, { auth: true }),

  createOrder: (body: {
    restaurantId: string;
    items: Array<{ menuItemId: string; quantity: number; specialInstructions?: string }>;
    deliveryAddress: string;
    promoCode?: string;
    tip: number;
    deliveryInstructions?: string;
  }) => apiClient.post<{ order: FoodOrder }>('/api/food/orders', body, { auth: true }),

  getOrder: (orderId: string) => apiClient.get<{ order: FoodOrder }>(`/api/food/orders/${orderId}`, { auth: true }),

  listOrders: () => apiClient.get<{ orders: FoodOrder[] }>('/api/food/orders', { auth: true }),

  cancelOrder: (orderId: string) => apiClient.post<{ order: FoodOrder }>(`/api/food/orders/${orderId}/cancel`, {}, { auth: true }),

  rateOrder: (orderId: string, body: { restaurantRating: number; deliveryRating: number; review?: string }) =>
    apiClient.post<{ success: boolean }>(`/api/food/orders/${orderId}/rate`, body, { auth: true }),

  applyPromo: (code: string) =>
    apiClient.post<{ valid: boolean; discount: number; message?: string }>('/api/food/promo/apply', { code }, { auth: true }),
};
