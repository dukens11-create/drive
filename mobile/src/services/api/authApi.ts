import { apiClient } from './client';
import type { ApiEnvelope, AuthSession, AuthUser } from '../../types/api';

type AuthPayload = ApiEnvelope<{ user: AuthUser; accessToken: string; refreshToken: string }>;

type AuthInput = {
  email?: string;
  phone?: string;
  password: string;
  role?: 'driver' | 'rider' | 'merchant';
};

const toSession = (payload: AuthPayload): AuthSession => ({
  user: payload.user,
  accessToken: payload.accessToken,
  refreshToken: payload.refreshToken,
});

export const authApi = {
  async signIn(input: AuthInput) {
    const payload = await apiClient.post<AuthPayload>('/api/auth/login', input);
    return toSession(payload);
  },

  async signUp(input: AuthInput) {
    const payload = await apiClient.post<AuthPayload>('/api/auth/signup', input);
    return toSession(payload);
  },

  async refresh(refreshToken: string) {
    const payload = await apiClient.post<ApiEnvelope<{ accessToken: string; refreshToken: string }>>('/api/auth/refresh', { refreshToken });
    return payload;
  },

  async logout(refreshToken: string) {
    await apiClient.post('/api/auth/logout', { refreshToken });
  },
};
