import type { Server } from 'socket.io';
import { store, timestamp, type Ride, type RideEvent } from '../database/data.store';

type DriverRealtimeLocation = {
  lat: number;
  lng: number;
  updatedAt: string;
};

type DriverRealtimeEarnings = {
  earningsCents: number;
  rideCount: number;
  rideEarnings: Array<{
    rideId: string;
    amountCents: number;
    createdAt: string;
  }>;
  updatedAt: string;
};

type DriverRealtimeRide = Ride & {
  events: RideEvent[];
};

let realtimeServer: Server | null = null;

function emitToRoom(room: string, event: string, payload: unknown) {
  realtimeServer?.to(room).emit(event, payload);
}

function normalizeRide(ride: Ride): DriverRealtimeRide {
  return {
    ...ride,
    events: Array.isArray(ride.events) ? ride.events : []
  };
}

function getDriverRealtimeLocation(driverId: string): DriverRealtimeLocation | null {
  const profile = store.drivers.get(driverId);
  const lat = Number(profile?.lat);
  const lng = Number(profile?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const locationUpdatedAt = profile?.lastLocationUpdatedAt || timestamp();
  return {
    lat,
    lng,
    updatedAt: locationUpdatedAt
  };
}

function getDriverRealtimeRides(driverId: string): DriverRealtimeRide[] {
  return Array.from(store.rides.values())
    .filter(ride => ride.driverId === driverId)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .map(normalizeRide);
}

function getDriverRealtimeEarnings(driverId: string): DriverRealtimeEarnings {
  const rideEarnings = store.walletTx
    .filter(tx => tx.userId === driverId && tx.kind === 'credit' && tx.reason.startsWith('ride:') && tx.reason.endsWith(':payout'))
    .map(tx => {
      const [, rideId] = tx.reason.split(':');
      if (!rideId) return null;
      return {
        rideId,
        amountCents: tx.amountCents,
        createdAt: tx.createdAt
      };
    })
    .filter(Boolean)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  return {
    earningsCents: rideEarnings.reduce((sum, tx) => sum + tx.amountCents, 0),
    rideCount: rideEarnings.length,
    rideEarnings,
    updatedAt: timestamp()
  };
}

export function registerRealtimeDispatchServer(io: Server) {
  realtimeServer = io;
}

export function getDriverRealtimeDispatchSnapshot(driverId: string) {
  return {
    rides: getDriverRealtimeRides(driverId),
    earnings: getDriverRealtimeEarnings(driverId),
    location: getDriverRealtimeLocation(driverId)
  };
}

export function publishDriverRealtimeLocation(driverId: string) {
  const location = getDriverRealtimeLocation(driverId);
  if (!location) return null;
  emitToRoom(`driver:${driverId}`, 'dispatch:location', location);
  Array.from(store.rides.values())
    .filter(ride => ride.driverId === driverId && ['accepted', 'arrived_at_pickup', 'started'].includes(ride.status))
    .forEach(ride => {
      emitToRoom(`ride:${ride.id}`, 'ride:driver_location', {
        rideId: ride.id,
        ...location
      });
    });
  return location;
}

export function publishDriverRealtimeEarnings(driverId: string) {
  const earnings = getDriverRealtimeEarnings(driverId);
  emitToRoom(`driver:${driverId}`, 'dispatch:earnings', earnings);
  emitToRoom(`user:${driverId}`, 'dispatch:earnings', earnings);
  return earnings;
}

export function publishRideRealtimeUpdate(ride: Ride, reason = 'trip_update') {
  const updatedAt = timestamp();
  const normalizedRide = normalizeRide(ride);
  const tripUpdatePayload = {
    reason,
    ride: normalizedRide,
    updatedAt
  };

  emitToRoom(`ride:${ride.id}`, 'ride:status', {
    rideId: ride.id,
    status: ride.status,
    driverId: ride.driverId,
    riderId: ride.riderId,
    updatedAt
  });
  emitToRoom(`user:${ride.riderId}`, 'dispatch:trip_update', tripUpdatePayload);

  if (ride.driverId) {
    emitToRoom(`user:${ride.driverId}`, 'dispatch:trip_update', tripUpdatePayload);
    emitToRoom(`driver:${ride.driverId}`, 'dispatch:rides', {
      reason,
      items: getDriverRealtimeRides(ride.driverId),
      updatedAt
    });
    publishDriverRealtimeLocation(ride.driverId);
  }

  return tripUpdatePayload;
}
