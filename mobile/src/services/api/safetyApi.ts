import { apiClient } from './client';
import type { ApiEnvelope } from '../../types/api';

export const safetyApi = {
  sos(userId: string, details: string, rideId?: string, lat?: number, lng?: number) {
    return apiClient.post<ApiEnvelope<{ incident: { id: string; status: string } }>>(
      '/api/safety/sos',
      { userId, details, rideId, lat, lng },
      { auth: true }
    );
  },
};
