import assert from 'node:assert/strict';
import { test } from 'node:test';
import { store } from '../src/database/data.store';
import * as drivers from '../src/services/drivers.service';
import * as kyc from '../src/services/kyc.service';
import * as rides from '../src/services/rides.service';

function resetDriverData() {
  store.drivers.clear();
  store.rides.clear();
  store.kycStatus.clear();
  store.walletTx.splice(0, store.walletTx.length);
}

test('driver onboarding progresses through documents and KYC before online', async () => {
  resetDriverData();
  await drivers.apply({ userId: 'driver_onboarding' });

  const earlyOnline = await drivers.availability({ userId: 'driver_onboarding', status: 'online' });
  assert.ok(earlyOnline.error);
  assert.equal(earlyOnline.error, 'driver is not verified');

  await drivers.documents({ userId: 'driver_onboarding', documents: ['license', 'insurance'] });
  let profile = store.drivers.get('driver_onboarding');
  assert.equal(profile?.verificationState, 'kyc_pending');

  await kyc.webhook({ userId: 'driver_onboarding', status: 'verified' });
  profile = store.drivers.get('driver_onboarding');
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
  await drivers.documents({ userId: 'driver_dispatch', documents: ['license', 'insurance'] });
  await kyc.webhook({ userId: 'driver_dispatch', status: 'verified' });
  await drivers.location({ userId: 'driver_dispatch', lat: 10, lng: 10 });
  await drivers.availability({ userId: 'driver_dispatch', status: 'online' });

  const request = await rides.request({ riderId: 'rider_1', pickupLat: 10.01, pickupLng: 10.01, miles: 3, minutes: 8 });
  assert.equal(request.ok, true);
  assert.equal(request.ride.status, 'accepted');
  assert.equal(request.ride.driverId, 'driver_dispatch');
  assert.equal(request.dispatch.selected?.driverId, 'driver_dispatch');
  assert.equal(store.drivers.get('driver_dispatch')?.availabilityStatus, 'assigned');

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
  await drivers.documents({ userId: 'driver_feedback', documents: ['license', 'insurance'] });
  await kyc.webhook({ userId: 'driver_feedback', status: 'verified' });
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
