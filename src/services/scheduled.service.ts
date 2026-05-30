import {
  makeId,
  markStoreDirty,
  store,
  timestamp,
  type ScheduledRide,
  type ScheduledRideStatus
} from '../database/data.store';

function getUserId(body: any) {
  return body?.actor?.id || body?.riderId || body?.userId;
}

export async function bookScheduledRide(body: any) {
  const riderId = getUserId(body);
  if (!riderId) return { module: 'scheduled', action: 'book', error: 'riderId required' };

  const scheduledAt = body?.scheduledAt;
  if (!scheduledAt) return { module: 'scheduled', action: 'book', error: 'scheduledAt required (ISO 8601)' };

  const scheduledTime = new Date(scheduledAt).getTime();
  if (isNaN(scheduledTime)) return { module: 'scheduled', action: 'book', error: 'scheduledAt is not a valid date' };

  const minAdvanceMs = 15 * 60 * 1000; // 15 minutes
  if (scheduledTime - Date.now() < minAdvanceMs) {
    return { module: 'scheduled', action: 'book', error: 'scheduledAt must be at least 15 minutes in the future' };
  }

  const ride: ScheduledRide = {
    id: makeId('sched'),
    riderId,
    pickupLat: body?.pickupLat,
    pickupLng: body?.pickupLng,
    dropoffLat: body?.dropoffLat,
    dropoffLng: body?.dropoffLng,
    pickupAddress: body?.pickupAddress,
    dropoffAddress: body?.dropoffAddress,
    scheduledAt,
    status: 'scheduled',
    createdAt: timestamp(),
    updatedAt: timestamp()
  };

  store.scheduledRides.set(ride.id, ride);
  markStoreDirty();

  return { module: 'scheduled', action: 'book', ok: true, scheduledRide: ride };
}

export async function cancelScheduledRide(body: any) {
  const riderId = getUserId(body);
  const rideId = body?.rideId || body?.id;
  if (!rideId) return { module: 'scheduled', action: 'cancel', error: 'rideId required' };

  const ride = store.scheduledRides.get(rideId);
  if (!ride) return { module: 'scheduled', action: 'cancel', error: 'scheduled ride not found' };
  if (ride.riderId !== riderId) return { module: 'scheduled', action: 'cancel', error: 'forbidden' };
  if (ride.status === 'canceled') return { module: 'scheduled', action: 'cancel', error: 'ride already canceled' };
  if (ride.status === 'dispatched') return { module: 'scheduled', action: 'cancel', error: 'ride already dispatched' };

  ride.status = 'canceled';
  ride.canceledAt = timestamp();
  ride.cancellationReason = body?.reason || 'user_canceled';
  ride.updatedAt = timestamp();
  store.scheduledRides.set(rideId, ride);
  markStoreDirty();

  return { module: 'scheduled', action: 'cancel', ok: true, scheduledRide: ride };
}

export async function listScheduledRides(body: any) {
  const riderId = getUserId(body);
  const status = body?.status as ScheduledRideStatus | undefined;
  const limit = Math.min(Number(body?.limit || 20), 100);

  let rides = Array.from(store.scheduledRides.values());
  if (riderId) rides = rides.filter(r => r.riderId === riderId);
  if (status) rides = rides.filter(r => r.status === status);
  rides = rides.sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt)).slice(0, limit);

  return { module: 'scheduled', ok: true, total: rides.length, scheduledRides: rides };
}

export async function getScheduledRide(body: any, params?: any) {
  const rideId = params?.id || body?.rideId || body?.id;
  if (!rideId) return { module: 'scheduled', action: 'get', error: 'rideId required' };

  const ride = store.scheduledRides.get(rideId);
  if (!ride) return { module: 'scheduled', action: 'get', error: 'not found' };

  return { module: 'scheduled', ok: true, scheduledRide: ride };
}

/** Called by a background worker or cron to dispatch due scheduled rides. */
export async function dispatchDueScheduledRides() {
  const now = Date.now();
  const dispatchWindowMs = 10 * 60 * 1000; // dispatch rides due within 10 minutes
  let dispatched = 0;

  for (const ride of store.scheduledRides.values()) {
    if (ride.status !== 'scheduled') continue;
    const scheduledTime = new Date(ride.scheduledAt).getTime();
    if (scheduledTime - now <= dispatchWindowMs) {
      ride.status = 'dispatched';
      ride.updatedAt = timestamp();
      store.scheduledRides.set(ride.id, ride);
      dispatched++;
    }
  }

  if (dispatched > 0) markStoreDirty();
  return { dispatched };
}
