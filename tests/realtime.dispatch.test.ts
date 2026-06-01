import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { pushWalletTx, store, timestamp, type Ride, type RideRequest } from '../src/database/data.store';
import { getDriverRealtimeDispatchSnapshot } from '../src/services/realtime-dispatch.service';

test('driver realtime dispatch snapshot includes live location, rides, and earnings', () => {
  const driverId = `driver_rt_${randomUUID()}`;
  const riderId = `rider_rt_${randomUUID()}`;
  const now = timestamp();

  store.drivers.set(driverId, {
    userId: driverId,
    status: 'approved',
    verificationState: 'verified',
    availabilityStatus: 'online',
    available: true,
    lat: 37.781,
    lng: -122.404,
    rating: 4.9,
    acceptanceRate: 0.98,
    cancellationRate: 0.01,
    earningsCents: 0,
    documents: []
  });

  const acceptedRide: Ride = {
    id: `ride_rt_${randomUUID()}`,
    riderId,
    driverId,
    pickupLat: 37.78,
    pickupLng: -122.41,
    dropoffLat: 37.79,
    dropoffLng: -122.4,
    miles: 4.2,
    minutes: 18,
    fareEstimate: 24.5,
    status: 'accepted',
    events: [],
    createdAt: now,
    updatedAt: now
  };
  const completedRide: Ride = {
    id: `ride_rt_${randomUUID()}`,
    riderId,
    driverId,
    pickupLat: 37.77,
    pickupLng: -122.42,
    dropoffLat: 37.75,
    dropoffLng: -122.43,
    miles: 6.4,
    minutes: 26,
    fareEstimate: 31.25,
    status: 'completed',
    events: [],
    createdAt: now,
    updatedAt: new Date(Date.now() + 1_000).toISOString()
  };

  store.rides.set(acceptedRide.id, acceptedRide);
  store.rides.set(completedRide.id, completedRide);
  pushWalletTx(driverId, 'credit', 2500, `ride:${completedRide.id}:payout`);

  const snapshot = getDriverRealtimeDispatchSnapshot(driverId);

  assert.deepEqual(snapshot.location, {
    lat: 37.781,
    lng: -122.404,
    updatedAt: snapshot.location?.updatedAt
  });
  assert.equal(snapshot.rides.length >= 2, true);
  assert.equal(snapshot.rides[0].id, completedRide.id);
  assert.equal(snapshot.rides.some(ride => ride.id === acceptedRide.id && ride.status === 'accepted'), true);
  assert.equal(snapshot.earnings.earningsCents, 2500);
  assert.equal(snapshot.earnings.rideCount, 1);
  assert.deepEqual(snapshot.earnings.rideEarnings[0], {
    rideId: completedRide.id,
    amountCents: 2500,
    createdAt: snapshot.earnings.rideEarnings[0]?.createdAt
  });
});

test('driver realtime dispatch snapshot includes broadcasted nearby ride requests for matched drivers', () => {
  const matchedDriverId = `driver_rt_${randomUUID()}`;
  const otherDriverId = `driver_rt_${randomUUID()}`;
  const riderId = `rider_rt_${randomUUID()}`;
  const now = timestamp();

  store.drivers.set(matchedDriverId, {
    userId: matchedDriverId,
    status: 'approved',
    verificationState: 'verified',
    availabilityStatus: 'online',
    available: true,
    lat: 37.781,
    lng: -122.404,
    rating: 4.9,
    acceptanceRate: 0.98,
    cancellationRate: 0.01,
    earningsCents: 0,
    documents: []
  });
  store.drivers.set(otherDriverId, {
    userId: otherDriverId,
    status: 'approved',
    verificationState: 'verified',
    availabilityStatus: 'online',
    available: true,
    lat: 37.79,
    lng: -122.41,
    rating: 4.8,
    acceptanceRate: 0.95,
    cancellationRate: 0.02,
    earningsCents: 0,
    documents: []
  });

  const ride: Ride = {
    id: `ride_rt_${randomUUID()}`,
    riderId,
    pickupLat: 37.78,
    pickupLng: -122.41,
    dropoffLat: 37.79,
    dropoffLng: -122.4,
    miles: 3.1,
    minutes: 12,
    fareEstimate: 18.5,
    status: 'requested',
    events: [],
    createdAt: now,
    updatedAt: now
  };
  const request: RideRequest = {
    id: `request_rt_${randomUUID()}`,
    rideId: ride.id,
    riderId,
    pickupLat: ride.pickupLat,
    pickupLng: ride.pickupLng,
    dropoffLat: ride.dropoffLat,
    dropoffLng: ride.dropoffLng,
    fareEstimate: ride.fareEstimate,
    broadcastedDrivers: [matchedDriverId],
    responses: [{ driverId: matchedDriverId, status: 'broadcasted', respondedAt: now }],
    expiresAt: new Date(Date.now() + 30_000).toISOString(),
    status: 'broadcasting',
    createdAt: now,
    updatedAt: now
  };

  store.rides.set(ride.id, ride);
  store.rideRequests.set(request.id, request);

  const matchedSnapshot = getDriverRealtimeDispatchSnapshot(matchedDriverId);
  const otherSnapshot = getDriverRealtimeDispatchSnapshot(otherDriverId);

  assert.equal(matchedSnapshot.rides.some(entry => entry.id === ride.id && entry.status === 'requested'), true);
  assert.equal(otherSnapshot.rides.some(entry => entry.id === ride.id), false);
});
