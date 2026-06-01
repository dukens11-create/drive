import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { test } from 'node:test';
import type { AddressInfo } from 'node:net';
import { randomUUID } from 'node:crypto';
import { createApp } from '../src/app';

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
    password: 'Password123!',
    role
  });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.ok, true);
  return body as { user: { id: string }; accessToken: string; refreshToken: string };
}

const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Decode(str: string): Buffer {
  const clean = str.toUpperCase().replace(/[^A-Z2-7]/g, '');
  const bytes: number[] = [];
  let bits = 0;
  let value = 0;

  for (const char of clean) {
    const index = BASE32_CHARS.indexOf(char);
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

function generateTotp(secret: string, window = 0) {
  const key = base32Decode(secret);
  const counter = Math.floor(Date.now() / 1000 / 30) + window;
  const counterBuf = Buffer.alloc(8);
  counterBuf.writeBigUInt64BE(BigInt(counter));
  const hmac = createHmac('sha1', key).update(counterBuf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code = (
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff)
  ) % 1000000;
  return code.toString().padStart(6, '0');
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

test('GET / serves the professional dashboard login page', async () => {
  await withServer(async baseUrl => {
    const response = await fetch(`${baseUrl}/`);
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type') ?? '', /text\/html/);

    const body = await response.text();
    assert.match(body, /Drive Platform/);
    assert.match(body, /Admin Login/);
    assert.match(body, /<option value="admin" selected>Admin<\/option>/);
    assert.doesNotMatch(body, /<option value="driver">Driver<\/option>/);
    assert.doesNotMatch(body, /<option value="rider" selected>Rider<\/option>/);
    assert.match(body, /Professional visibility across rides, drivers, support, and payments\./);
    ['Active Drivers', 'Live Rides', 'Gross Revenue', 'Support Queue'].forEach(metricLabel => {
      assert.match(body, new RegExp(metricLabel));
    });
  });

  test('GET /driver-dashboard.html is compatible with the default CSP', async () => {
    await withServer(async baseUrl => {
      const response = await fetch(`${baseUrl}/driver-dashboard.html`);
      assert.equal(response.status, 200);
      assert.match(response.headers.get('content-security-policy') ?? '', /script-src 'self'/);

      const body = await response.text();
      assert.match(body, /<script src="\/driver-dashboard\.js"><\/script>/);
      ['toggle-availability-button', 'Ride History', 'Real-time Map', 'Performance Stats', 'Support \/ Help', 'Follow Driver: ON', 'Simulate GPS', 'ETA Pickup'].forEach(label => {
        assert.match(body, new RegExp(label));
      });
      assert.doesNotMatch(body, /\s(onclick|onsubmit)=/);
      assert.doesNotMatch(body, /<script>([\s\S]*?)<\/script>/i);
    });
  });
});

test('GET /driver-settings.html serves driver settings page', async () => {
  await withServer(async baseUrl => {
    const response = await fetch(`${baseUrl}/driver-settings.html`);
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type') ?? '', /text\/html/);

    const body = await response.text();
    assert.match(body, /Driver Settings/);
    assert.match(body, /Emergency Contact/);
    assert.match(body, /<script src="\/driver-settings\.js"><\/script>/);
    assert.doesNotMatch(body, /\s(onclick|onsubmit)=/);
    assert.doesNotMatch(body, /<script>([\s\S]*?)<\/script>/i);
  });
});

test('GET /drivers.html serves the dedicated driver login page', async () => {
  await withServer(async baseUrl => {
    const response = await fetch(`${baseUrl}/drivers.html`);
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type') ?? '', /text\/html/);

    const body = await response.text();
    assert.match(body, /Drive Driver/);
    assert.match(body, /Driver Login/);
    assert.match(body, /<script src="\/drivers\.js" defer><\/script>/);
  });
});

test('GET /users.html serves the dedicated rider login page', async () => {
  await withServer(async baseUrl => {
    const response = await fetch(`${baseUrl}/users.html`);
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type') ?? '', /text\/html/);

    const body = await response.text();
    assert.match(body, /Drive Rider/);
    assert.match(body, /User \/ Rider Login/);
    assert.match(body, /<script src="\/users\.js" defer><\/script>/);
  });
});

test('POST /api/auth/signup creates user and returns tokens', async () => {
  await withServer(async baseUrl => {
    const response = await postJson(baseUrl, '/api/auth/signup', {
      email: `user-${randomUUID()}@example.com`,
      password: 'Password123!',
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

test('POST /api/auth/signup for driver auto-initializes driver profile and dashboard data endpoints', async () => {
  await withServer(async baseUrl => {
    const driver = await signup(baseUrl, 'driver');

    const profileResponse = await getJson(baseUrl, '/api/drivers/me', driver.accessToken);
    assert.equal(profileResponse.status, 200);
    const profileBody = await profileResponse.json();
    assert.equal(profileBody.ok, true);
    assert.equal(profileBody.profile.userId, driver.user.id);
    assert.equal(profileBody.profile.availabilityStatus, 'offline');
    assert.equal(profileBody.profile.rating, 5);
    assert.deepEqual(profileBody.profile.documents, []);

    const ridesResponse = await getJson(baseUrl, '/api/rides/history', driver.accessToken);
    assert.equal(ridesResponse.status, 200);
    const ridesBody = await ridesResponse.json();
    assert.equal(ridesBody.ok, true);
    assert.deepEqual(ridesBody.rides, []);

    const earningsResponse = await postJson(baseUrl, '/api/drivers/earnings', {}, driver.accessToken);
    assert.equal(earningsResponse.status, 200);
    const earningsBody = await earningsResponse.json();
    assert.equal(earningsBody.ok, true);
    assert.equal(earningsBody.earningsCents, 0);
    assert.equal(earningsBody.rideCount, 0);
  });
});

test('POST /api/auth/signup rejects weak passwords', async () => {
  await withServer(async baseUrl => {
    const response = await postJson(baseUrl, '/api/auth/signup', {
      email: `weak-${randomUUID()}@example.com`,
      password: 'password123',
      role: 'rider'
    });
    assert.equal(response.status, 400);
    const body = await response.json();
    assert.equal(Array.isArray(body.error?.fieldErrors?.password), true);
    assert.equal(body.error.fieldErrors.password.some((message: string) => message.includes('12 characters')), true);
    assert.equal(body.error.fieldErrors.password.some((message: string) => message.includes('uppercase')), true);
    assert.equal(body.error.fieldErrors.password.some((message: string) => message.includes('symbol')), true);
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

test('2FA login requires otp and exposes session/login history management', async () => {
  await withServer(async baseUrl => {
    const email = `secure-${randomUUID()}@example.com`;
    const password = 'Password123!';

    const signupResponse = await postJson(baseUrl, '/api/auth/signup', {
      email,
      password,
      role: 'rider'
    });
    const signupBody = await signupResponse.json();
    const accessToken = signupBody.accessToken as string;

    const setupResponse = await postJson(baseUrl, '/api/2fa/setup', {}, accessToken);
    assert.equal(setupResponse.status, 200);
    const setupBody = await setupResponse.json();
    const otpToken = generateTotp(setupBody.secret);

    const verifyResponse = await postJson(baseUrl, '/api/2fa/verify', { token: otpToken }, accessToken);
    assert.equal(verifyResponse.status, 200);

    const missingOtpLoginResponse = await postJson(baseUrl, '/api/auth/login', { email, password });
    const missingOtpLoginBody = await missingOtpLoginResponse.json();
    assert.equal(missingOtpLoginBody.error, '2FA token required');

    const loginResponse = await postJson(baseUrl, '/api/auth/login', { email, password, otpToken });
    assert.equal(loginResponse.status, 200);
    const loginBody = await loginResponse.json();
    assert.equal(loginBody.ok, true);
    assert.equal(typeof loginBody.refreshToken, 'string');

    const sessionsResponse = await getJson(baseUrl, '/api/auth/sessions', loginBody.accessToken);
    assert.equal(sessionsResponse.status, 200);
    const sessionsBody = await sessionsResponse.json();
    assert.equal(sessionsBody.ok, true);
    assert.equal(Array.isArray(sessionsBody.sessions), true);
    assert.equal(sessionsBody.sessions.length >= 2, true);
    assert.equal(typeof sessionsBody.sessions[0].sessionId, 'string');
    assert.equal(typeof sessionsBody.sessions[0].deviceName, 'string');

    const historyResponse = await getJson(baseUrl, '/api/auth/login-history', loginBody.accessToken);
    assert.equal(historyResponse.status, 200);
    const historyBody = await historyResponse.json();
    assert.equal(historyBody.ok, true);
    assert.equal(historyBody.entries.some((entry: { action: string }) => entry.action === 'auth_login_succeeded'), true);
    assert.equal(historyBody.entries.some((entry: { action: string }) => entry.action === 'auth_2fa_enabled'), true);

    const targetSession = sessionsBody.sessions.find((session: { sessionId: string }) => session.sessionId !== sessionsBody.sessions[0].sessionId);
    assert.equal(typeof targetSession?.sessionId, 'string');

    const revokeResponse = await postJson(baseUrl, '/api/auth/revoke-session', { sessionId: targetSession.sessionId }, loginBody.accessToken);
    assert.equal(revokeResponse.status, 200);
    const revokeBody = await revokeResponse.json();
    assert.equal(revokeBody.revoked, true);

    const revokedRefreshResponse = await postJson(baseUrl, '/api/auth/refresh', { refreshToken: signupBody.refreshToken });
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
