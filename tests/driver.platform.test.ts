import assert from 'node:assert/strict';
import { test } from 'node:test';
import { store } from '../src/database/data.store';
import * as admin from '../src/services/admin.service';
import * as drivers from '../src/services/drivers.service';
import * as kyc from '../src/services/kyc.service';
import * as rides from '../src/services/rides.service';

function resetDriverData() {
  store.drivers.clear();
  store.rides.clear();
  store.kycStatus.clear();
  store.walletTx.splice(0, store.walletTx.length);
}

async function approveDriver(userId: string) {
  const result = await admin.approve_driver({
    userId,
    approved: true,
    __actor: { id: 'admin_test', sub: 'admin_test', role: 'admin' }
  });
  assert.equal(result.ok, true);
}

test('driver onboarding progresses through documents and KYC before online', async () => {
  resetDriverData();
  await drivers.apply({ userId: 'driver_onboarding' });

  const earlyOnline = await drivers.availability({ userId: 'driver_onboarding', status: 'online' });
  assert.ok(earlyOnline.error);
  assert.equal(earlyOnline.error, 'driver is not verified');

  await drivers.documents({
    userId: 'driver_onboarding',
    documents: [
      { type: 'Driver License', fileName: 'license-front.jpg', expiryDate: '2030-08-31', documentNumber: 'DL-9999' },
      { type: 'Selfie Photo', fileName: 'selfie.jpg', selfieMatchScore: 0.91 }
    ]
  });
  let profile = store.drivers.get('driver_onboarding');
  assert.equal(profile?.verificationState, 'kyc_pending');
  assert.equal(profile?.selfieVerification?.status, 'matched');
  assert.match(profile?.verificationDocuments?.find(document => document.type === 'Driver License')?.ocrText || '', /DL-9999/);

  await kyc.webhook({ userId: 'driver_onboarding', status: 'verified' });
  profile = store.drivers.get('driver_onboarding');
  assert.equal(profile?.status, 'pending');
  assert.equal(profile?.verificationState, 'review_pending');

  await approveDriver('driver_onboarding');
  profile = store.drivers.get('driver_onboarding');
  assert.equal(profile?.userId, 'driver_onboarding');
  assert.equal(profile?.status, 'approved');
  assert.equal(profile?.verificationState, 'verified');

  await drivers.location({ userId: 'driver_onboarding', lat: 40.7, lng: -74.0 });
  const online = await drivers.availability({ userId: 'driver_onboarding', status: 'online' });
  assert.equal(online.ok, true);
  assert.equal(online.profile.availabilityStatus, 'online');
});

test('ride request auto-assigns an eligible online driver and releases on completion', async () => {
  resetDriverData();
  await drivers.apply({ userId: 'driver_dispatch' });
  await drivers.documents({
    userId: 'driver_dispatch',
    documents: [
      { type: 'Driver License', fileName: 'dispatch-license.jpg', expiryDate: '2030-08-31' },
      { type: 'Selfie Photo', fileName: 'dispatch-selfie.jpg', selfieMatchScore: 0.92 }
    ]
  });
  await kyc.webhook({ userId: 'driver_dispatch', status: 'verified' });
  await approveDriver('driver_dispatch');
  await drivers.location({ userId: 'driver_dispatch', lat: 10, lng: 10 });
  await drivers.availability({ userId: 'driver_dispatch', status: 'online' });

  const request = await rides.request({ riderId: 'rider_1', pickupLat: 10.01, pickupLng: 10.01, miles: 3, minutes: 8 });
  assert.equal(request.ok, true);
  assert.equal(request.ride.status, 'accepted');
  assert.equal(request.ride.driverId, 'driver_dispatch');
  assert.equal(request.dispatch.selected?.driverId, 'driver_dispatch');
  assert.equal(store.drivers.get('driver_dispatch')?.availabilityStatus, 'assigned');

  // start() accepts both 'accepted' and 'arrived_at_pickup' for backward compat;
  // this test exercises the direct accepted → started path.
  await rides.start({ rideId: request.ride.id, driverId: 'driver_dispatch' });
  const complete = await rides.complete({ rideId: request.ride.id, driverId: 'driver_dispatch' });
  assert.equal(complete.ok, true);
  assert.equal(store.drivers.get('driver_dispatch')?.availabilityStatus, 'online');
});

test('ride request stays unassigned when no dispatch-eligible drivers exist', async () => {
  resetDriverData();
  await drivers.apply({ userId: 'driver_ineligible' });
  await drivers.location({ userId: 'driver_ineligible', lat: 12, lng: 12 });

  const request = await rides.request({ riderId: 'rider_2', pickupLat: 12, pickupLng: 12, miles: 2, minutes: 5 });
  assert.equal(request.ok, true);
  assert.equal(request.ride.status, 'requested');
  assert.equal(request.ride.driverId, undefined);
  assert.equal(request.dispatch.selected, null);
});

test('driver can send trip chat and rate passenger after completion', async () => {
  resetDriverData();
  await drivers.apply({ userId: 'driver_feedback' });
  await drivers.documents({
    userId: 'driver_feedback',
    documents: [
      { type: 'Driver License', fileName: 'feedback-license.jpg', expiryDate: '2030-08-31' },
      { type: 'Selfie Photo', fileName: 'feedback-selfie.jpg', selfieMatchScore: 0.88 }
    ]
  });
  await kyc.webhook({ userId: 'driver_feedback', status: 'verified' });
  await approveDriver('driver_feedback');
  await drivers.location({ userId: 'driver_feedback', lat: 9, lng: 9 });
  await drivers.availability({ userId: 'driver_feedback', status: 'online' });

  const request = await rides.request({ riderId: 'rider_feedback', pickupLat: 9.01, pickupLng: 9.01, miles: 4, minutes: 10 });
  assert.equal(request.ok, true);
  assert.equal(request.ride.driverId, 'driver_feedback');

  const tripMessage = await rides.message({
    rideId: request.ride.id,
    message: 'I am arriving in 2 minutes.',
    actor: { id: 'driver_feedback', role: 'driver' }
  });
  assert.equal(tripMessage.ok, true);
  assert.equal(tripMessage.message.type, 'chat_message');

  await rides.start({ rideId: request.ride.id, driverId: 'driver_feedback' });
  await rides.complete({ rideId: request.ride.id, driverId: 'driver_feedback' });

  const passengerRating = await rides.ratePassenger({
    rideId: request.ride.id,
    rating: 5,
    comment: 'Great communication and on time.',
    actor: { id: 'driver_feedback', role: 'driver' }
  });
  assert.equal(passengerRating.ok, true);
  assert.equal(passengerRating.rating, 5);
});

async function setupVerifiedDriver(userId: string, lat: number, lng: number) {
  await drivers.apply({ userId });
  await drivers.documents({
    userId,
    documents: [
      { type: 'Driver License', fileName: `${userId}-license.jpg`, expiryDate: '2030-08-31' },
      { type: 'Selfie Photo', fileName: `${userId}-selfie.jpg`, selfieMatchScore: 0.9 }
    ]
  });
  await kyc.webhook({ userId, status: 'verified' });
  await approveDriver(userId);
  await drivers.location({ userId, lat, lng });
  await drivers.availability({ userId, status: 'online' });
}

test('driver arrives at pickup: status transitions to arrived_at_pickup and sets timestamps', async () => {
  resetDriverData();
  await setupVerifiedDriver('driver_arrive', 20, 20);

  const request = await rides.request({ riderId: 'rider_arrive', pickupLat: 20.01, pickupLng: 20.01, miles: 2, minutes: 5 });
  assert.equal(request.ride.status, 'accepted');
  assert.equal(request.ride.driverId, 'driver_arrive');

  const arrived = await rides.arrive({ rideId: request.ride.id, driverId: 'driver_arrive' });
  assert.equal(arrived.ok, true);
  assert.equal(arrived.ride.status, 'arrived_at_pickup');
  assert.ok(arrived.ride.arrivedAt, 'arrivedAt should be set');
  assert.ok(arrived.ride.waitingSince, 'waitingSince should be set');
});

test('driver arrive rejects wrong driver or wrong status', async () => {
  resetDriverData();
  await setupVerifiedDriver('driver_arrive_bad', 21, 21);

  const request = await rides.request({ riderId: 'rider_arrive_bad', pickupLat: 21.01, pickupLng: 21.01, miles: 2, minutes: 5 });
  assert.equal(request.ride.status, 'accepted');

  const wrongDriver = await rides.arrive({ rideId: request.ride.id, driverId: 'wrong_driver' });
  assert.ok(wrongDriver.error);

  await rides.arrive({ rideId: request.ride.id, driverId: 'driver_arrive_bad' });
  const doubleArrive = await rides.arrive({ rideId: request.ride.id, driverId: 'driver_arrive_bad' });
  assert.ok(doubleArrive.error, 'should not arrive twice');
});

test('full lifecycle: accepted → arrived_at_pickup → started → completed', async () => {
  resetDriverData();
  await setupVerifiedDriver('driver_full', 22, 22);

  const request = await rides.request({ riderId: 'rider_full', pickupLat: 22.01, pickupLng: 22.01, miles: 3, minutes: 7 });
  assert.equal(request.ride.status, 'accepted');

  const arrived = await rides.arrive({ rideId: request.ride.id, driverId: 'driver_full' });
  assert.equal(arrived.ride.status, 'arrived_at_pickup');

  const started = await rides.start({ rideId: request.ride.id, driverId: 'driver_full' });
  assert.equal(started.ok, true);
  assert.equal(started.ride.status, 'started');

  const complete = await rides.complete({ rideId: request.ride.id, driverId: 'driver_full' });
  assert.equal(complete.ok, true);
  assert.equal(store.drivers.get('driver_full')?.availabilityStatus, 'online');
});

test('driver reports rider no-show: ride canceled with rider_no_show reason', async () => {
  resetDriverData();
  await setupVerifiedDriver('driver_noshow', 23, 23);

  const request = await rides.request({ riderId: 'rider_noshow', pickupLat: 23.01, pickupLng: 23.01, miles: 2, minutes: 5 });
  await rides.arrive({ rideId: request.ride.id, driverId: 'driver_noshow' });

  const noShow = await rides.noShow({ rideId: request.ride.id, driverId: 'driver_noshow' });
  assert.equal(noShow.ok, true);
  assert.equal(noShow.ride.status, 'canceled');
  assert.equal(noShow.ride.cancellationReason, 'rider_no_show');
  assert.equal(noShow.ride.cancellationActorRole, 'driver');
  assert.ok(noShow.ride.noShowReportedAt, 'noShowReportedAt should be set');
  assert.equal(store.drivers.get('driver_noshow')?.availabilityStatus, 'online');
});

test('no-show requires arrived_at_pickup status first', async () => {
  resetDriverData();
  await setupVerifiedDriver('driver_noshow_early', 24, 24);

  const request = await rides.request({ riderId: 'rider_noshow_early', pickupLat: 24.01, pickupLng: 24.01, miles: 2, minutes: 5 });
  assert.equal(request.ride.status, 'accepted');

  const noShowEarly = await rides.noShow({ rideId: request.ride.id, driverId: 'driver_noshow_early' });
  assert.ok(noShowEarly.error, 'no-show should be blocked before arriving at pickup');
});

test('driver cancels trip with reason before pickup', async () => {
  resetDriverData();
  await setupVerifiedDriver('driver_cancel', 25, 25);

  const request = await rides.request({ riderId: 'rider_cancel', pickupLat: 25.01, pickupLng: 25.01, miles: 2, minutes: 5 });
  assert.equal(request.ride.status, 'accepted');

  const canceled = await rides.driverCancel({ rideId: request.ride.id, driverId: 'driver_cancel', reason: 'vehicle_issue' });
  assert.equal(canceled.ok, true);
  assert.equal(canceled.ride.status, 'canceled');
  assert.equal(canceled.ride.cancellationReason, 'vehicle_issue');
  assert.equal(canceled.ride.cancellationActorRole, 'driver');
  assert.equal(store.drivers.get('driver_cancel')?.availabilityStatus, 'online');
});

test('driver cancel is blocked once trip has started', async () => {
  resetDriverData();
  await setupVerifiedDriver('driver_cancel_started', 26, 26);

  const request = await rides.request({ riderId: 'rider_cancel_started', pickupLat: 26.01, pickupLng: 26.01, miles: 2, minutes: 5 });
  await rides.start({ rideId: request.ride.id, driverId: 'driver_cancel_started' });

  const canceled = await rides.driverCancel({ rideId: request.ride.id, driverId: 'driver_cancel_started' });
  assert.ok(canceled.error, 'cancel should be blocked after trip started');
});

test('driver cancel from arrived_at_pickup state is allowed', async () => {
  resetDriverData();
  await setupVerifiedDriver('driver_cancel_arrived', 27, 27);

  const request = await rides.request({ riderId: 'rider_cancel_arrived', pickupLat: 27.01, pickupLng: 27.01, miles: 2, minutes: 5 });
  await rides.arrive({ rideId: request.ride.id, driverId: 'driver_cancel_arrived' });

  const canceled = await rides.driverCancel({ rideId: request.ride.id, driverId: 'driver_cancel_arrived', reason: 'personal_emergency' });
  assert.equal(canceled.ok, true);
  assert.equal(canceled.ride.status, 'canceled');
  assert.equal(canceled.ride.cancellationReason, 'personal_emergency');
  assert.equal(canceled.ride.cancellationActorRole, 'driver');
});
