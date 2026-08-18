import { apiClient } from './client';
import type { ApiEnvelope, RideEvent, RideSummary } from '../../types/api';

export type DriverRideRequestSummary = {
  requestId?: string;
  rideId: string;
  riderId: string;
  riderName?: string;
  riderPhone?: string;
  riderRating?: number;
  pickupAddress?: string;
  pickupLat?: number;
  pickupLng?: number;
  dropoffAddress?: string;
  dropoffLat?: number;
  dropoffLng?: number;
  destinationAddress?: string;
  destinationLat?: number;
  destinationLng?: number;
  rideType?: string;
  fareEstimate?: number;
  distance?: number;
  minutes?: number;
  duration?: number;
  etaMinutes?: number;
  paymentMethod?: string;
  status?: string;
  expiresAt?: string;
  timeLeft?: number;
  createdAt?: string;
};
export const ridesApi = {
  openRequests(limit = 20) {
    const boundedLimit = Math.max(1, Math.min(100, Math.floor(limit)));
    return apiClient.get<ApiEnvelope<{
      rides: DriverRideRequestSummary[];
      requests: DriverRideRequestSummary[];
      rideRequests: DriverRideRequestSummary[];
    }>>(
      `/api/driver/ride-requests?status=SEARCHING&limit=${boundedLimit}`,
      { auth: true }
    );
  },
  history() {
    return apiClient.get<ApiEnvelope<{ rides: RideSummary[] }>>('/api/rides/history', { auth: true });
  },

  notifications(limit = 20) {
    return apiClient.post<ApiEnvelope<{ notifications: RideEvent[]; total: number }>>('/api/rides/notifications', { limit }, { auth: true });
  },

  accept(rideId: string) {
    return apiClient.post<ApiEnvelope<{ ride: RideSummary }>>('/api/rides/accept', { rideId }, { auth: true });
  },
  decline(rideId: string, reason?: string) {
    return apiClient.post<ApiEnvelope<{
      rideId?: string;
      status?: string;
      ride?: RideSummary;
    }>>(
      `/api/rides/${encodeURIComponent(rideId)}/decline`,
      { reason },
      { auth: true }
    );
  },

  arrive(rideId: string) {
    return apiClient.post<ApiEnvelope<{ ride: RideSummary; arrivedAt: string }>>('/api/rides/arrive', { rideId }, { auth: true });
  },

  start(rideId: string) {
    return apiClient.post<ApiEnvelope<{ ride: RideSummary }>>('/api/rides/start', { rideId }, { auth: true });
  },

  complete(rideId: string) {
    return apiClient.post<ApiEnvelope<{
      ride: RideSummary;
      grossCents: number;
      discountCents: number;
      amountCents: number;
      receipt?: RideSummary['receipt'];
    }>>('/api/rides/complete', { rideId }, { auth: true });
  },

  noShow(rideId: string) {
    return apiClient.post<ApiEnvelope<{ ride: RideSummary }>>('/api/rides/no-show', { rideId }, { auth: true });
  },

  driverCancel(rideId: string, reason?: string) {
    return apiClient.post<ApiEnvelope<{ ride: RideSummary }>>('/api/rides/driver-cancel', { rideId, reason }, { auth: true });
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
