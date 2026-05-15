import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { AddressInfo } from 'node:net';
import { randomUUID } from 'node:crypto';
import { createApp } from './app';

async function withServer(run: (baseUrl: string) => Promise<void>) {
  const { httpServer } = createApp();
  // Use port 0 so the OS assigns a free port for isolated parallel-safe test execution.
  await new Promise<void>(resolve => {
    httpServer.listen(0, '127.0.0.1', () => resolve());
  });

  try {
    const address = httpServer.address() as AddressInfo;
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve, reject) => {
      httpServer.close(err => (err ? reject(err) : resolve()));
    });
  }
}

async function postJson(baseUrl: string, path: string, body: Record<string, unknown>, token?: string) {
  return fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(body)
  });
}

async function signup(baseUrl: string, role: 'rider' | 'driver' | 'merchant' = 'rider') {
  const response = await postJson(baseUrl, '/api/auth/signup', {
    email: `${role}-${randomUUID()}@example.com`,
    password: 'password123',
    role
  });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.ok, true);
  return body as { user: { id: string }; accessToken: string; refreshToken: string };
}

test('GET /health returns service status payload', async () => {
  await withServer(async baseUrl => {
    const response = await fetch(`${baseUrl}/health`);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.deepEqual(body, { ok: true, service: 'flupflap-ride-v7' });
  });
});

test('GET /readyz returns readiness payload', async () => {
  await withServer(async baseUrl => {
    const response = await fetch(`${baseUrl}/readyz`);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.ok, true);
    assert.equal(typeof body.uptimeSeconds, 'number');
    assert.equal(body.uptimeSeconds >= 0, true);
  });
});

test('POST /api/auth/signup creates user and returns tokens', async () => {
  await withServer(async baseUrl => {
    const response = await postJson(baseUrl, '/api/auth/signup', {
      email: `user-${randomUUID()}@example.com`,
      password: 'password123',
      role: 'rider'
    });
    assert.equal(response.status, 200);
    const body = await response.json();

    assert.equal(body.ok, true);
    assert.equal(body.module, 'auth');
    assert.equal(body.action, 'signup');
    assert.equal(typeof body.user?.id, 'string');
    assert.equal(body.user?.password, undefined);
    assert.equal(typeof body.accessToken, 'string');
    assert.equal(typeof body.refreshToken, 'string');
  });
});

test('POST /api/auth/refresh rotates refresh token and logout revokes it', async () => {
  await withServer(async baseUrl => {
    const account = await signup(baseUrl, 'rider');

    const refreshResponse = await postJson(baseUrl, '/api/auth/refresh', { refreshToken: account.refreshToken });
    assert.equal(refreshResponse.status, 200);
    const refreshBody = await refreshResponse.json();
    assert.equal(refreshBody.ok, true);
    assert.equal(typeof refreshBody.accessToken, 'string');
    assert.equal(typeof refreshBody.refreshToken, 'string');
    assert.notEqual(refreshBody.refreshToken, account.refreshToken);

    const oldRefreshResponse = await postJson(baseUrl, '/api/auth/refresh', { refreshToken: account.refreshToken });
    const oldRefreshBody = await oldRefreshResponse.json();
    assert.equal(oldRefreshBody.error, 'invalid refresh token');

    const logoutResponse = await postJson(baseUrl, '/api/auth/logout', { refreshToken: refreshBody.refreshToken });
    const logoutBody = await logoutResponse.json();
    assert.equal(logoutBody.ok, true);
    assert.equal(logoutBody.revoked, true);

    const revokedRefreshResponse = await postJson(baseUrl, '/api/auth/refresh', { refreshToken: refreshBody.refreshToken });
    const revokedRefreshBody = await revokedRefreshResponse.json();
    assert.equal(revokedRefreshBody.error, 'invalid refresh token');
  });
});

test('ride and driver core flow enforces auth boundaries and status transitions', async () => {
  await withServer(async baseUrl => {
    const rider = await signup(baseUrl, 'rider');
    const driver = await signup(baseUrl, 'driver');

    const applyResponse = await postJson(baseUrl, '/api/drivers/apply', {}, driver.accessToken);
    const applyBody = await applyResponse.json();
    assert.equal(applyBody.ok, true);

    const documentsResponse = await postJson(baseUrl, '/api/drivers/documents', { documents: ['license', 'insurance'] }, driver.accessToken);
    const documentsBody = await documentsResponse.json();
    assert.equal(documentsBody.profile.status, 'approved');

    const availabilityResponse = await postJson(baseUrl, '/api/drivers/availability', { available: true }, driver.accessToken);
    const availabilityBody = await availabilityResponse.json();
    assert.equal(availabilityBody.profile.available, true);

    const rideRequestResponse = await postJson(baseUrl, '/api/rides/request', { pickupLat: 37.7, pickupLng: -122.4 }, rider.accessToken);
    const rideRequestBody = await rideRequestResponse.json();
    assert.equal(rideRequestBody.ok, true);
    assert.equal(rideRequestBody.ride.riderId, rider.user.id);
    assert.equal(rideRequestBody.dispatch.selected.driverId, driver.user.id);

    const rideId = rideRequestBody.ride.id;

    const riderAcceptAttempt = await postJson(baseUrl, '/api/rides/accept', { rideId }, rider.accessToken);
    assert.equal(riderAcceptAttempt.status, 403);

    const acceptResponse = await postJson(baseUrl, '/api/rides/accept', { rideId }, driver.accessToken);
    const acceptBody = await acceptResponse.json();
    assert.equal(acceptBody.ride.status, 'accepted');
    assert.equal(acceptBody.ride.driverId, driver.user.id);

    const startResponse = await postJson(baseUrl, '/api/rides/start', { rideId }, driver.accessToken);
    const startBody = await startResponse.json();
    assert.equal(startBody.ride.status, 'started');

    const riderCompleteAttempt = await postJson(baseUrl, '/api/rides/complete', { rideId }, rider.accessToken);
    assert.equal(riderCompleteAttempt.status, 403);

    const completeResponse = await postJson(baseUrl, '/api/rides/complete', { rideId }, driver.accessToken);
    const completeBody = await completeResponse.json();
    assert.equal(completeBody.ride.status, 'completed');
    assert.equal(completeBody.amountCents > 0, true);

    const ratingResponse = await postJson(baseUrl, '/api/rides/rate', { rideId, rating: 5 }, rider.accessToken);
    const ratingBody = await ratingResponse.json();
    assert.equal(ratingBody.ok, true);
    assert.equal(ratingBody.rating, 5);

    const earningsResponse = await postJson(baseUrl, '/api/drivers/earnings', {}, driver.accessToken);
    const earningsBody = await earningsResponse.json();
    assert.equal(earningsBody.ok, true);
    assert.equal(earningsBody.earningsCents > 0, true);
  });
});
