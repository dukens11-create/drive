import {
  makeId,
  markStoreDirty,
  store,
  timestamp,
  type CarpoolPassenger,
  type CarpoolRide
} from '../database/data.store';

function getUserId(body: any) {
  return body?.actor?.id || body?.userId || body?.riderId;
}

const MAX_PASSENGERS = 4;
const BASE_FARE_CENTS = 150; // base per-passenger fare in cents

export async function createCarpoolRide(body: any) {
  const maxPassengers = Math.min(Number(body?.maxPassengers || 2), MAX_PASSENGERS);

  const ride: CarpoolRide = {
    id: makeId('carpool'),
    maxPassengers,
    passengers: [],
    routeStartLat: body?.routeStartLat,
    routeStartLng: body?.routeStartLng,
    routeEndLat: body?.routeEndLat,
    routeEndLng: body?.routeEndLng,
    status: 'open',
    departsAt: body?.departsAt,
    createdAt: timestamp(),
    updatedAt: timestamp()
  };

  store.carpoolRides.set(ride.id, ride);
  markStoreDirty();
  return { module: 'carpool', action: 'create', ok: true, ride };
}

export async function joinCarpoolRide(body: any, params?: any) {
  const rideId = params?.id || body?.rideId;
  const userId = getUserId(body);

  if (!rideId) return { module: 'carpool', action: 'join', error: 'rideId required' };
  if (!userId) return { module: 'carpool', action: 'join', error: 'userId required' };

  const ride = store.carpoolRides.get(rideId);
  if (!ride) return { module: 'carpool', action: 'join', error: 'carpool ride not found' };
  if (ride.status !== 'open') return { module: 'carpool', action: 'join', error: 'carpool is not open for joining' };
  if (ride.passengers.length >= ride.maxPassengers) {
    return { module: 'carpool', action: 'join', error: 'carpool is full' };
  }
  if (ride.passengers.some(p => p.userId === userId)) {
    return { module: 'carpool', action: 'join', error: 'already joined this carpool' };
  }

  const fareShareCents = Math.round(BASE_FARE_CENTS / (ride.passengers.length + 1));
  const passenger: CarpoolPassenger = {
    userId,
    pickupLat: body?.pickupLat,
    pickupLng: body?.pickupLng,
    dropoffLat: body?.dropoffLat,
    dropoffLng: body?.dropoffLng,
    fareShareCents,
    joinedAt: timestamp()
  };

  ride.passengers.push(passenger);
  if (ride.passengers.length >= ride.maxPassengers) {
    ride.status = 'full';
  }
  ride.updatedAt = timestamp();
  store.carpoolRides.set(rideId, ride);
  markStoreDirty();

  return { module: 'carpool', action: 'join', ok: true, ride, passenger };
}

export async function leaveCarpoolRide(body: any, params?: any) {
  const rideId = params?.id || body?.rideId;
  const userId = getUserId(body);

  if (!rideId) return { module: 'carpool', action: 'leave', error: 'rideId required' };

  const ride = store.carpoolRides.get(rideId);
  if (!ride) return { module: 'carpool', action: 'leave', error: 'carpool ride not found' };
  if (ride.status === 'in_progress' || ride.status === 'completed') {
    return { module: 'carpool', action: 'leave', error: 'cannot leave an in-progress or completed carpool' };
  }

  ride.passengers = ride.passengers.filter(p => p.userId !== userId);
  if (ride.status === 'full' && ride.passengers.length < ride.maxPassengers) {
    ride.status = 'open';
  }
  ride.updatedAt = timestamp();
  store.carpoolRides.set(rideId, ride);
  markStoreDirty();

  return { module: 'carpool', action: 'leave', ok: true, ride };
}

export async function listCarpoolRides(body: any) {
  const status = body?.status;
  const limit = Math.min(Number(body?.limit || 20), 100);

  let rides = Array.from(store.carpoolRides.values());
  if (status) rides = rides.filter(r => r.status === status);
  rides = rides.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit);

  return { module: 'carpool', ok: true, total: rides.length, rides };
}

export async function getCarpoolRide(body: any, params?: any) {
  const rideId = params?.id || body?.rideId;
  if (!rideId) return { module: 'carpool', action: 'get', error: 'rideId required' };

  const ride = store.carpoolRides.get(rideId);
  if (!ride) return { module: 'carpool', action: 'get', error: 'not found' };

  return { module: 'carpool', ok: true, ride };
}
