import { dispatchRide } from '../utils/dispatch.engine';
import { estimateRoute } from './eta.service';
import {
  countCompletedRidesForRider,
  getActiveSurgeMultiplier,
  getPendingReferralEvent,
  getPromoByCode,
  hasUserUsedPromo,
  makeId,
  markStoreDirty,
  pushWalletTx,
  store,
  timestamp,
  type Ride,
  type RideFareDetails,
  type RideLifecycleState,
  type RiderProfile,
  type RideRequest,
  type RideRequestResponse
} from '../database/data.store';
import { markDriverAssigned, releaseDriverFromRide } from './drivers.service';
import { sendRealtimePushEvent } from './notifications.service';
import { publishDriverRealtimeEarnings, publishRideRealtimeUpdate, publishRiderRatingSubmitted } from './realtime-dispatch.service';
import { logger } from '../utils/logger';

const BASE_FARE = 2.5;
const DISTANCE_RATE = 1.9;
const TIME_RATE = 0.25;
const CURRENCY = 'USD';
const DEFAULT_SERVICE_FEE_PERCENT = 0.12;
const DEFAULT_WAIT_TIMEOUT_SECONDS = 5 * 60;
const DEFAULT_CANCELLATION_FEE_CENTS = 400;
const DEFAULT_NO_SHOW_FEE_CENTS = 500;
const RIDE_REQUEST_EXPIRY_MS = 30_000;
const MAX_FAVORITE_LOCATIONS = 10;

async function pushRideNotification(userId: string | undefined, category: string, title: string, body: string, template: string) {
  if (!userId) return;
  try {
    await sendRealtimePushEvent({ userId, category, title, body, template });
  } catch (error: any) {
    logger.warn('Ride notification push failed', { userId, category, template, error: error?.message });
  }
}

function getRide(id: string) {
  const ride = store.rides.get(id);
  if (!ride) return null;
  return ride;
}

function getRiderId(body: any) {
  return body?.actor?.id || body?.riderId || body?.userId;
}

function getDriverId(body: any) {
  return body?.actor?.id || body?.driverId;
}

function roundToTwoDecimals(amount: number) {
  return Math.round(amount * 100) / 100;
}

function centsToAmount(amountCents = 0) {
  return roundToTwoDecimals(amountCents / 100);
}

function amountToCents(amount = 0) {
  return Math.round(roundToTwoDecimals(amount) * 100);
}

function getRideEvents(ride: Ride) {
  return Array.isArray(ride.events) ? ride.events : [];
}

function getRideRequestByRideId(rideId: string) {
  return Array.from(store.rideRequests.values()).find(request => request.rideId === rideId) || null;
}

function ensureRiderProfile(riderId: string): RiderProfile {
  const existing = store.riders.get(riderId);
  if (existing) return existing;
  const profile = {
    userId: riderId,
    favoriteLocations: [],
    rating: 5,
    reviewCount: 0
  };
  store.riders.set(riderId, profile);
  markStoreDirty();
  return profile;
}

function syncRideRequestState(request: RideRequest, nextStatus?: RideRequest['status']) {
  const now = timestamp();
  if (nextStatus) {
    request.status = nextStatus;
    request.updatedAt = now;
    return request;
  }
  if (request.status === 'broadcasting' && new Date(request.expiresAt).getTime() <= Date.now()) {
    request.status = 'expired';
    request.updatedAt = now;
    request.responses = request.responses.map(response => response.status === 'broadcasted'
      ? { ...response, status: 'expired', respondedAt: now }
      : response);
    markStoreDirty();
  }
  return request;
}

function upsertRideRequestResponse(request: RideRequest, driverId: string, status: RideRequestResponse['status']) {
  const respondedAt = timestamp();
  const nextResponse = { driverId, status, respondedAt };
  const index = request.responses.findIndex(response => response.driverId === driverId);
  if (index >= 0) request.responses[index] = nextResponse;
  else request.responses.push(nextResponse);
  request.updatedAt = respondedAt;
  markStoreDirty();
  return nextResponse;
}

function appendRideEvent(
  ride: Ride,
  type: string,
  title: string,
  message: string,
  actorRole?: string,
  actorId?: string,
  createdAt = timestamp()
) {
  ride.events = [...getRideEvents(ride), { id: makeId('evt'), type, title, message, actorRole, actorId, createdAt }];
  ride.updatedAt = createdAt;
  markStoreDirty();
  return ride.events[ride.events.length - 1];
}

function buildFareDetails(
  miles: number,
  minutes: number,
  options?: {
    surgeMultiplier?: number;
    discountCents?: number;
    taxesCents?: number;
    tollsCents?: number;
    tipsCents?: number;
    serviceFeePercent?: number;
  }
) {
  const requestedSurgeMultiplier = Number(options?.surgeMultiplier || 1);
  const surgeMultiplier = requestedSurgeMultiplier >= 1 ? requestedSurgeMultiplier : 1;
  const serviceFeePercent = Number(options?.serviceFeePercent ?? DEFAULT_SERVICE_FEE_PERCENT);
  const baseFare = BASE_FARE;
  const distanceFare = roundToTwoDecimals(miles * DISTANCE_RATE);
  const timeFare = roundToTwoDecimals(minutes * TIME_RATE);
  const meterFare = roundToTwoDecimals(Math.max(baseFare, distanceFare + timeFare));
  const surgeFare = roundToTwoDecimals(meterFare * surgeMultiplier);
  const serviceFee = roundToTwoDecimals(surgeFare * serviceFeePercent);
  const taxes = centsToAmount(Number(options?.taxesCents || 0));
  const tolls = centsToAmount(Number(options?.tollsCents || 0));
  const discounts = centsToAmount(Number(options?.discountCents || 0));
  const tips = centsToAmount(Number(options?.tipsCents || 0));
  const subtotal = roundToTwoDecimals(surgeFare + serviceFee);
  const total = roundToTwoDecimals(Math.max(0, subtotal + taxes + tolls - discounts + tips));
  const driverEarnings = roundToTwoDecimals(Math.max(0, surgeFare + tips - serviceFee));
  const low = roundToTwoDecimals(Math.max(baseFare, total * 0.9));
  const high = roundToTwoDecimals(total * 1.15);
  const fareDetails: RideFareDetails = {
    currency: CURRENCY,
    baseFare,
    distanceFare,
    timeFare,
    meterFare,
    surgeMultiplier,
    surgeFare,
    serviceFeePercent,
    serviceFee,
    taxes,
    tolls,
    discounts,
    tips,
    subtotal,
    total,
    driverEarnings
  };
  return {
    ...fareDetails,
    fareEstimate: total,
    fareEstimateRange: { low, high }
  };
}

function getRideLifecycleState(ride: Ride): RideLifecycleState {
  if (ride.lifecycleState) return ride.lifecycleState;
  if (ride.status === 'requested') return 'requested';
  if (ride.status === 'accepted') return ride.arrivedAt ? 'waiting' : 'arriving';
  if (ride.status === 'arrived_at_pickup') return 'waiting';
  if (ride.status === 'started') return 'in_progress';
  if (ride.status === 'completed') return ride.rating && ride.passengerRating ? 'rated' : 'completed';
  if (ride.cancellationReason === 'rider_no_show') return 'no_show';
  return 'cancelled';
}

function setRideLifecycleState(ride: Ride, lifecycleState: RideLifecycleState) {
  ride.lifecycleState = lifecycleState;
  ride.updatedAt = timestamp();
  markStoreDirty();
}

function getWaitDurationSeconds(ride: Ride, now = Date.now()) {
  if (!ride.waitingSince) return 0;
  const waitingSinceMs = new Date(ride.waitingSince).getTime();
  if (!Number.isFinite(waitingSinceMs)) return 0;
  return Math.max(0, Math.floor((now - waitingSinceMs) / 1000));
}

function syncRatedLifecycleState(ride: Ride) {
  if (ride.status !== 'completed') return;
  ride.lifecycleState = ride.rating && ride.passengerRating ? 'rated' : 'completed';
  ride.updatedAt = timestamp();
  markStoreDirty();
}

function setCancellationDetails(
  ride: Ride,
  actorRole: 'rider' | 'driver' | 'system',
  reason: string,
  canceledAt: string,
  cancellationFeeCents = 0
) {
  ride.status = 'canceled';
  ride.lifecycleState = reason === 'rider_no_show' ? 'no_show' : 'cancelled';
  ride.canceledAt = canceledAt;
  ride.cancellationReason = reason;
  ride.cancellationActorRole = actorRole;
  ride.cancellationFeeCents = cancellationFeeCents;
  ride.paymentStatus = cancellationFeeCents > 0 ? 'settled_internal' : 'not_charged';
  ride.updatedAt = canceledAt;
  markStoreDirty();
}

function getRideAvailableActions(ride: Ride) {
  return {
    canCancel: ride.status === 'requested' || ride.status === 'accepted' || ride.status === 'arrived_at_pickup',
    canRate: ride.status === 'completed' && typeof ride.rating !== 'number',
    canViewReceipt: ride.status === 'completed' || ride.status === 'canceled',
    canTrackDriver: ride.status === 'accepted' || ride.status === 'arrived_at_pickup' || ride.status === 'started',
    canStartTrip: ride.status === 'arrived_at_pickup',
    canEndTrip: ride.status === 'started',
    canReportNoShow: ride.status === 'arrived_at_pickup',
    waitDurationSeconds: getWaitDurationSeconds(ride)
  };
}

function toRiderRideSummary(ride: Ride) {
  const events = getRideEvents(ride);
  return {
    ...ride,
    events,
    lifecycleState: getRideLifecycleState(ride),
    latestEvent: events[events.length - 1] || null,
    availableActions: getRideAvailableActions(ride)
  };
}

function getRideReceipt(ride: Ride) {
  if (ride.status !== 'completed' && ride.status !== 'canceled') return null;
  const fare = ride.fareDetails || buildFareDetails(ride.miles, ride.minutes, {
    surgeMultiplier: ride.surgeMultiplier,
    discountCents: ride.discountCents
  });
  const surgeMultiplier = fare.surgeMultiplier || ride.surgeMultiplier || 1;
  const discountCents = amountToCents(fare.discounts || 0);
  const totalCents = ride.status === 'completed'
    ? amountToCents(fare.total)
    : Number(ride.cancellationFeeCents || ride.noShowFeeCents || 0);
  const payment = Array.from(store.payments.values()).find(entry => entry.rideId === ride.id);
  const walletEntries = store.walletTx.filter(tx => tx.reason.startsWith(`ride:${ride.id}:`));
  return {
    receiptType: ride.status === 'completed' ? 'ride_receipt' : 'ride_cancellation',
    invoiceNumber: `INV-${ride.id.toUpperCase()}`,
    rideId: ride.id,
    riderId: ride.riderId,
    driverId: ride.driverId,
    status: ride.status,
    currency: fare.currency,
    issuedAt: ride.updatedAt,
    fareBreakdown: fare,
    surgeMultiplier,
    discountCents,
    totalCents,
    paymentStatus: payment?.status || ride.paymentStatus || (ride.status === 'completed' ? 'settled_internal' : 'not_charged'),
    walletEntries: walletEntries.map(entry => ({
      id: entry.id,
      kind: entry.kind,
      amountCents: entry.amountCents,
      reason: entry.reason,
      createdAt: entry.createdAt
    })),
    cancellationReason: ride.cancellationReason,
    cancellationFeeCents: ride.cancellationFeeCents || ride.noShowFeeCents || 0,
    lifecycleState: getRideLifecycleState(ride)
  };
}

function updateDriverRating(driverId?: string) {
  if (!driverId) return null;
  const profile = store.drivers.get(driverId);
  if (!profile) return null;
  const ratings = Array.from(store.rides.values())
    .filter(ride => ride.driverId === driverId && typeof ride.rating === 'number')
    .map(ride => Number(ride.rating));
  if (!ratings.length) return profile.rating;
  profile.rating = roundToTwoDecimals(ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length);
  markStoreDirty();
  return profile.rating;
}

function canAccessRide(authenticatedUser: any, ride: Ride) {
  if (!authenticatedUser?.id || !authenticatedUser?.role) return false;
  return authenticatedUser.role === 'admin' || ride.riderId === authenticatedUser.id || ride.driverId === authenticatedUser.id;
}

export async function estimate(body: any, _params?: any, _query?: any) {
  const miles = Number(body?.miles || body?.distanceMiles || 0);
  const minutes = Number(body?.minutes || body?.etaMinutes || 0);
  const route = await estimateRoute({ distanceMiles: miles || undefined, etaMinutes: minutes || undefined });
  const surgeMultiplier = getActiveSurgeMultiplier();
  const fare = buildFareDetails(route.distanceMiles, route.etaMinutes, {
    surgeMultiplier
  });
  const fareEstimate = fare.fareEstimate;
  const fareEstimateRange = fare.fareEstimateRange;
  return {
    module: 'rides',
    action: 'estimate',
    ok: true,
    route,
    currency: fare.currency,
    baseFare: fare.baseFare,
    surgeMultiplier,
    fareEstimate,
    fareEstimateRange,
    fareBreakdown: { ...fare, fareEstimate, fareEstimateRange },
    requestPreview: {
      pickupLat: body?.pickupLat,
      pickupLng: body?.pickupLng,
      dropoffLat: body?.dropoffLat,
      dropoffLng: body?.dropoffLng
    }
  };
}

export async function request(body: any, _params?: any, _query?: any) {
  const riderId = getRiderId(body);
  if (!riderId) return { module: 'rides', action: 'request', error: 'riderId is required' };
  const riderProfile = ensureRiderProfile(riderId);
  const pickupLat = Number(body?.pickupLat);
  const pickupLng = Number(body?.pickupLng);
  const hasValidPickupCoords = Number.isFinite(pickupLat) && Number.isFinite(pickupLng);

  const estimated = await estimate(body);
  const fareCents = Math.round(estimated.fareEstimate * 100);

  let promoId: string | undefined;
  let discountCents = 0;
  const promoCode: string | undefined = body?.promoCode;
  if (promoCode) {
    const promo = getPromoByCode(promoCode);
    if (!promo) return { module: 'rides', action: 'request', error: 'promo code not found' };
    if (promo.expiresAt && new Date(promo.expiresAt) < new Date()) {
      return { module: 'rides', action: 'request', error: 'promo code has expired' };
    }
    if (promo.maxUsages != null && promo.usageCount >= promo.maxUsages) {
      return { module: 'rides', action: 'request', error: 'promo code has reached its usage limit' };
    }
    if (promo.minFareCents != null && fareCents < promo.minFareCents) {
      return { module: 'rides', action: 'request', error: 'fare does not meet promo minimum' };
    }
    if (hasUserUsedPromo(riderId, promo.id)) {
      return { module: 'rides', action: 'request', error: 'promo code already used by this rider' };
    }
    discountCents = promo.discountType === 'flat'
      ? Math.min(promo.discountValue, fareCents)
      : Math.round(fareCents * promo.discountValue / 100);
    promoId = promo.id;
    promo.usageCount += 1;
    markStoreDirty();
  }

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
    surgeMultiplier: estimated.surgeMultiplier !== 1.0 ? estimated.surgeMultiplier : undefined,
    promoId,
    discountCents: discountCents > 0 ? discountCents : undefined,
    status: 'requested',
    lifecycleState: 'requested',
    events: [
      {
        id: makeId('evt'),
        type: 'ride_requested',
        title: 'Ride requested',
        message: 'Your ride request has been created and is waiting for dispatch.',
        actorId: riderId,
        actorRole: 'rider',
        createdAt: now
      }
    ],
    createdAt: now,
    updatedAt: now
  };
  store.rides.set(ride.id, ride);
  riderProfile.currentTripId = ride.id;
  riderProfile.lat = hasValidPickupCoords ? pickupLat : riderProfile.lat;
  riderProfile.lng = hasValidPickupCoords ? pickupLng : riderProfile.lng;
  riderProfile.lastLocationUpdatedAt = hasValidPickupCoords ? now : riderProfile.lastLocationUpdatedAt;
  if (typeof body?.vehiclePreference === 'string' && body.vehiclePreference.trim()) riderProfile.vehiclePreference = body.vehiclePreference.trim();
  if (typeof body?.routePreference === 'string' && body.routePreference.trim()) riderProfile.routePreference = body.routePreference.trim();
  if (body?.favoriteLocationLabel && hasValidPickupCoords) {
    const label = String(body.favoriteLocationLabel).trim();
    if (label && !riderProfile.favoriteLocations.some(location => location.label === label && location.lat === pickupLat && location.lng === pickupLng)) {
      riderProfile.favoriteLocations = [{ label, lat: pickupLat, lng: pickupLng }, ...riderProfile.favoriteLocations].slice(0, MAX_FAVORITE_LOCATIONS);
    }
  }
  const dispatch = await dispatchRide({ id: ride.id, pickupLat: ride.pickupLat, pickupLng: ride.pickupLng });
  const expiresAt = new Date(Date.now() + RIDE_REQUEST_EXPIRY_MS).toISOString();
  const rideRequest: RideRequest = {
    id: makeId('request'),
    rideId: ride.id,
    riderId,
    pickupLat: ride.pickupLat,
    pickupLng: ride.pickupLng,
    dropoffLat: ride.dropoffLat,
    dropoffLng: ride.dropoffLng,
    fareEstimate: ride.fareEstimate,
    broadcastedDrivers: dispatch.candidates.map(candidate => candidate.driverId),
    responses: dispatch.candidates.map(candidate => ({
      driverId: candidate.driverId,
      status: 'broadcasted' as const,
      respondedAt: now
    })),
    expiresAt,
    status: 'broadcasting',
    createdAt: now,
    updatedAt: now
  };
  store.rideRequests.set(rideRequest.id, rideRequest);
  if (dispatch.selected?.driverId && dispatch.candidates.length === 1) {
    const assigned = markDriverAssigned(dispatch.selected.driverId);
    if (assigned.ok) {
      ride.driverId = assigned.profile.userId;
      assigned.profile.currentTripId = ride.id;
      ride.status = 'accepted';
      ride.lifecycleState = 'arriving';
      rideRequest.acceptedDriverId = assigned.profile.userId;
      rideRequest.status = 'accepted';
      upsertRideRequestResponse(rideRequest, assigned.profile.userId, 'accepted');
      appendRideEvent(
        ride,
        'driver_assigned',
        'Driver assigned',
        'A driver has been assigned and is on the way to pickup.',
        'system',
        assigned.profile.userId
      );
      await pushRideNotification(
        assigned.profile.userId,
        'new_rides',
        'New ride assigned',
        'A rider has been matched to you. Open the app for trip details.',
        'new_ride_assigned'
      );
      await pushRideNotification(
        ride.riderId,
        'trip_updates',
        'Driver assigned',
        'A driver is on the way to your pickup location.',
        'trip_update_driver_assigned'
      );
    }
  }
  publishRideRealtimeUpdate(ride, 'ride_requested');
  return {
    module: 'rides',
    action: 'request',
    ok: true,
    ride: toRiderRideSummary(ride),
    request: syncRideRequestState(rideRequest),
    dispatch,
    discountCents,
    availableActions: getRideAvailableActions(ride)
  };
}

export async function history(body: any, _params?: any, _query?: any) {
  const actor = body?.actor;
  const riderId = actor?.role === 'rider' ? actor?.id : getRiderId(body);
  const limit = Math.max(1, Math.min(100, Number(body?.limit || 20)));
  const status = body?.status;
  const fromDate = body?.from ? new Date(body.from) : null;
  const toDate = body?.to ? new Date(body.to) : null;
  const validFromDate = fromDate && !Number.isNaN(fromDate.getTime()) ? fromDate : null;
  const validToDate = toDate && !Number.isNaN(toDate.getTime()) ? toDate : null;
  const rides = Array.from(store.rides.values())
    .filter(ride => {
      if (actor?.role === 'admin') return true;
      if (actor?.role === 'driver') return ride.driverId === actor.id;
      return ride.riderId === riderId;
    })
    .filter(ride => !status || ride.status === status)
    .filter(ride => !validFromDate || new Date(ride.updatedAt) >= validFromDate)
    .filter(ride => !validToDate || new Date(ride.updatedAt) <= validToDate)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return {
    module: 'rides',
    action: 'history',
    ok: true,
    rides: rides.slice(0, limit).map(toRiderRideSummary),
    summary: {
      total: rides.length,
      active: rides.filter(ride => ['requested', 'accepted', 'arrived_at_pickup', 'started'].includes(ride.status)).length,
      completed: rides.filter(ride => ride.status === 'completed').length,
      canceled: rides.filter(ride => ride.status === 'canceled').length
    }
  };
}

export async function detail(body: any, params?: any, _query?: any) {
  const rideId = params?.rideId || body?.rideId;
  const ride = getRide(rideId);
  if (!ride) return { module: 'rides', action: 'detail', error: 'ride not found' };
  if (!canAccessRide(body?.actor, ride)) return { module: 'rides', action: 'detail', error: 'forbidden' };
  const request = getRideRequestByRideId(ride.id);
  if (request) syncRideRequestState(request);
  return {
    module: 'rides',
    action: 'detail',
    ok: true,
    ride: toRiderRideSummary(ride),
    request,
    receipt: getRideReceipt(ride),
    notifications: getRideEvents(ride)
  };
}

export async function receipt(body: any, _params?: any, _query?: any) {
  const riderId = getRiderId(body);
  const ride = getRide(body?.rideId);
  if (!ride) return { module: 'rides', action: 'receipt', error: 'ride not found' };
  if (!riderId || ride.riderId !== riderId) return { module: 'rides', action: 'receipt', error: 'only rider can view receipt' };
  const rideReceipt = getRideReceipt(ride);
  if (!rideReceipt) return { module: 'rides', action: 'receipt', error: 'receipt unavailable until the ride is completed or canceled' };
  return { module: 'rides', action: 'receipt', ok: true, receipt: rideReceipt, ride: toRiderRideSummary(ride) };
}

export async function notifications(body: any, _params?: any, _query?: any) {
  const riderId = getRiderId(body);
  if (!riderId) return { module: 'rides', action: 'notifications', error: 'riderId is required' };
  const limit = Math.max(1, Math.min(100, Number(body?.limit || 20)));
  const rideNotifications = Array.from(store.rides.values())
    .filter(ride => ride.riderId === riderId)
    .filter(ride => !body?.rideId || ride.id === body.rideId)
    .flatMap(ride =>
      getRideEvents(ride).map(event => ({
        ...event,
        rideId: ride.id,
        rideStatus: ride.status
      }))
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return {
    module: 'rides',
    action: 'notifications',
    ok: true,
    notifications: rideNotifications.slice(0, limit),
    total: rideNotifications.length
  };
}

export async function accept(body: any, params?: any, _query?: any) {
  const rideId = params?.rideId || body?.rideId;
  const ride = getRide(rideId);
  if (!ride) return { module: 'rides', action: 'accept', error: 'ride not found' };
  const request = getRideRequestByRideId(ride.id);
  if (request) syncRideRequestState(request);
  if (request?.status === 'expired') {
    return { module: 'rides', action: 'accept', error: 'ride request expired' };
  }
  if (ride.status !== 'requested' && ride.status !== 'accepted') {
    return { module: 'rides', action: 'accept', error: `ride cannot be accepted: current status is ${ride.status}` };
  }
  const driverId = getDriverId(body);
  if (!driverId) return { module: 'rides', action: 'accept', error: 'driverId is required' };
  if (request && request.broadcastedDrivers.length === 0) {
    return { module: 'rides', action: 'accept', error: 'ride request has no broadcasted drivers' };
  }
  if (request && request.broadcastedDrivers.length && !request.broadcastedDrivers.includes(driverId)) {
    return { module: 'rides', action: 'accept', error: 'driver was not included in this request broadcast' };
  }
  if (ride.status === 'accepted' && ride.driverId === driverId) {
    if (request) syncRideRequestState(request, 'accepted');
    return { module: 'rides', action: 'accept', ok: true, ride: toRiderRideSummary(ride), request };
  }
  if (ride.status === 'accepted' && ride.driverId !== driverId) {
    if (request) upsertRideRequestResponse(request, driverId, 'ignored');
    return { module: 'rides', action: 'accept', error: 'ride is already accepted by another driver' };
  }
  const assigned = markDriverAssigned(driverId);
  if (!assigned.ok) return { module: 'rides', action: 'accept', error: assigned.error };
  ride.driverId = driverId;
  ride.status = 'accepted';
  ride.lifecycleState = 'arriving';
  assigned.profile.currentTripId = ride.id;
  if (request) {
    request.acceptedDriverId = driverId;
    syncRideRequestState(request, 'accepted');
    upsertRideRequestResponse(request, driverId, 'accepted');
  }
  appendRideEvent(ride, 'driver_assigned', 'Pickup approaching', 'Driver is heading to your pickup point now.', 'driver', driverId);
  await pushRideNotification(
    ride.riderId,
    'trip_updates',
    'Driver accepted your ride',
    'Your driver is heading to your pickup location.',
    'trip_update_accepted'
  );
  publishRideRealtimeUpdate(ride, 'accepted');
  return { module: 'rides', action: 'accept', ok: true, ride: toRiderRideSummary(ride), request };
}

export async function arrive(body: any, _params?: any, _query?: any) {
  const ride = getRide(body?.rideId);
  if (!ride) return { module: 'rides', action: 'arrive', error: 'ride not found' };
  const driverId = getDriverId(body);
  if (!driverId || ride.driverId !== driverId) return { module: 'rides', action: 'arrive', error: 'only assigned driver can mark arrival' };
  if (ride.status !== 'accepted') return { module: 'rides', action: 'arrive', error: 'ride must be accepted to mark arrival' };
  const now = timestamp();
  ride.status = 'arrived_at_pickup';
  ride.arrivedAt = now;
  ride.waitingSince = now;
  ride.waitTimeoutAt = new Date(Date.now() + DEFAULT_WAIT_TIMEOUT_SECONDS * 1000).toISOString();
  ride.lifecycleState = 'waiting';
  appendRideEvent(ride, 'driver_arrived', 'Driver arrived', 'Your driver has arrived at the pickup point.', 'driver', driverId, now);
  await pushRideNotification(
    ride.riderId,
    'trip_updates',
    'Driver arrived',
    'Your driver is waiting at the pickup location.',
    'trip_update_arrived'
  );
  publishRideRealtimeUpdate(ride, 'arrived_at_pickup');
  return { module: 'rides', action: 'arrive', ok: true, ride: toRiderRideSummary(ride), arrivedAt: now };
}

export async function start(body: any, _params?: any, _query?: any) {
  const ride = getRide(body?.rideId);
  if (!ride) return { module: 'rides', action: 'start', error: 'ride not found' };
  const driverId = getDriverId(body);
  if (!driverId || ride.driverId !== driverId) return { module: 'rides', action: 'start', error: 'only assigned driver can start ride' };
  if (ride.status !== 'arrived_at_pickup') return { module: 'rides', action: 'start', error: 'ride must be at pickup before start' };
  if (body?.riderConfirmed !== true) return { module: 'rides', action: 'start', error: 'rider confirmation is required before start' };
  const now = timestamp();
  ride.status = 'started';
  ride.lifecycleState = 'in_progress';
  ride.startConfirmationAt = now;
  ride.startedAt = now;
  appendRideEvent(ride, 'passenger_onboard', 'Passenger onboard', 'Passenger has been picked up and the trip is now in progress.', 'driver', driverId, now);
  await pushRideNotification(
    ride.riderId,
    'trip_updates',
    'Trip started',
    'Your trip is now in progress.',
    'trip_update_started'
  );
  publishRideRealtimeUpdate(ride, 'started');
  return { module: 'rides', action: 'start', ok: true, ride: toRiderRideSummary(ride) };
}

export async function complete(body: any, _params?: any, _query?: any) {
  const ride = getRide(body?.rideId);
  if (!ride) return { module: 'rides', action: 'complete', error: 'ride not found' };
  const driverId = getDriverId(body);
  if (!driverId || ride.driverId !== driverId) return { module: 'rides', action: 'complete', error: 'only assigned driver can complete ride' };
  if (ride.status !== 'started') return { module: 'rides', action: 'complete', error: 'ride not started' };

  const completedAt = timestamp();
  ride.status = 'completed';
  ride.lifecycleState = 'completed';
  ride.completedAt = completedAt;
  ride.fareDetails = buildFareDetails(ride.miles, ride.minutes, {
    surgeMultiplier: ride.surgeMultiplier,
    discountCents: ride.discountCents,
    taxesCents: Number(body?.taxesCents || 0),
    tollsCents: Number(body?.tollsCents || 0),
    tipsCents: Number(body?.tipsCents || 0)
  });
  ride.fareEstimate = ride.fareDetails.total;
  ride.paymentStatus = 'settled_internal';
  const request = getRideRequestByRideId(ride.id);
  if (request) syncRideRequestState(request, 'completed');
  appendRideEvent(ride, 'ride_completed', 'Ride completed', 'Your trip is complete and receipt details are ready.', 'driver', driverId, completedAt);
  await pushRideNotification(
    ride.riderId,
    'trip_updates',
    'Trip completed',
    'Your ride is complete and receipt details are ready.',
    'trip_update_completed'
  );
  if (ride.driverId) releaseDriverFromRide(ride.driverId);
  const driverProfile = ride.driverId ? store.drivers.get(ride.driverId) : null;
  if (driverProfile?.currentTripId === ride.id) driverProfile.currentTripId = undefined;

  const grossCents = amountToCents(ride.fareDetails.subtotal);
  const discountCents = amountToCents(ride.fareDetails.discounts);
  const amountCents = amountToCents(ride.fareDetails.total);
  if (ride.riderId) pushWalletTx(ride.riderId, 'debit', amountCents, `ride:${ride.id}:fare`);
  const driverPayoutCents = amountToCents(ride.fareDetails.driverEarnings);
  if (ride.driverId) {
    pushWalletTx(ride.driverId, 'credit', driverPayoutCents, `ride:${ride.id}:payout`);
    await pushRideNotification(
      ride.driverId,
      'earnings',
      'Earnings updated',
      `You earned $${(driverPayoutCents / 100).toFixed(2)} from your latest trip.`,
      'earnings_ride_payout'
    );
  }

  // Process referral bonus on rider's first completed ride
  if (ride.riderId) {
    const completedCount = countCompletedRidesForRider(ride.riderId);
    if (completedCount === 1) {
      const referral = getPendingReferralEvent(ride.riderId);
      if (referral) {
        referral.paid = true;
        referral.rideId = ride.id;
        markStoreDirty();
        pushWalletTx(referral.referrerUserId, 'credit', referral.bonusCents, `referral:${referral.id}:bonus`);
        await pushRideNotification(
          referral.referrerUserId,
          'bonuses',
          'Referral bonus earned',
          `You received $${(referral.bonusCents / 100).toFixed(2)} for a completed referral ride.`,
          'bonus_referral'
        );
      }
    }
  }

  const riderProfile = store.riders.get(ride.riderId);
  if (riderProfile?.currentTripId === ride.id) riderProfile.currentTripId = undefined;
  publishRideRealtimeUpdate(ride, 'completed');
  if (ride.driverId) publishDriverRealtimeEarnings(ride.driverId);
  return { module: 'rides', action: 'complete', ok: true, ride: toRiderRideSummary(ride), grossCents, discountCents, amountCents, receipt: getRideReceipt(ride) };
}

export async function noShow(body: any, _params?: any, _query?: any) {
  const ride = getRide(body?.rideId);
  if (!ride) return { module: 'rides', action: 'no-show', error: 'ride not found' };
  const driverId = getDriverId(body);
  if (!driverId || ride.driverId !== driverId) return { module: 'rides', action: 'no-show', error: 'only assigned driver can report no-show' };
  if (ride.status !== 'arrived_at_pickup') return { module: 'rides', action: 'no-show', error: 'driver must be at pickup to report no-show' };
  const now = timestamp();
  const waitDurationSeconds = getWaitDurationSeconds(ride);
  if (!body?.manual && waitDurationSeconds < DEFAULT_WAIT_TIMEOUT_SECONDS) {
    return { module: 'rides', action: 'no-show', error: 'wait timer must expire before automatic no-show' };
  }
  ride.noShowFeeCents = DEFAULT_NO_SHOW_FEE_CENTS;
  ride.photoEvidenceUrl = typeof body?.photoEvidenceUrl === 'string' ? body.photoEvidenceUrl.trim() || undefined : undefined;
  ride.noShowReportedAt = now;
  setCancellationDetails(ride, 'driver', 'rider_no_show', now, DEFAULT_NO_SHOW_FEE_CENTS);
  const request = getRideRequestByRideId(ride.id);
  if (request) syncRideRequestState(request, 'canceled');
  appendRideEvent(ride, 'rider_no_show', 'Rider no-show', 'Driver waited at pickup but rider did not appear.', 'driver', driverId, now);
  if (ride.driverId) releaseDriverFromRide(ride.driverId);
  const driverProfile = store.drivers.get(driverId);
  if (driverProfile?.currentTripId === ride.id) driverProfile.currentTripId = undefined;
  const riderProfile = store.riders.get(ride.riderId);
  if (riderProfile?.currentTripId === ride.id) riderProfile.currentTripId = undefined;
  if (ride.riderId) pushWalletTx(ride.riderId, 'debit', DEFAULT_NO_SHOW_FEE_CENTS, `ride:${ride.id}:no_show_fee`);
  if (ride.driverId) {
    pushWalletTx(ride.driverId, 'credit', DEFAULT_NO_SHOW_FEE_CENTS, `ride:${ride.id}:cancellation_payout`);
    await pushRideNotification(
      ride.driverId,
      'earnings',
      'No-show fee credited',
      `A $${(DEFAULT_NO_SHOW_FEE_CENTS / 100).toFixed(2)} no-show fee has been added to your earnings.`,
      'earnings_no_show'
    );
    publishDriverRealtimeEarnings(ride.driverId);
  }
  await pushRideNotification(
    ride.riderId,
    'trip_updates',
    'Driver marked a no-show',
    'The trip was canceled because the rider did not arrive at pickup.',
    'trip_update_no_show'
  );
  publishRideRealtimeUpdate(ride, 'canceled');
  return {
    module: 'rides',
    action: 'no-show',
    ok: true,
    ride: toRiderRideSummary(ride),
    cancellation: {
      canceledAt: now,
      cancellationReason: 'rider_no_show',
      cancellationActorRole: 'driver',
      cancellationFeeCents: DEFAULT_NO_SHOW_FEE_CENTS
    },
    receipt: getRideReceipt(ride)
  };
}

export async function driverCancel(body: any, _params?: any, _query?: any) {
  const ride = getRide(body?.rideId);
  if (!ride) return { module: 'rides', action: 'driver-cancel', error: 'ride not found' };
  const driverId = getDriverId(body);
  if (!driverId || ride.driverId !== driverId) return { module: 'rides', action: 'driver-cancel', error: 'only assigned driver can cancel ride' };
  if (ride.status === 'canceled') return { module: 'rides', action: 'driver-cancel', error: 'ride already canceled' };
  if (ride.status === 'completed') return { module: 'rides', action: 'driver-cancel', error: 'cannot cancel completed ride' };
  if (ride.status === 'started') return { module: 'rides', action: 'driver-cancel', error: 'cannot cancel ride in progress' };
  const reason: string = typeof body?.reason === 'string' && body.reason.trim() ? body.reason.trim() : 'canceled_by_driver';
  const now = timestamp();
  setCancellationDetails(ride, 'driver', reason, now, 0);
  const request = getRideRequestByRideId(ride.id);
  if (request) {
    syncRideRequestState(request, 'canceled');
    upsertRideRequestResponse(request, driverId, 'canceled');
  }
  appendRideEvent(ride, 'ride_canceled', 'Ride canceled by driver', `Driver canceled the ride: ${reason}.`, 'driver', driverId, now);
  releaseDriverFromRide(driverId);
  const driverProfile = store.drivers.get(driverId);
  if (driverProfile?.currentTripId === ride.id) driverProfile.currentTripId = undefined;
  const riderProfile = store.riders.get(ride.riderId);
  if (riderProfile?.currentTripId === ride.id) riderProfile.currentTripId = undefined;
  await pushRideNotification(
    ride.riderId,
    'trip_updates',
    'Driver canceled the trip',
    `The driver canceled the trip: ${reason}.`,
    'trip_update_driver_canceled'
  );
  publishRideRealtimeUpdate(ride, 'canceled');
  return {
    module: 'rides',
    action: 'driver-cancel',
    ok: true,
    ride: toRiderRideSummary(ride),
    cancellation: {
      canceledAt: now,
      cancellationReason: reason,
      cancellationActorRole: 'driver',
      cancellationFeeCents: 0
    },
    receipt: getRideReceipt(ride)
  };
}

export async function cancel(body: any, _params?: any, _query?: any) {
  const ride = getRide(body?.rideId);
  if (!ride) return { module: 'rides', action: 'cancel', error: 'ride not found' };
  const riderId = getRiderId(body);
  if (!riderId || ride.riderId !== riderId) return { module: 'rides', action: 'cancel', error: 'only rider can cancel ride' };
  if (ride.status === 'canceled') return { module: 'rides', action: 'cancel', error: 'ride already canceled' };
  if (ride.status === 'completed') return { module: 'rides', action: 'cancel', error: 'cannot cancel completed ride' };
  if (ride.status === 'started') return { module: 'rides', action: 'cancel', error: 'cannot cancel started ride' };
  const canceledAt = timestamp();
  const cancellationReason = body?.reason || 'canceled_by_rider';
  const cancellationFeeCents = ride.status === 'arrived_at_pickup' ? DEFAULT_CANCELLATION_FEE_CENTS : 0;
  setCancellationDetails(ride, 'rider', cancellationReason, canceledAt, cancellationFeeCents);
  const request = getRideRequestByRideId(ride.id);
  if (request) syncRideRequestState(request, 'canceled');
  appendRideEvent(
    ride,
    'ride_canceled',
    'Ride canceled',
    cancellationFeeCents > 0 ? 'Your ride was canceled after the driver arrived at pickup.' : 'Your ride was canceled before pickup.',
    'rider',
    riderId,
    canceledAt
  );
  await pushRideNotification(
    ride.riderId,
    'trip_updates',
    'Trip canceled',
    cancellationFeeCents > 0
      ? `Your ride request was canceled and a $${(cancellationFeeCents / 100).toFixed(2)} cancellation fee was applied.`
      : 'Your ride request was canceled.',
    'trip_update_canceled'
  );
  await pushRideNotification(
    ride.driverId,
    'trip_updates',
    'Rider canceled the trip',
    cancellationFeeCents > 0
      ? `The rider canceled after arrival. You received a $${(cancellationFeeCents / 100).toFixed(2)} cancellation fee.`
      : 'The rider canceled before pickup.',
    'trip_update_rider_canceled'
  );
  if (cancellationFeeCents > 0) {
    pushWalletTx(ride.riderId, 'debit', cancellationFeeCents, `ride:${ride.id}:cancellation_fee`);
    if (ride.driverId) {
      pushWalletTx(ride.driverId, 'credit', cancellationFeeCents, `ride:${ride.id}:cancellation_payout`);
      await pushRideNotification(
        ride.driverId,
        'earnings',
        'Cancellation fee credited',
        `A $${(cancellationFeeCents / 100).toFixed(2)} cancellation fee has been added to your earnings.`,
        'earnings_cancellation'
      );
      publishDriverRealtimeEarnings(ride.driverId);
    }
  }
  if (ride.driverId) releaseDriverFromRide(ride.driverId);
  const driverProfile = ride.driverId ? store.drivers.get(ride.driverId) : null;
  if (driverProfile?.currentTripId === ride.id) driverProfile.currentTripId = undefined;
  const riderProfile = store.riders.get(ride.riderId);
  if (riderProfile?.currentTripId === ride.id) riderProfile.currentTripId = undefined;
  publishRideRealtimeUpdate(ride, 'canceled');
  return {
    module: 'rides',
    action: 'cancel',
    ok: true,
    ride: toRiderRideSummary(ride),
    cancellation: {
      canceledAt: ride.canceledAt,
      cancellationReason: ride.cancellationReason,
      cancellationFeeCents
    },
    receipt: getRideReceipt(ride)
  };
}

export async function rate(body: any, _params?: any, _query?: any) {
  const ride = getRide(body?.rideId);
  if (!ride) return { module: 'rides', action: 'rate', error: 'ride not found' };
  const riderId = getRiderId(body);
  if (!riderId || ride.riderId !== riderId) return { module: 'rides', action: 'rate', error: 'only rider can rate ride' };
  if (ride.status !== 'completed') return { module: 'rides', action: 'rate', error: 'only completed rides can be rated' };
  if (typeof ride.rating === 'number') return { module: 'rides', action: 'rate', error: 'ride already rated' };
  const rating = Number(body?.rating);
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) return { module: 'rides', action: 'rate', error: 'rating must be 1-5' };
  ride.rating = rating;
  ride.review = typeof body?.review === 'string' ? body.review.trim() || undefined : undefined;
  ride.ratedAt = timestamp();
  appendRideEvent(ride, 'ride_rated', 'Trip rated', 'Thanks for rating this ride.', 'rider', riderId, ride.ratedAt);
  const riderProfile = ensureRiderProfile(riderId);
  riderProfile.reviewCount += 1;
  const driverRating = updateDriverRating(ride.driverId);
  publishRiderRatingSubmitted(ride);
  syncRatedLifecycleState(ride);
  return { module: 'rides', action: 'rate', ok: true, rideId: ride.id, rating, review: ride.review, driverRating, ride: toRiderRideSummary(ride) };
}

export async function ratePassenger(body: any, _params?: any, _query?: any) {
  const ride = getRide(body?.rideId);
  if (!ride) return { module: 'rides', action: 'rate-passenger', error: 'ride not found' };
  const driverId = getDriverId(body);
  if (!driverId || ride.driverId !== driverId) {
    return { module: 'rides', action: 'rate-passenger', error: 'only assigned driver can rate passenger' };
  }
  if (ride.status !== 'completed') {
    return { module: 'rides', action: 'rate-passenger', error: 'only completed rides can be rated' };
  }
  if (typeof ride.passengerRating === 'number') {
    return { module: 'rides', action: 'rate-passenger', error: 'passenger already rated' };
  }
  const rating = Number(body?.rating);
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    return { module: 'rides', action: 'rate-passenger', error: 'rating must be 1-5' };
  }
  ride.passengerRating = rating;
  ride.passengerReview = typeof body?.comment === 'string' ? body.comment.trim() || undefined : undefined;
  ride.passengerRatedAt = timestamp();
  appendRideEvent(ride, 'passenger_rated', 'Passenger rated', 'Driver submitted passenger feedback.', 'driver', driverId, ride.passengerRatedAt);
  syncRatedLifecycleState(ride);
  return {
    module: 'rides',
    action: 'rate-passenger',
    ok: true,
    rideId: ride.id,
    rating,
    comment: ride.passengerReview,
    ride: toRiderRideSummary(ride)
  };
}

export async function updateStatus(body: any, params?: any, query?: any) {
  const rideId = params?.rideId || body?.rideId;
  const status = String(body?.status || '').trim().toLowerCase();
  if (!rideId) return { module: 'rides', action: 'update-status', error: 'rideId is required' };
  if (!status) return { module: 'rides', action: 'update-status', error: 'status is required' };

  const payload = { ...body, rideId };
  if (status === 'accepted') return accept(payload, params, query);
  if (status === 'arrived' || status === 'arrived_at_pickup') return arrive(payload, params, query);
  if (status === 'started' || status === 'in_progress') {
    const ride = getRide(rideId);
    if (ride?.status === 'accepted') {
      const arriveResult = await arrive(payload, params, query);
      if (!arriveResult?.ok) return arriveResult;
      return start({ ...payload, riderConfirmed: payload?.riderConfirmed ?? true }, params, query);
    }
    return start(payload, params, query);
  }
  if (status === 'completed') return complete(payload, params, query);
  if (status === 'cancelled' || status === 'canceled') {
    return body?.actor?.role === 'driver' ? driverCancel(payload, params, query) : cancel(payload, params, query);
  }
  return { module: 'rides', action: 'update-status', error: 'unsupported status transition' };
}

export async function submitRating(body: any, params?: any, query?: any) {
  const payload = { ...body, rideId: params?.rideId || body?.rideId };
  return body?.actor?.role === 'driver' ? ratePassenger(payload, params, query) : rate(payload, params, query);
}

export async function message(body: any, _params?: any, _query?: any) {
  const ride = getRide(body?.rideId);
  if (!ride) return { module: 'rides', action: 'message', error: 'ride not found' };
  if (!canAccessRide(body?.actor, ride)) {
    return { module: 'rides', action: 'message', error: 'forbidden' };
  }
  const message = typeof body?.message === 'string' ? body.message.trim() : '';
  if (!message) return { module: 'rides', action: 'message', error: 'message is required' };
  const actor = body?.actor;
  const event = appendRideEvent(ride, 'chat_message', 'Trip chat', message, actor?.role, actor?.id);
  return { module: 'rides', action: 'message', ok: true, message: event, rideId: ride.id };
}
