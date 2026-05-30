import { apiClient } from './client';
import type { ApiEnvelope } from '../../types/api';

export const kycApi = {
  createSession(userId: string) {
    return apiClient.post<ApiEnvelope<{ status: 'pending' | 'verified' | 'rejected'; session: unknown }>>(
      '/api/kyc/create-session',
      { userId },
      { auth: true }
    );
  },

  status(userId: string) {
    return apiClient.post<ApiEnvelope<{ status: 'pending' | 'verified' | 'rejected'; userId: string }>>('/api/kyc/status', { userId }, { auth: true });
  },
};
