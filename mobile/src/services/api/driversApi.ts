import { apiClient } from './client';
import type { ApiEnvelope, DriverEarnings, DriverProfileResponse, RideSummary } from '../../types/api';

export const driversApi = {
  me() {
    return apiClient.get<ApiEnvelope<{ profile: DriverProfileResponse }>>('/api/drivers/me', { auth: true });
  },

  currentTrip() {
    return apiClient.get<ApiEnvelope<{ ride: RideSummary | null }>>('/api/drivers/current-trip', { auth: true });
  },

  apply(location?: { lat: number; lng: number }) {
    return apiClient.post<ApiEnvelope<{ profile: DriverProfileResponse }>>('/api/drivers/apply', location ?? {}, { auth: true });
  },

  documents(documents: string[]) {
    return apiClient.post<ApiEnvelope<{ profile: DriverProfileResponse }>>('/api/drivers/documents', { documents }, { auth: true });
  },

  setAvailability(status: 'offline' | 'online' | 'unavailable') {
    return apiClient.post<ApiEnvelope<{ profile: DriverProfileResponse }>>('/api/drivers/availability', { status }, { auth: true });
  },

  updateLocation(lat: number, lng: number) {
    return apiClient.post<ApiEnvelope<{ profile: DriverProfileResponse }>>('/api/drivers/location', { lat, lng }, { auth: true });
  },

  earnings() {
    return apiClient.post<ApiEnvelope<DriverEarnings>>('/api/drivers/earnings', {}, { auth: true });
  },
};
