import test from 'node:test';
import assert from 'node:assert/strict';

import { getStoredSession, setStoredSession } from '../lib/auth-storage';
import type { AuthSession } from '../lib/types';

type StorageRecord = Record<string, string>;

function createStorage(initial: StorageRecord = {}) {
  const store = new Map(Object.entries(initial));

  return {
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
    removeItem(key: string) {
      store.delete(key);
    }
  };
}

const storageKey = 'drive-passenger-web-session';

function setWindow(localStorage: ReturnType<typeof createStorage>) {
  Object.defineProperty(globalThis, 'window', {
    value: { localStorage },
    configurable: true,
    writable: true
  });
}

test('setStoredSession persists a session and getStoredSession reads it back', () => {
  const localStorage = createStorage();
  setWindow(localStorage);

  const session: AuthSession = {
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    user: {
      id: 'rider-1',
      email: 'rider@example.com',
      role: 'rider'
    }
  };

  setStoredSession(session);

  assert.deepEqual(getStoredSession(), session);
});

test('getStoredSession clears invalid JSON and returns null', () => {
  const localStorage = createStorage({
    [storageKey]: '{invalid-json'
  });
  setWindow(localStorage);

  assert.equal(getStoredSession(), null);
  assert.equal(localStorage.getItem(storageKey), null);
});

test('setStoredSession removes persisted state when session is null', () => {
  const localStorage = createStorage({
    [storageKey]: JSON.stringify({ stale: true })
  });
  setWindow(localStorage);

  setStoredSession(null);

  assert.equal(localStorage.getItem(storageKey), null);
});
