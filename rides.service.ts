import { dispatchRide } from './dispatch.engine';
import { estimateRoute } from './eta.service';
import { makeId, markStoreDirty, pushWalletTx, store, timestamp, type Ride } from './data.store';

function getRide(id: string) {
  const ride = store.rides.get(id);
  if (!ride) throw new Error('ride not found');
  return ride;
}

export async function estimate(body: any, _params?: any, _query?: any) {
  const miles = Number(body?.miles || body?.distanceMiles || 0);
  const minutes = Number(body?.minutes || body?.etaMinutes || 0);
  const route = await estimateRoute({ distanceMiles: miles || undefined, etaMinutes: minutes || undefined });
  const fareEstimate = Math.round((2.5 + route.distanceMiles * 1.9 + route.etaMinutes * 0.25) * 100) / 100;
  return { module: 'rides', action: 'estimate', ok: true, route, fareEstimate };
}

export async function request(body: any, _params?: any, _query?: any) {
  const riderId = body?.actor?.id || body?.riderId || body?.userId;
  if (!riderId) return { module: 'rides', action: 'request', error: 'riderId is required' };

  const estimated = await estimate(body);
  const now = timestamp();
  const ride: Ride = {
    id: makeId('ride'),
    riderId,
    pickupLat: body?.pickupLat,
    pickupLng: body?.pickupLng,
    dropoffLat: body?.dropoffLat,
    dropoffLng: body?.dropoffLng,
    miles: estimated.route.distanceMiles,
    minutes: estimated.route.etaMinutes,
    fareEstimate: estimated.fareEstimate,
    status: 'requested' as const,
    createdAt: now,
    updatedAt: now
  };
  store.rides.set(ride.id, ride);
  const dispatch = await dispatchRide({ id: ride.id, pickupLat: ride.pickupLat, pickupLng: ride.pickupLng });
  if (dispatch.selected?.driverId) {
    ride.driverId = dispatch.selected.driverId;
    markStoreDirty();
  }
  return { module: 'rides', action: 'request', ok: true, ride, dispatch };
}

export async function accept(body: any, _params?: any, _query?: any) {
  const ride = getRide(body?.rideId);
  const driverId = body?.actor?.id || body?.driverId;
  if (!driverId) return { module: 'rides', action: 'accept', error: 'driverId is required' };
  if (ride.status !== 'requested') return { module: 'rides', action: 'accept', error: 'ride not requestable' };
  if (ride.driverId && ride.driverId !== driverId) {
    return { module: 'rides', action: 'accept', error: 'ride assigned to another driver' };
  }
  const profile = store.drivers.get(driverId);
  if (!profile || profile.status !== 'approved') return { module: 'rides', action: 'accept', error: 'driver not approved' };
  if (!profile.available) return { module: 'rides', action: 'accept', error: 'driver not available' };
  ride.driverId = driverId;
  ride.status = 'accepted';
  ride.updatedAt = timestamp();
  profile.available = false;
  markStoreDirty();
  return { module: 'rides', action: 'accept', ok: true, ride };
}

export async function start(body: any, _params?: any, _query?: any) {
  const ride = getRide(body?.rideId);
  const driverId = body?.actor?.id || body?.driverId;
  if (!driverId || ride.driverId !== driverId) return { module: 'rides', action: 'start', error: 'only assigned driver can start ride' };
  if (ride.status !== 'accepted') return { module: 'rides', action: 'start', error: 'ride not accepted' };
  ride.status = 'started';
  ride.updatedAt = timestamp();
  markStoreDirty();
  return { module: 'rides', action: 'start', ok: true, ride };
}

export async function complete(body: any, _params?: any, _query?: any) {
  const ride = getRide(body?.rideId);
  const driverId = body?.actor?.id || body?.driverId;
  if (!driverId || ride.driverId !== driverId) return { module: 'rides', action: 'complete', error: 'only assigned driver can complete ride' };
  if (ride.status !== 'started') return { module: 'rides', action: 'complete', error: 'ride not started' };

  ride.status = 'completed';
  ride.updatedAt = timestamp();
  markStoreDirty();

  const amountCents = Math.round(ride.fareEstimate * 100);
  if (ride.riderId) pushWalletTx(ride.riderId, 'debit', amountCents, `ride:${ride.id}:fare`);
  if (ride.driverId) pushWalletTx(ride.driverId, 'credit', Math.round(amountCents * 0.8), `ride:${ride.id}:payout`);
  if (ride.driverId) {
    const profile = store.drivers.get(ride.driverId);
    if (profile) profile.available = true;
  }

  return { module: 'rides', action: 'complete', ok: true, ride, amountCents };
}

export async function cancel(body: any, _params?: any, _query?: any) {
  const ride = getRide(body?.rideId);
  const riderId = body?.actor?.id || body?.riderId || body?.userId;
  if (!riderId || ride.riderId !== riderId) return { module: 'rides', action: 'cancel', error: 'only rider can cancel ride' };
  if (ride.status === 'completed') return { module: 'rides', action: 'cancel', error: 'cannot cancel completed ride' };
  if (ride.status === 'started') return { module: 'rides', action: 'cancel', error: 'cannot cancel started ride' };
  ride.status = 'canceled';
  ride.updatedAt = timestamp();
  if (ride.driverId) {
    const profile = store.drivers.get(ride.driverId);
    if (profile) profile.available = true;
  }
  markStoreDirty();
  return { module: 'rides', action: 'cancel', ok: true, ride };
}

export async function rate(body: any, _params?: any, _query?: any) {
  const ride = getRide(body?.rideId);
  const riderId = body?.actor?.id || body?.riderId || body?.userId;
  if (!riderId || ride.riderId !== riderId) return { module: 'rides', action: 'rate', error: 'only rider can rate ride' };
  if (ride.status !== 'completed') return { module: 'rides', action: 'rate', error: 'only completed rides can be rated' };
  const rating = Number(body?.rating);
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) return { module: 'rides', action: 'rate', error: 'rating must be 1-5' };
  ride.rating = rating;
  ride.updatedAt = timestamp();
  markStoreDirty();
  return { module: 'rides', action: 'rate', ok: true, rideId: ride.id, rating };
}
