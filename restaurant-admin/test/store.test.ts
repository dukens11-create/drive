import test from 'node:test';
import assert from 'node:assert/strict';

import { createAppStore, pushAlert, setEmail, setLiveOrderCount, setSocketConnected, setVerified } from '../lib/store';

test('session actions update the verification state and email', () => {
  const store = createAppStore();

  store.dispatch(setVerified(true));
  store.dispatch(setEmail('owner@example.com'));

  const state = store.getState();
  assert.equal(state.session.verified, true);
  assert.equal(state.session.email, 'owner@example.com');
});

test('realtime actions update connectivity and keep only the newest 12 alerts', () => {
  const store = createAppStore();

  store.dispatch(setSocketConnected(true));
  store.dispatch(setLiveOrderCount(9));

  for (let index = 0; index < 14; index += 1) {
    store.dispatch(pushAlert({
      id: `alert-${index}`,
      createdAt: new Date(2026, 0, index + 1).toISOString(),
      title: `Alert ${index}`,
      message: `Message ${index}`
    }));
  }

  const state = store.getState();
  assert.equal(state.realtime.socketConnected, true);
  assert.equal(state.realtime.liveOrderCount, 9);
  assert.equal(state.realtime.alerts.length, 12);
  assert.equal(state.realtime.alerts[0]?.id, 'alert-13');
  assert.equal(state.realtime.alerts.at(-1)?.id, 'alert-2');
});
