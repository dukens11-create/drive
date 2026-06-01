import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import { test } from 'node:test';
import { createApp } from '../src/app';
import { store } from '../src/database/data.store';
import { getRealtimeDispatchSnapshot } from '../src/services/realtime-dispatch.service';

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

test('dispatch backend compatibility endpoints expose realtime driver, rider, request, and trip sync', async () => {
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

    assert.equal(driverOne.ok, true);
    assert.equal(driverTwo.ok, true);
    assert.equal(rider.ok, true);
    assert.equal(Array.isArray(rider.profile.favoriteLocations), true);

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
      store.kycStatus.set(driver.user.id, 'verified');
    });

    let response = await requestJson(baseUrl, `/api/drivers/${driverOne.user.id}/location`, 'POST', {
      lat: 37.78,
      lng: -122.41,
      accuracy: 5,
      heading: 90,
      speed: 12
    }, driverOne.accessToken);
    assert.equal((await response.json()).ok, true);

    response = await requestJson(baseUrl, `/api/drivers/${driverTwo.user.id}/location`, 'POST', {
      lat: 37.8,
      lng: -122.42,
      accuracy: 6,
      heading: 180,
      speed: 9
    }, driverTwo.accessToken);
    assert.equal((await response.json()).ok, true);

    response = await requestJson(baseUrl, `/api/drivers/${driverOne.user.id}/status`, 'PUT', { status: 'online' }, driverOne.accessToken);
    assert.equal((await response.json()).profile.availabilityStatus, 'online');

    response = await requestJson(baseUrl, `/api/drivers/${driverTwo.user.id}/status`, 'PUT', { status: 'online' }, driverTwo.accessToken);
    assert.equal((await response.json()).profile.availabilityStatus, 'online');

    response = await requestJson(baseUrl, '/api/riders/location', 'POST', {
      lat: 37.781,
      lng: -122.409,
      vehiclePreference: 'comfort',
      routePreference: 'fastest'
    }, rider.accessToken);
    const riderLocationBody = await response.json();
    assert.equal(riderLocationBody.ok, true);
    assert.equal(riderLocationBody.profile.vehiclePreference, 'comfort');

    response = await requestJson(baseUrl, '/api/drivers/nearby?lat=37.781&lng=-122.409&radiusMiles=10', 'GET', undefined, rider.accessToken);
    const nearbyBody = await response.json();
    assert.equal(nearbyBody.ok, true);
    assert.equal(nearbyBody.drivers.length >= 2, true);
    assert.equal(nearbyBody.drivers[0].driverId, driverOne.user.id);

    response = await requestJson(baseUrl, '/api/rides/request', 'POST', {
      pickupLat: 37.781,
      pickupLng: -122.409,
      dropoffLat: 37.79,
      dropoffLng: -122.4,
      miles: 3.5,
      minutes: 11,
      vehiclePreference: 'comfort',
      routePreference: 'fastest',
      favoriteLocationLabel: 'Office'
    }, rider.accessToken);
    const rideRequestBody = await response.json();
    assert.equal(rideRequestBody.ok, true);
    assert.equal(rideRequestBody.ride.status, 'requested');
    assert.equal(rideRequestBody.request.status, 'broadcasting');
    assert.equal(rideRequestBody.request.broadcastedDrivers.length, 2);
    assert.match(rideRequestBody.request.expiresAt, /\d{4}-\d{2}-\d{2}T/);

    const rideId = rideRequestBody.ride.id;

    response = await requestJson(baseUrl, `/api/rides/${rideId}/accept`, 'POST', {}, driverOne.accessToken);
    const acceptBody = await response.json();
    assert.equal(acceptBody.ok, true);
    assert.equal(acceptBody.ride.status, 'accepted');
    assert.equal(acceptBody.request.acceptedDriverId, driverOne.user.id);

    response = await requestJson(baseUrl, `/api/rides/${rideId}/accept`, 'POST', {}, driverTwo.accessToken);
    const secondAcceptBody = await response.json();
    assert.equal(secondAcceptBody.error, 'ride is already accepted by another driver');

    response = await requestJson(baseUrl, `/api/rides/${rideId}/status`, 'PUT', { status: 'started' }, driverOne.accessToken);
    assert.equal((await response.json()).ride.status, 'started');

    response = await requestJson(baseUrl, `/api/rides/${rideId}/status`, 'PUT', { status: 'completed' }, driverOne.accessToken);
    assert.equal((await response.json()).ride.status, 'completed');

    response = await requestJson(baseUrl, `/api/rides/${rideId}/rate`, 'POST', { rating: 5, review: 'Great trip' }, rider.accessToken);
    const ratingBody = await response.json();
    assert.equal(ratingBody.ok, true);
    assert.equal(ratingBody.rating, 5);

    response = await requestJson(baseUrl, `/api/rides/${rideId}`, 'GET', undefined, rider.accessToken);
    const rideDetailBody = await response.json();
    assert.equal(rideDetailBody.ok, true);
    assert.equal(rideDetailBody.request.status, 'completed');
    assert.equal(rideDetailBody.request.responses.some((item: { driverId: string; status: string }) => item.driverId === driverTwo.user.id && item.status === 'ignored'), true);

    const snapshot = getRealtimeDispatchSnapshot();
    assert.equal(snapshot.provider, 'firebase');
    assert.equal(snapshot.requests.some(request => request.rideId === rideId && request.acceptedDriverId === driverOne.user.id), true);
    assert.equal(snapshot.riders.some(entry => entry && entry.userId === rider.user.id && entry.routePreference === 'fastest'), true);
    assert.equal(snapshot.locations.some(point => point.driverId === driverOne.user.id && point.heading === 90), true);
    ['driver_location_updated', 'rider_location_updated', 'driver_status_changed', 'ride_requested', 'ride_accepted', 'ride_completed', 'rider_rating_submitted'].forEach(type => {
      assert.equal(snapshot.events.some(event => event.type === type && (event.entityId === rideId || event.entityId === driverOne.user.id || event.entityId === rider.user.id)), true);
    });
    assert.equal(store.riders.get(rider.user.id)?.currentTripId, undefined);
  });
});
