import type { Server } from 'socket.io';
import { makeId, store, timestamp, type DispatchEvent, type Ride, type RideEvent } from '../database/data.store';

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

export const DISPATCH_EVENT_HISTORY_LIMIT = 200;
const LOCATION_SNAPSHOT_LIMIT = 200;
const DISPATCH_EVENT_STORE_LIMIT = 1_000;

type RiderRealtimeProfile = {
  userId: string;
  currentTripId?: string;
  location: {
    lat: number;
    lng: number;
    updatedAt?: string;
  } | null;
  vehiclePreference?: string;
  routePreference?: string;
  favoriteLocations: Array<{
    label: string;
    lat: number;
    lng: number;
  }>;
  rating: number;
  reviewCount: number;
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

function getNextDispatchSequence() {
  return (store.dispatchEvents[store.dispatchEvents.length - 1]?.sequence || 0) + 1;
}

function publishDispatchEvent(type: string, payload: Record<string, unknown>, roomIds: string[] = [], entityId?: string) {
  const event: DispatchEvent = {
    id: makeId('dispatch_evt'),
    sequence: getNextDispatchSequence(),
    type,
    entityId,
    createdAt: timestamp(),
    payload
  };
  store.dispatchEvents.push(event);
  if (store.dispatchEvents.length > DISPATCH_EVENT_STORE_LIMIT) {
    store.dispatchEvents.splice(0, store.dispatchEvents.length - DISPATCH_EVENT_STORE_LIMIT);
  }
  realtimeServer?.emit('dispatch:event', event);
  roomIds.forEach(roomId => emitToRoom(roomId, 'dispatch:event', event));
  return event;
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

function getRiderRealtimeProfile(riderId: string): RiderRealtimeProfile | null {
  const profile = store.riders.get(riderId);
  if (!profile) return null;
  return {
    userId: riderId,
    currentTripId: profile.currentTripId,
    location: Number.isFinite(Number(profile.lat)) && Number.isFinite(Number(profile.lng))
      ? {
        lat: Number(profile.lat),
        lng: Number(profile.lng),
        updatedAt: profile.lastLocationUpdatedAt
      }
      : null,
    vehiclePreference: profile.vehiclePreference,
    routePreference: profile.routePreference,
    favoriteLocations: Array.isArray(profile.favoriteLocations) ? profile.favoriteLocations : [],
    rating: Number(profile.rating || 5),
    reviewCount: Number(profile.reviewCount || 0)
  };
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

export function getRealtimeDispatchSnapshot() {
  return {
    provider: 'firebase',
    drivers: Array.from(store.drivers.values()).map(profile => ({
      userId: profile.userId,
      status: profile.status,
      availabilityStatus: profile.availabilityStatus,
      available: profile.available,
      rating: profile.rating,
      acceptanceRate: profile.acceptanceRate,
      cancellationRate: profile.cancellationRate,
      earningsCents: profile.earningsCents,
      currentTripId: profile.currentTripId,
      location: getDriverRealtimeLocation(profile.userId)
    })),
    riders: Array.from(store.riders.keys())
      .map(getRiderRealtimeProfile)
      .filter(Boolean),
    trips: Array.from(store.rides.values())
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .map(normalizeRide),
    requests: Array.from(store.rideRequests.values()).sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
    locations: Array.from(store.locationHistory.values()).sort((left, right) => right.timestamp.localeCompare(left.timestamp)).slice(0, LOCATION_SNAPSHOT_LIMIT),
    events: [...store.dispatchEvents].sort((left, right) => left.sequence - right.sequence).slice(-DISPATCH_EVENT_HISTORY_LIMIT)
  };
}

export function publishDriverRealtimeLocation(driverId: string) {
  const location = getDriverRealtimeLocation(driverId);
  if (!location) return null;
  emitToRoom(`driver:${driverId}`, 'dispatch:location', location);
  publishDispatchEvent('driver_location_updated', {
    driverId,
    ...location
  }, [`driver:${driverId}`, `user:${driverId}`], driverId);
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

export function publishRiderRealtimeLocation(riderId: string) {
  const rider = getRiderRealtimeProfile(riderId);
  if (!rider?.location) return null;
  emitToRoom(`user:${riderId}`, 'dispatch:rider_location', rider.location);
  publishDispatchEvent('rider_location_updated', {
    riderId,
    ...rider.location
  }, [`user:${riderId}`], riderId);
  return rider.location;
}

export function publishDriverRealtimeEarnings(driverId: string) {
  const earnings = getDriverRealtimeEarnings(driverId);
  emitToRoom(`driver:${driverId}`, 'dispatch:earnings', earnings);
  emitToRoom(`user:${driverId}`, 'dispatch:earnings', earnings);
  return earnings;
}

export function publishDriverStatusChanged(driverId: string) {
  const profile = store.drivers.get(driverId);
  if (!profile) return null;
  const payload = {
    driverId,
    status: profile.availabilityStatus,
    available: profile.available,
    updatedAt: timestamp()
  };
  emitToRoom(`driver:${driverId}`, 'dispatch:driver_status', payload);
  emitToRoom(`user:${driverId}`, 'dispatch:driver_status', payload);
  publishDispatchEvent('driver_status_changed', payload, [`driver:${driverId}`, `user:${driverId}`], driverId);
  return payload;
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
  const eventTypeMap: Record<string, string> = {
    ride_requested: 'ride_requested',
    accepted: 'ride_accepted',
    arrived_at_pickup: 'ride_arrived',
    started: 'ride_started',
    completed: 'ride_completed',
    canceled: 'ride_cancelled'
  };
  const eventType = eventTypeMap[reason] || 'ride_updated';
  publishDispatchEvent(eventType, {
    rideId: ride.id,
    driverId: ride.driverId,
    riderId: ride.riderId,
    status: ride.status,
    reason,
    updatedAt
  }, [`ride:${ride.id}`, `user:${ride.riderId}`, ...(ride.driverId ? [`driver:${ride.driverId}`, `user:${ride.driverId}`] : [])], ride.id);

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

export function publishRiderRatingSubmitted(ride: Ride) {
  if (!ride.riderId || typeof ride.rating !== 'number') return null;
  return publishDispatchEvent('rider_rating_submitted', {
    rideId: ride.id,
    riderId: ride.riderId,
    driverId: ride.driverId,
    rating: ride.rating,
    review: ride.review,
    ratedAt: ride.ratedAt
  }, [`ride:${ride.id}`, `user:${ride.riderId}`, ...(ride.driverId ? [`driver:${ride.driverId}`, `user:${ride.driverId}`] : [])], ride.id);
}
