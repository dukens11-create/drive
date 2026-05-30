import { apiClient } from './client';
import type { ApiEnvelope, RideEvent, RideSummary } from '../../types/api';

export const ridesApi = {
  history() {
    return apiClient.get<ApiEnvelope<{ rides: RideSummary[] }>>('/api/rides/history', { auth: true });
  },

  notifications(limit = 20) {
    return apiClient.post<ApiEnvelope<{ notifications: RideEvent[]; total: number }>>('/api/rides/notifications', { limit }, { auth: true });
  },

  accept(rideId: string) {
    return apiClient.post<ApiEnvelope<{ ride: RideSummary }>>('/api/rides/accept', { rideId }, { auth: true });
  },

  start(rideId: string) {
    return apiClient.post<ApiEnvelope<{ ride: RideSummary }>>('/api/rides/start', { rideId }, { auth: true });
  },

  complete(rideId: string) {
    return apiClient.post<ApiEnvelope<{ ride: RideSummary }>>('/api/rides/complete', { rideId }, { auth: true });
  },

  message(rideId: string, message: string) {
    return apiClient.post<ApiEnvelope<{ message: RideEvent; rideId: string }>>('/api/rides/message', { rideId, message }, { auth: true });
  },

  ratePassenger(rideId: string, rating: number, comment?: string) {
    return apiClient.post<ApiEnvelope<{ rideId: string; rating: number; comment?: string }>>(
      '/api/rides/rate-passenger',
      { rideId, rating, comment },
      { auth: true }
    );
  },
};
