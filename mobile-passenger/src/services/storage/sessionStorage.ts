import * as SecureStore from 'expo-secure-store';

import type { AuthSession } from '../../types/api';

const SESSION_KEY = 'drive.session';

const isValidSession = (value: unknown): value is AuthSession => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as AuthSession;
  return Boolean(
    candidate.accessToken &&
      candidate.refreshToken &&
      candidate.user?.id &&
      candidate.user?.role
  );
};

export const sessionStorage = {
  async load(): Promise<AuthSession | null> {
    const raw = await SecureStore.getItemAsync(SESSION_KEY);
    if (!raw) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!isValidSession(parsed)) {
        await SecureStore.deleteItemAsync(SESSION_KEY);
        return null;
      }
      return parsed;
    } catch {
      await SecureStore.deleteItemAsync(SESSION_KEY);
      return null;
    }
  },

  async save(session: AuthSession) {
    await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
  },

  async clear() {
    await SecureStore.deleteItemAsync(SESSION_KEY);
  },
};
