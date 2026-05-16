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

async function getJson(baseUrl: string, path: string, token?: string) {
  return fetch(`${baseUrl}${path}`, {
    headers: token ? { authorization: `Bearer ${token}` } : {}
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
    assert.equal(documentsBody.profile.status, 'pending');
    assert.equal(documentsBody.profile.verificationState, 'kyc_pending');

    const kycWebhookResponse = await postJson(baseUrl, '/api/kyc/webhook', { userId: driver.user.id, status: 'verified' });
    const kycWebhookBody = await kycWebhookResponse.json();
    assert.equal(kycWebhookBody.ok, true);

    const locationResponse = await postJson(baseUrl, '/api/drivers/location', { lat: 37.72, lng: -122.41 }, driver.accessToken);
    const locationBody = await locationResponse.json();
    assert.equal(locationBody.ok, true);

    const availabilityResponse = await postJson(baseUrl, '/api/drivers/availability', { status: 'online' }, driver.accessToken);
    const availabilityBody = await availabilityResponse.json();
    assert.equal(availabilityBody.profile.available, true);

    const driverProfileResponse = await getJson(baseUrl, '/api/drivers/me', driver.accessToken);
    const driverProfileBody = await driverProfileResponse.json();
    assert.equal(driverProfileBody.ok, true);
    assert.equal(driverProfileBody.profile.verificationState, 'verified');
    assert.equal(driverProfileBody.profile.availabilityStatus, 'online');

    const rideRequestResponse = await postJson(baseUrl, '/api/rides/request', { pickupLat: 37.7, pickupLng: -122.4 }, rider.accessToken);
    const rideRequestBody = await rideRequestResponse.json();
    assert.equal(rideRequestBody.ok, true);
    assert.equal(rideRequestBody.ride.riderId, rider.user.id);
    assert.equal(rideRequestBody.dispatch.selected.driverId, driver.user.id);

    const rideId = rideRequestBody.ride.id;

    const riderHistoryResponse = await getJson(baseUrl, '/api/rides/history', rider.accessToken);
    const riderHistoryBody = await riderHistoryResponse.json();
    assert.equal(riderHistoryBody.ok, true);
    assert.equal(riderHistoryBody.rides.some((ride: { id: string }) => ride.id === rideId), true);

    const riderDetailResponse = await getJson(baseUrl, `/api/rides/${rideId}`, rider.accessToken);
    const riderDetailBody = await riderDetailResponse.json();
    assert.equal(riderDetailBody.ok, true);
    assert.equal(riderDetailBody.ride.id, rideId);

    const unrelatedRider = await signup(baseUrl, 'rider');
    const unrelatedRiderDetailResponse = await getJson(baseUrl, `/api/rides/${rideId}`, unrelatedRider.accessToken);
    const unrelatedRiderDetailBody = await unrelatedRiderDetailResponse.json();
    assert.equal(unrelatedRiderDetailBody.error, 'forbidden');

    const riderAcceptAttempt = await postJson(baseUrl, '/api/rides/accept', { rideId }, rider.accessToken);
    assert.equal(riderAcceptAttempt.status, 403);

    const acceptResponse = await postJson(baseUrl, '/api/rides/accept', { rideId }, driver.accessToken);
    const acceptBody = await acceptResponse.json();
    assert.equal(acceptBody.ride.status, 'accepted');
    assert.equal(acceptBody.ride.driverId, driver.user.id);

    const startResponse = await postJson(baseUrl, '/api/rides/start', { rideId }, driver.accessToken);
    const startBody = await startResponse.json();
    assert.equal(startBody.ride.status, 'started');

    const currentTripResponse = await getJson(baseUrl, '/api/drivers/current-trip', driver.accessToken);
    const currentTripBody = await currentTripResponse.json();
    assert.equal(currentTripBody.ok, true);
    assert.equal(currentTripBody.ride.id, rideId);
    assert.equal(currentTripBody.ride.status, 'started');

    const riderCompleteAttempt = await postJson(baseUrl, '/api/rides/complete', { rideId }, rider.accessToken);
    assert.equal(riderCompleteAttempt.status, 403);

    const completeResponse = await postJson(baseUrl, '/api/rides/complete', { rideId }, driver.accessToken);
    const completeBody = await completeResponse.json();
    assert.equal(completeBody.ride.status, 'completed');
    assert.equal(completeBody.amountCents > 0, true);

    const emptyCurrentTripResponse = await getJson(baseUrl, '/api/drivers/current-trip', driver.accessToken);
    const emptyCurrentTripBody = await emptyCurrentTripResponse.json();
    assert.equal(emptyCurrentTripBody.ok, true);
    assert.equal(emptyCurrentTripBody.ride, null);

    const ratingResponse = await postJson(baseUrl, '/api/rides/rate', { rideId, rating: 5 }, rider.accessToken);
    const ratingBody = await ratingResponse.json();
    assert.equal(ratingBody.ok, true);
    assert.equal(ratingBody.rating, 5);

    const earningsResponse = await postJson(baseUrl, '/api/drivers/earnings', {}, driver.accessToken);
    const earningsBody = await earningsResponse.json();
    assert.equal(earningsBody.ok, true);
    assert.equal(earningsBody.earningsCents > 0, true);

    const driverHistoryResponse = await getJson(baseUrl, '/api/rides/history', driver.accessToken);
    const driverHistoryBody = await driverHistoryResponse.json();
    assert.equal(driverHistoryBody.ok, true);
    assert.equal(driverHistoryBody.rides.some((ride: { id: string; status: string }) => ride.id === rideId && ride.status === 'completed'), true);
  });
});
