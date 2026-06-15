import type { Server } from 'socket.io';
import { makeId, store, timestamp, type DispatchEvent, type Ride, type RideEvent, type RideRequest } from '../database/data.store';

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
let dispatchRealtimeServer: Server | null = null;

function forEachRealtimeServer(callback: (server: Server) => void) {
  [realtimeServer, dispatchRealtimeServer].forEach(server => {
    if (server) callback(server);
  });
}

function emitToRoom(room: string, event: string, payload: unknown) {
  forEachRealtimeServer(server => {
    server.to(room).emit(event, payload);
  });
}

function emitToAll(event: string, payload: unknown) {
  forEachRealtimeServer(server => {
    server.emit(event, payload);
  });
}

function isDispatchVisibleDriver(profile: any) {
  return (
    profile?.status === 'approved' &&
    profile?.verificationState === 'verified' &&
    profile?.availabilityStatus === 'online' &&
    profile?.available === true &&
    Number.isFinite(Number(profile?.lat)) &&
    Number.isFinite(Number(profile?.lng))
  );
}

function getDispatchVisibleDrivers() {
  return Array.from(store.drivers.values())
    .filter(isDispatchVisibleDriver)
    .map(profile => ({
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
    }));
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
  emitToAll('dispatch:event', event);
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
  const activeRequestByRideId = new Map<string, RideRequest>();
  const nowMs = Date.now();
  for (const request of store.rideRequests.values()) {
    if (request.status === 'broadcasting') activeRequestByRideId.set(request.rideId, request);
  }
  return Array.from(store.rides.values())
    .filter(ride => {
      if (ride.driverId === driverId) return true;
      if (ride.status !== 'requested' || ride.driverId) return false;
      const request = activeRequestByRideId.get(ride.id);
      if (!request) return false;
      if (new Date(request.expiresAt).getTime() <= nowMs) return false;
      return request.broadcastedDrivers.includes(driverId);
    })
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .map(normalizeRide);
}

function getRealtimeRequestDriverIds(rideId: string) {
  let request: RideRequest | undefined;
  for (const entry of store.rideRequests.values()) {
    if (entry.rideId === rideId) {
      request = entry;
      break;
    }
  }
  if (!request) return [];
  return Array.from(new Set([...(request.broadcastedDrivers || []), request.acceptedDriverId].filter((value): value is string => typeof value === 'string' && value.length > 0)));
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

export function registerRealtimeDispatchServer(io: Server, channel: 'default' | 'dispatch' = 'default') {
  if (channel === 'dispatch') {
    dispatchRealtimeServer = io;
    return;
  }
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
    drivers: getDispatchVisibleDrivers(),
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
        driverId,
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

export function publishDriverEarningsUpdate(driverId: string, payload: {
  driverPayout: number;
  grossFare: number;
  platformFee: number;
  platformFeePercent: number;
  rideId: string;
  tips: number;
}) {
  const data = { ...payload, updatedAt: timestamp() };
  emitToRoom(`driver:${driverId}`, 'dispatch:earnings_update', data);
  emitToRoom(`user:${driverId}`, 'dispatch:earnings_update', data);
  return data;
}

export function publishDriverStatusChanged(driverId: string) {
  const profile = store.drivers.get(driverId);
  if (!profile) return null;
  const updatedAt = profile.lastStatusChangeAt || timestamp();
  const payload = {
    driverId,
    status: profile.availabilityStatus,
    available: profile.available,
    isOnline: profile.isOnline ?? (profile.availabilityStatus === 'online' || profile.availabilityStatus === 'assigned'),
    lat: Number.isFinite(Number(profile.lat)) ? Number(profile.lat) : undefined,
    lng: Number.isFinite(Number(profile.lng)) ? Number(profile.lng) : undefined,
    lastUpdate: updatedAt,
    updatedAt
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
  if (reason === 'accepted') {
    emitToRoom(`user:${ride.riderId}`, 'dispatch:assignment_confirmed', {
      reason,
      ride: normalizedRide,
      updatedAt
    });
  }
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
  getRealtimeRequestDriverIds(ride.id).forEach(driverId => {
    emitToRoom(`driver:${driverId}`, 'dispatch:rides', {
      reason,
      items: getDriverRealtimeRides(driverId),
      updatedAt
    });
  });

  return tripUpdatePayload;
}

export function publishDispatchRideRequest(driverId: string, payload: Record<string, unknown>) {
  const realtimePayload = {
    type: 'ride_request_created',
    ...payload
  };
  emitToRoom(`driver:${driverId}`, 'dispatch:ride_request', realtimePayload);
  emitToRoom(`driver:${driverId}`, 'ride_request_created', realtimePayload);
}

export function publishDispatchRequestExpired(driverId: string, payload: Record<string, unknown>) {
  emitToRoom(`driver:${driverId}`, 'dispatch:request_expired', payload);
}

export function publishDispatchRideAssigned(driverId: string, payload: Record<string, unknown>) {
  emitToRoom(`driver:${driverId}`, 'dispatch:ride_assigned', payload);
}

export function publishDispatchAssignmentConfirmed(riderId: string, payload: Record<string, unknown>) {
  emitToRoom(`user:${riderId}`, 'dispatch:assignment_confirmed', payload);
}

export function publishDriverRequestRejected(driverId: string, payload: Record<string, unknown>) {
  emitToRoom(`driver:${driverId}`, 'dispatch:request_rejected', payload);
}

export function publishDispatchRequestRejected(riderId: string, payload: Record<string, unknown>) {
  emitToRoom(`user:${riderId}`, 'dispatch:request_rejected', payload);
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

export function publishAdminSosAlert(payload: Record<string, unknown>) {
  emitToRoom('admin', 'admin:sos_alert', payload);
  console.log('[DISPATCH] admin:sos_alert broadcast', payload);
}
