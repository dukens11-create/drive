import assert from 'node:assert/strict';
import { test } from 'node:test';
import { makeId, store, timestamp, type DriverProfile, type ScheduledRide } from '../src/database/data.store';
import { runScheduledRidesDispatcher } from '../src/jobs/scheduled-rides-dispatcher';

function resetScheduledDispatcherData() {
  store.scheduledRides.clear();
  store.rides.clear();
  store.rideRequests.clear();
  store.drivers.clear();
  store.riders.clear();
}

function makeEligibleDriver(driverId: string, lat: number, lng: number): DriverProfile {
  return {
    userId: driverId,
    vehicleIds: [],
    status: 'approved',
    verificationState: 'verified',
    availabilityStatus: 'online',
    available: true,
    lat,
    lng,
    rating: 5,
    acceptanceRate: 1,
    cancellationRate: 0,
    earningsCents: 0,
    documents: [],
    verificationDocuments: [],
    selfieVerification: { status: 'matched', score: 0.9, checkedAt: timestamp() },
    verificationReview: { status: 'approved', reviewedAt: timestamp() }
  };
}

test('scheduled dispatcher creates and dispatches a ride when a driver is available', async () => {
  resetScheduledDispatcherData();

  store.drivers.set('driver_sched_ok', makeEligibleDriver('driver_sched_ok', 40.7129, -74.0059));
  const dueRide: ScheduledRide = {
    id: makeId('sched'),
    riderId: 'rider_sched_ok',
    pickupLat: 40.7128,
    pickupLng: -74.0060,
    dropoffLat: 40.7580,
    dropoffLng: -73.9855,
    scheduledAt: new Date(Date.now() + 2 * 60 * 1000).toISOString(),
    status: 'scheduled',
    dispatch_attempts: 0,
    createdAt: timestamp(),
    updatedAt: timestamp()
  };
  store.scheduledRides.set(dueRide.id, dueRide);

  const result = await runScheduledRidesDispatcher();
  assert.equal(result.ok, true);
  assert.equal(result.attempted, 1);
  assert.equal(result.dispatched, 1);

  const scheduled = store.scheduledRides.get(dueRide.id);
  assert.equal(scheduled?.status, 'dispatched');
  assert.equal(scheduled?.dispatch_attempts, 1);
  assert.ok(scheduled?.rideId);
  assert.ok(scheduled?.last_dispatch_attempt_at);

  const dispatchedRide = scheduled?.rideId ? store.rides.get(scheduled.rideId) : null;
  assert.ok(dispatchedRide);
  assert.equal(dispatchedRide?.riderId, 'rider_sched_ok');
});

test('scheduled dispatcher retries and cancels after the fifth failed attempt', async () => {
  resetScheduledDispatcherData();

  const dueRide: ScheduledRide = {
    id: makeId('sched'),
    riderId: 'rider_sched_fail',
    pickupLat: 40.7128,
    pickupLng: -74.0060,
    dropoffLat: 40.7580,
    dropoffLng: -73.9855,
    scheduledAt: new Date(Date.now() + 60 * 1000).toISOString(),
    status: 'scheduled',
    dispatch_attempts: 4,
    last_dispatch_attempt_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    createdAt: timestamp(),
    updatedAt: timestamp()
  };
  store.scheduledRides.set(dueRide.id, dueRide);

  const result = await runScheduledRidesDispatcher();
  assert.equal(result.ok, true);
  assert.equal(result.attempted, 1);
  assert.equal(result.failed, 1);
  assert.equal(result.canceled, 1);

  const scheduled = store.scheduledRides.get(dueRide.id);
  assert.equal(scheduled?.status, 'canceled');
  assert.equal(scheduled?.dispatch_attempts, 5);
  assert.equal(scheduled?.cancellationReason, 'No drivers available');
  assert.equal(scheduled?.dispatch_failed_reason, 'No drivers available');
});
