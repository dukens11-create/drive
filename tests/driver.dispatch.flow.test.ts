import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import { test } from 'node:test';
import { createApp } from '../src/app';
import { store } from '../src/database/data.store';

async function withServer(run: (baseUrl: string) => Promise<void>) {
  const { httpServer } = createApp();
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

async function requestJson(baseUrl: string, path: string, method: string, body?: Record<string, unknown>, token?: string) {
  return fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(body ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: 'Bearer ' + token } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
}

test('driver dispatch aliases support online/offline, decline filtering, and uppercase status patches', async () => {
  await withServer(async baseUrl => {
    const driverOneRegister = await requestJson(baseUrl, '/api/drivers/register', 'POST', {
      email: `driver-one-${randomUUID()}@example.com`,
      password: 'Password123!'
    });
    const driverTwoRegister = await requestJson(baseUrl, '/api/drivers/register', 'POST', {
      email: `driver-two-${randomUUID()}@example.com`,
      password: 'Password123!'
    });
    const riderRegister = await requestJson(baseUrl, '/api/riders/register', 'POST', {
      email: `rider-${randomUUID()}@example.com`,
      password: 'Password123!'
    });

    const driverOne = await driverOneRegister.json();
    const driverTwo = await driverTwoRegister.json();
    const rider = await riderRegister.json();

    [driverOne, driverTwo].forEach(driver => {
      const profile = store.drivers.get(driver.user.id);
      assert.ok(profile);
      profile.documents = ['Driver License:2030-01-01:license.jpg', 'Selfie Photo:2030-01-01:selfie.jpg'];
      profile.verificationDocuments = [
        { id: `license-${driver.user.id}`, type: 'Driver License', fileName: 'license.jpg', uploadedAt: new Date().toISOString(), verificationStatus: 'approved' },
        { id: `selfie-${driver.user.id}`, type: 'Selfie Photo', fileName: 'selfie.jpg', uploadedAt: new Date().toISOString(), verificationStatus: 'auto_verified' }
      ];
      profile.selfieVerification = { status: 'matched', score: 0.98, fileName: 'selfie.jpg', checkedAt: new Date().toISOString() };
      profile.verificationReview = { status: 'approved', reviewedAt: new Date().toISOString(), reviewedBy: 'test' };
      profile.status = 'approved';
      profile.verificationState = 'verified';
      profile.availabilityStatus = 'offline';
      profile.available = false;
      profile.isOnline = false;
      store.kycStatus.set(driver.user.id, 'verified');
    });

    let response = await requestJson(baseUrl, `/api/drivers/${driverOne.user.id}/location`, 'POST', {
      lat: 37.78,
      lng: -122.41
    }, driverOne.accessToken);
    assert.equal((await response.json()).ok, true);

    response = await requestJson(baseUrl, `/api/drivers/${driverTwo.user.id}/location`, 'POST', {
      lat: 37.79,
      lng: -122.42
    }, driverTwo.accessToken);
    assert.equal((await response.json()).ok, true);

    response = await requestJson(baseUrl, `/api/drivers/${driverOne.user.id}/online`, 'POST', {}, driverOne.accessToken);
    let body = await response.json();
    assert.equal(body.ok, true);
    assert.equal(body.profile.availabilityStatus, 'online');
    assert.equal(body.profile.isOnline, true);
    assert.equal(typeof body.profile.lastStatusChangeAt, 'string');

    response = await requestJson(baseUrl, `/api/drivers/${driverTwo.user.id}/online`, 'POST', {}, driverTwo.accessToken);
    body = await response.json();
    assert.equal(body.ok, true);
    assert.equal(body.profile.availabilityStatus, 'online');

    response = await requestJson(baseUrl, '/api/rides/request', 'POST', {
      pickupLat: 37.781,
      pickupLng: -122.409,
      dropoffLat: 37.79,
      dropoffLng: -122.4,
      miles: 3.5,
      minutes: 11,
      pickupAddress: '123 Main St',
      dropoffAddress: '456 Oak Ave'
    }, rider.accessToken);
    const rideRequestBody = await response.json();
    assert.equal(rideRequestBody.ok, true);
    const rideId = rideRequestBody.ride.id;

    response = await requestJson(baseUrl, '/api/driver/ride-requests?status=SEARCHING&limit=20', 'GET', undefined, driverOne.accessToken);
    body = await response.json();
    assert.equal(body.ok, true);
    assert.equal(Array.isArray(body.requests), true);
    assert.equal(body.rides.some((ride: { rideId: string; dropoffAddress: string; timeLeft: number }) => ride.rideId === rideId && ride.dropoffAddress === '456 Oak Ave' && ride.timeLeft > 0), true);

    response = await requestJson(baseUrl, `/api/rides/${rideId}/decline`, 'POST', { reason: 'busy' }, driverOne.accessToken);
    body = await response.json();
    assert.equal(body.ok, true);
    assert.equal(body.success, true);
    assert.equal(body.request.responses.some((entry: { driverId: string; status: string }) => entry.driverId === driverOne.user.id && entry.status === 'rejected'), true);

    response = await requestJson(baseUrl, '/api/driver/ride-requests?status=SEARCHING&limit=20', 'GET', undefined, driverOne.accessToken);
    body = await response.json();
    assert.equal(body.rides.some((ride: { rideId: string }) => ride.rideId === rideId), false);

    response = await requestJson(baseUrl, '/api/driver/ride-requests?status=SEARCHING&limit=20', 'GET', undefined, driverTwo.accessToken);
    body = await response.json();
    assert.equal(body.rides.some((ride: { rideId: string }) => ride.rideId === rideId), true);

    response = await requestJson(baseUrl, `/api/rides/${rideId}/accept`, 'POST', {}, driverTwo.accessToken);
    body = await response.json();
    assert.equal(body.ok, true);
    assert.equal(body.success, true);
    assert.equal(body.status, 'ASSIGNED');

    response = await requestJson(baseUrl, `/api/rides/${rideId}/status`, 'PATCH', { status: 'ARRIVED' }, driverTwo.accessToken);
    body = await response.json();
    assert.equal(body.ok, true);
    assert.equal(body.ride.status, 'arrived_at_pickup');

    response = await requestJson(baseUrl, `/api/rides/${rideId}/status`, 'PATCH', { status: 'STARTED', riderConfirmed: true }, driverTwo.accessToken);
    body = await response.json();
    assert.equal(body.ok, true);
    assert.equal(body.ride.status, 'started');

    response = await requestJson(baseUrl, `/api/rides/${rideId}/status`, 'PATCH', { status: 'COMPLETED' }, driverTwo.accessToken);
    body = await response.json();
    assert.equal(body.ok, true);
    assert.equal(body.ride.status, 'completed');

    response = await requestJson(baseUrl, `/api/drivers/${driverOne.user.id}/offline`, 'POST', {}, driverOne.accessToken);
    body = await response.json();
    assert.equal(body.ok, true);
    assert.equal(body.profile.availabilityStatus, 'offline');
    assert.equal(body.profile.isOnline, false);
    assert.equal(body.profile.currentTripId, undefined);
  });
});
