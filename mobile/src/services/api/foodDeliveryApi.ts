import { apiClient } from './client';
import type { ActiveFoodDelivery, DriverMode } from '../../types/drive';

export const foodDeliveryApi = {
  acceptDelivery: (deliveryId: string) =>
    apiClient.post<{ delivery: ActiveFoodDelivery }>('/api/food-delivery/accept', { deliveryId }, { auth: true }),

  declineDelivery: (deliveryId: string) =>
    apiClient.post<{ success: boolean }>('/api/food-delivery/decline', { deliveryId }, { auth: true }),

  updateDeliveryStatus: (deliveryId: string, status: ActiveFoodDelivery['status']) =>
    apiClient.post<{ delivery: ActiveFoodDelivery }>('/api/food-delivery/status', { deliveryId, status }, { auth: true }),

  completeDelivery: (deliveryId: string) =>
    apiClient.post<{ earnings: number; bonusCents: number }>('/api/food-delivery/complete', { deliveryId }, { auth: true }),

  getActiveDelivery: () => apiClient.get<{ delivery: ActiveFoodDelivery | null }>('/api/food-delivery/active', { auth: true }),

  getDeliveryHistory: () =>
    apiClient.get<{ deliveries: Array<ActiveFoodDelivery & { completedAt: string; earnedAmount: number }> }>('/api/food-delivery/history', { auth: true }),

  updateDriverMode: (mode: DriverMode) => apiClient.post<{ success: boolean }>('/api/food-delivery/mode', { mode }, { auth: true }),
};
