import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import { test } from 'node:test';
import { createApp } from '../src/app';
import { env } from '../src/config/env';

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

async function signup(baseUrl: string, role: 'rider' | 'driver') {
  const response = await postJson(baseUrl, '/api/auth/signup', {
    email: `${role}-${randomUUID()}@example.com`,
    password: 'Password123!',
    role
  });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.ok, true);
  return body as { user: { id: string }; accessToken: string };
}

async function loginAdmin(baseUrl: string) {
  const response = await postJson(baseUrl, '/api/auth/login', {
    email: 'admin@drive.com',
    password: env.adminSeedPassword
  });
  assert.equal(response.status, 200);
  const body = await response.json();
  return body.accessToken as string;
}

test('rider-facing trip history, detail, receipt, notification, cancellation, and review flows work together', async () => {
  await withServer(async baseUrl => {
    const rider = await signup(baseUrl, 'rider');
    const driver = await signup(baseUrl, 'driver');
    const adminToken = await loginAdmin(baseUrl);

    await postJson(baseUrl, '/api/drivers/apply', {}, driver.accessToken);
    await postJson(baseUrl, '/api/drivers/documents', {
      documents: [
        { type: 'Driver License', fileName: 'rider-experience-license.jpg', expiryDate: '2030-08-31', documentNumber: 'RIDER-DRV-01' },
        { type: 'Selfie Photo', fileName: 'rider-experience-selfie.jpg', selfieMatchScore: 0.9 }
      ]
    }, driver.accessToken);
    await postJson(baseUrl, '/api/kyc/webhook', { userId: driver.user.id, status: 'verified' });
    await postJson(baseUrl, '/api/admin/approve-driver', { userId: driver.user.id, approved: true }, adminToken);
    await postJson(baseUrl, '/api/drivers/location', { lat: 37.72, lng: -122.41 }, driver.accessToken);
    await postJson(baseUrl, '/api/drivers/availability', { available: true }, driver.accessToken);

    const estimateResponse = await postJson(
      baseUrl,
      '/api/rides/estimate',
      { pickupLat: 37.7, pickupLng: -122.4, dropoffLat: 37.78, dropoffLng: -122.39, miles: 4, minutes: 10 },
      rider.accessToken
    );
    assert.equal(estimateResponse.status, 200);
    const estimateBody = await estimateResponse.json();
    assert.equal(estimateBody.ok, true);
    assert.equal(estimateBody.currency, 'USD');
    assert.ok(estimateBody.fareEstimateRange.low < estimateBody.fareEstimateRange.high);
    assert.equal(estimateBody.fareBreakdown.fareEstimate, estimateBody.fareEstimate);

    const firstRideRequest = await postJson(
      baseUrl,
      '/api/rides/request',
      { pickupLat: 37.7, pickupLng: -122.4, dropoffLat: 37.75, dropoffLng: -122.43, miles: 4, minutes: 10 },
      rider.accessToken
    );
    const firstRide = await firstRideRequest.json();
    assert.equal(firstRide.ok, true);
    assert.equal(firstRide.ride.status, 'accepted');

    const historyBeforeCancelResponse = await postJson(baseUrl, '/api/rides/history', {}, rider.accessToken);
    const historyBeforeCancel = await historyBeforeCancelResponse.json();
    assert.equal(historyBeforeCancel.ok, true);
    assert.equal(historyBeforeCancel.summary.total >= 1, true);
    assert.equal(historyBeforeCancel.summary.active >= 1, true);
    assert.equal(historyBeforeCancel.rides[0].availableActions.canCancel, true);

    const detailBeforeCancelResponse = await postJson(baseUrl, '/api/rides/detail', { rideId: firstRide.ride.id }, rider.accessToken);
    const detailBeforeCancel = await detailBeforeCancelResponse.json();
    assert.equal(detailBeforeCancel.ok, true);
    assert.equal(detailBeforeCancel.notifications.length >= 2, true);
    assert.equal(detailBeforeCancel.ride.availableActions.canTrackDriver, true);

    const pendingReceiptResponse = await postJson(baseUrl, '/api/rides/receipt', { rideId: firstRide.ride.id }, rider.accessToken);
    const pendingReceipt = await pendingReceiptResponse.json();
    assert.equal(pendingReceipt.error, 'receipt unavailable until the ride is completed or canceled');

    const cancelResponse = await postJson(
      baseUrl,
      '/api/rides/cancel',
      { rideId: firstRide.ride.id, reason: 'plans_changed' },
      rider.accessToken
    );
    const cancelBody = await cancelResponse.json();
    assert.equal(cancelBody.ok, true);
    assert.equal(cancelBody.ride.status, 'canceled');
    assert.equal(cancelBody.cancellation.cancellationReason, 'plans_changed');
    assert.equal(cancelBody.receipt.receiptType, 'ride_cancellation');

    const secondRideRequest = await postJson(
      baseUrl,
      '/api/rides/request',
      { pickupLat: 37.7, pickupLng: -122.4, dropoffLat: 37.76, dropoffLng: -122.45, miles: 6, minutes: 14 },
      rider.accessToken
    );
    const secondRide = await secondRideRequest.json();
    assert.equal(secondRide.ok, true);
    assert.equal(secondRide.ride.status, 'accepted');

    const arriveResponse = await postJson(baseUrl, '/api/rides/arrive', { rideId: secondRide.ride.id }, driver.accessToken);
    const arriveBody = await arriveResponse.json();
    assert.equal(arriveBody.ok, true);
    assert.equal(arriveBody.ride.status, 'arrived_at_pickup');

    const startResponse = await postJson(baseUrl, '/api/rides/start', { rideId: secondRide.ride.id, riderConfirmed: true }, driver.accessToken);
    const startBody = await startResponse.json();
    assert.equal(startBody.ok, true);
    assert.equal(startBody.ride.status, 'started');

    const invalidCancelResponse = await postJson(baseUrl, '/api/rides/cancel', { rideId: secondRide.ride.id }, rider.accessToken);
    const invalidCancelBody = await invalidCancelResponse.json();
    assert.equal(invalidCancelBody.error, 'cannot cancel started ride');

    const completeResponse = await postJson(baseUrl, '/api/rides/complete', { rideId: secondRide.ride.id }, driver.accessToken);
    const completeBody = await completeResponse.json();
    assert.equal(completeBody.ok, true);
    assert.equal(completeBody.ride.status, 'completed');
    assert.equal(completeBody.receipt.totalCents > 0, true);

    const ratingResponse = await postJson(
      baseUrl,
      '/api/rides/rate',
      { rideId: secondRide.ride.id, rating: 5, review: 'Smooth pickup and great communication.' },
      rider.accessToken
    );
    const ratingBody = await ratingResponse.json();
    assert.equal(ratingBody.ok, true);
    assert.equal(ratingBody.rating, 5);
    assert.equal(ratingBody.review, 'Smooth pickup and great communication.');
    assert.equal(ratingBody.driverRating, 5);

    const thirdRideRequest = await postJson(
      baseUrl,
      '/api/rides/request',
      { pickupLat: 37.7, pickupLng: -122.4, dropoffLat: 37.77, dropoffLng: -122.47, miles: 2, minutes: 8 },
      rider.accessToken
    );
    const thirdRide = await thirdRideRequest.json();
    assert.equal(thirdRide.ok, true);
    await postJson(baseUrl, '/api/rides/arrive', { rideId: thirdRide.ride.id }, driver.accessToken);

    const lateCancelResponse = await postJson(baseUrl, '/api/rides/cancel', { rideId: thirdRide.ride.id, reason: 'late_cancel' }, rider.accessToken);
    const lateCancelBody = await lateCancelResponse.json();
    assert.equal(lateCancelBody.ok, true);
    assert.equal(lateCancelBody.cancellation.cancellationFeeCents, 400);
    assert.equal(lateCancelBody.receipt.totalCents, 400);

    const historyAfterCompleteResponse = await postJson(baseUrl, '/api/rides/history', { limit: 10 }, rider.accessToken);
    const historyAfterComplete = await historyAfterCompleteResponse.json();
    assert.equal(historyAfterComplete.ok, true);
    assert.equal(historyAfterComplete.summary.total >= 2, true);
    assert.equal(historyAfterComplete.summary.completed >= 1, true);
    assert.equal(historyAfterComplete.summary.canceled >= 1, true);

    const detailAfterCompleteResponse = await postJson(baseUrl, '/api/rides/detail', { rideId: secondRide.ride.id }, rider.accessToken);
    const detailAfterComplete = await detailAfterCompleteResponse.json();
    assert.equal(detailAfterComplete.ok, true);
    assert.equal(detailAfterComplete.ride.review, 'Smooth pickup and great communication.');
    assert.equal(detailAfterComplete.receipt.receiptType, 'ride_receipt');
    assert.equal(detailAfterComplete.notifications.some((event: any) => event.type === 'ride_completed'), true);
    assert.equal(detailAfterComplete.notifications.some((event: any) => event.type === 'ride_rated'), true);

    const finalReceiptResponse = await postJson(baseUrl, '/api/rides/receipt', { rideId: secondRide.ride.id }, rider.accessToken);
    const finalReceipt = await finalReceiptResponse.json();
    assert.equal(finalReceipt.ok, true);
    assert.equal(finalReceipt.receipt.paymentStatus, 'settled_internal');
    assert.equal(finalReceipt.receipt.totalCents, Math.round(secondRide.ride.fareEstimate * 100));

    const notificationsResponse = await postJson(baseUrl, '/api/rides/notifications', { limit: 20 }, rider.accessToken);
    const notificationsBody = await notificationsResponse.json();
    assert.equal(notificationsBody.ok, true);
    assert.equal(notificationsBody.total >= 6, true);
    assert.equal(notificationsBody.notifications.some((event: any) => event.rideId === firstRide.ride.id), true);
    assert.equal(notificationsBody.notifications.some((event: any) => event.rideId === secondRide.ride.id), true);
  });
});
