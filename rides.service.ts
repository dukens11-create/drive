import { dispatchRide } from './dispatch.engine';
import { estimateRoute } from './eta.service';
import { makeId, markStoreDirty, pushWalletTx, store, timestamp, type Ride } from './data.store';
import { markDriverAssigned, releaseDriverFromRide } from './drivers.service';

const BASE_FARE = 2.5;
const DISTANCE_RATE = 1.9;
const TIME_RATE = 0.25;
const CURRENCY = 'USD';

function getRide(id: string) {
  const ride = store.rides.get(id);
  if (!ride) throw new Error('ride not found');
  return ride;
}

function getRiderId(body: any) {
  return body?.actor?.id || body?.riderId || body?.userId;
}

function getDriverId(body: any) {
  return body?.actor?.id || body?.driverId;
}

function roundCurrency(amount: number) {
  return Math.round(amount * 100) / 100;
}

function getRideEvents(ride: Ride) {
  return Array.isArray(ride.events) ? ride.events : [];
}

function appendRideEvent(
  ride: Ride,
  type: string,
  title: string,
  message: string,
  actorRole?: string,
  actorId?: string,
  createdAt = timestamp()
)
{
  ride.events = [...getRideEvents(ride), { id: makeId('evt'), type, title, message, actorRole, actorId, createdAt }];
  ride.updatedAt = createdAt;
  markStoreDirty();
  return ride.events[ride.events.length - 1];
}

function buildFareDetails(miles: number, minutes: number) {
  const baseFare = BASE_FARE;
  const distanceFare = roundCurrency(miles * DISTANCE_RATE);
  const timeFare = roundCurrency(minutes * TIME_RATE);
  const subtotal = roundCurrency(baseFare + distanceFare + timeFare);
  const low = roundCurrency(Math.max(baseFare, subtotal * 0.9));
  const high = roundCurrency(subtotal * 1.15);
  return {
    currency: CURRENCY,
    baseFare,
    distanceFare,
    timeFare,
    subtotal,
    fareEstimate: subtotal,
    fareEstimateRange: { low, high }
  };
}

function getRideAvailableActions(ride: Ride) {
  return {
    canCancel: ride.status === 'requested' || ride.status === 'accepted',
    canRate: ride.status === 'completed' && typeof ride.rating !== 'number',
    canViewReceipt: ride.status === 'completed' || ride.status === 'canceled',
    canTrackDriver: ride.status === 'accepted' || ride.status === 'started'
  };
}

function toRiderRideSummary(ride: Ride) {
  const events = getRideEvents(ride);
  return {
    ...ride,
    events,
    latestEvent: events[events.length - 1] || null,
    availableActions: getRideAvailableActions(ride)
  };
}

function getRideReceipt(ride: Ride) {
  if (ride.status !== 'completed' && ride.status !== 'canceled') return null;
  const fare = buildFareDetails(ride.miles, ride.minutes);
  const totalCents = ride.status === 'completed' ? Math.round(fare.fareEstimate * 100) : 0;
  const payment = Array.from(store.payments.values()).find(entry => entry.rideId === ride.id);
  const walletEntries = store.walletTx.filter(tx => tx.reason.startsWith(`ride:${ride.id}:`));
  return {
    receiptType: ride.status === 'completed' ? 'ride_receipt' : 'ride_cancellation',
    invoiceNumber: `INV-${ride.id.replace(/[^a-z0-9]/gi, '').toUpperCase()}`,
    rideId: ride.id,
    riderId: ride.riderId,
    driverId: ride.driverId,
    status: ride.status,
    currency: fare.currency,
    issuedAt: ride.updatedAt,
    fareBreakdown: fare,
    totalCents,
    paymentStatus: payment?.status || (ride.status === 'completed' ? 'settled_internal' : 'not_charged'),
    walletEntries: walletEntries.map(entry => ({
      id: entry.id,
      kind: entry.kind,
      amountCents: entry.amountCents,
      reason: entry.reason,
      createdAt: entry.createdAt
    })),
    cancellationReason: ride.cancellationReason
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
  profile.rating = roundCurrency(ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length);
  markStoreDirty();
  return profile.rating;
}

function getOwnedRideForRider(rideId: string, riderId: string, action: string) {
  const ride = getRide(rideId);
  if (!riderId || ride.riderId !== riderId) return { error: `only rider can ${action}` };
  return { ride };
}

export async function estimate(body: any, _params?: any, _query?: any) {
  const miles = Number(body?.miles || body?.distanceMiles || 0);
  const minutes = Number(body?.minutes || body?.etaMinutes || 0);
  const route = await estimateRoute({ distanceMiles: miles || undefined, etaMinutes: minutes || undefined });
  const fare = buildFareDetails(route.distanceMiles, route.etaMinutes);
  return {
    module: 'rides',
    action: 'estimate',
    ok: true,
    route,
    currency: fare.currency,
    fareEstimate: fare.fareEstimate,
    fareEstimateRange: fare.fareEstimateRange,
    fareBreakdown: fare,
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
    status: 'requested',
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
  const dispatch = await dispatchRide({ id: ride.id, pickupLat: ride.pickupLat, pickupLng: ride.pickupLng });
  if (dispatch.selected?.driverId) {
    const assigned = markDriverAssigned(dispatch.selected.driverId);
    if (assigned.ok) {
      ride.driverId = assigned.profile.userId;
      ride.status = 'accepted';
      appendRideEvent(
        ride,
        'driver_assigned',
        'Driver assigned',
        'A driver has been assigned and is on the way to pickup.',
        'system',
        assigned.profile.userId
      );
    }
  }
  return { module: 'rides', action: 'request', ok: true, ride, dispatch, availableActions: getRideAvailableActions(ride) };
}

export async function history(body: any, _params?: any, _query?: any) {
  const riderId = getRiderId(body);
  if (!riderId) return { module: 'rides', action: 'history', error: 'riderId is required' };
  const limit = Math.max(1, Math.min(100, Number(body?.limit || 20)));
  const status = body?.status;
  const rides = Array.from(store.rides.values())
    .filter(ride => ride.riderId === riderId)
    .filter(ride => !status || ride.status === status)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return {
    module: 'rides',
    action: 'history',
    ok: true,
    rides: rides.slice(0, limit).map(toRiderRideSummary),
    summary: {
      total: rides.length,
      active: rides.filter(ride => ['requested', 'accepted', 'started'].includes(ride.status)).length,
      completed: rides.filter(ride => ride.status === 'completed').length,
      canceled: rides.filter(ride => ride.status === 'canceled').length
    }
  };
}

export async function detail(body: any, _params?: any, _query?: any) {
  const riderId = getRiderId(body);
  const result = getOwnedRideForRider(body?.rideId, riderId, 'view ride detail');
  if ('error' in result) return { module: 'rides', action: 'detail', error: result.error };
  return {
    module: 'rides',
    action: 'detail',
    ok: true,
    ride: toRiderRideSummary(result.ride),
    receipt: getRideReceipt(result.ride),
    notifications: getRideEvents(result.ride)
  };
}

export async function receipt(body: any, _params?: any, _query?: any) {
  const riderId = getRiderId(body);
  const result = getOwnedRideForRider(body?.rideId, riderId, 'view receipt');
  if ('error' in result) return { module: 'rides', action: 'receipt', error: result.error };
  const receipt = getRideReceipt(result.ride);
  if (!receipt) return { module: 'rides', action: 'receipt', error: 'receipt unavailable until the ride is completed or canceled' };
  return { module: 'rides', action: 'receipt', ok: true, receipt, ride: toRiderRideSummary(result.ride) };
}

export async function notifications(body: any, _params?: any, _query?: any) {
  const riderId = getRiderId(body);
  if (!riderId) return { module: 'rides', action: 'notifications', error: 'riderId is required' };
  const limit = Math.max(1, Math.min(100, Number(body?.limit || 20)));
  const notifications = Array.from(store.rides.values())
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
    notifications: notifications.slice(0, limit),
    total: notifications.length
  };
}

export async function accept(body: any, _params?: any, _query?: any) {
  const ride = getRide(body?.rideId);
  if (ride.status !== 'requested' && ride.status !== 'accepted') {
    return { module: 'rides', action: 'accept', error: `ride cannot be accepted: current status is ${ride.status}` };
  }
  const driverId = getDriverId(body);
  if (!driverId) return { module: 'rides', action: 'accept', error: 'driverId is required' };
  if (ride.status === 'accepted' && ride.driverId === driverId) return { module: 'rides', action: 'accept', ok: true, ride };
  if (ride.status === 'accepted' && ride.driverId !== driverId) {
    return { module: 'rides', action: 'accept', error: 'ride is already accepted by another driver' };
  }
  const assigned = markDriverAssigned(driverId);
  if (!assigned.ok) return { module: 'rides', action: 'accept', error: assigned.error };
  ride.driverId = driverId;
  ride.status = 'accepted';
  appendRideEvent(ride, 'driver_assigned', 'Driver assigned', 'Your driver accepted the trip.', 'driver', driverId);
  return { module: 'rides', action: 'accept', ok: true, ride };
}

export async function start(body: any, _params?: any, _query?: any) {
  const ride = getRide(body?.rideId);
  const driverId = getDriverId(body);
  if (!driverId || ride.driverId !== driverId) return { module: 'rides', action: 'start', error: 'only assigned driver can start ride' };
  if (ride.status !== 'accepted') return { module: 'rides', action: 'start', error: 'ride not accepted' };
  ride.status = 'started';
  appendRideEvent(ride, 'ride_started', 'Ride started', 'Your trip is in progress.', 'driver', driverId);
  return { module: 'rides', action: 'start', ok: true, ride };
}

export async function complete(body: any, _params?: any, _query?: any) {
  const ride = getRide(body?.rideId);
  const driverId = getDriverId(body);
  if (!driverId || ride.driverId !== driverId) return { module: 'rides', action: 'complete', error: 'only assigned driver can complete ride' };
  if (ride.status !== 'started') return { module: 'rides', action: 'complete', error: 'ride not started' };

  ride.status = 'completed';
  appendRideEvent(ride, 'ride_completed', 'Ride completed', 'Your trip is complete and receipt details are ready.', 'driver', driverId);
  if (ride.driverId) releaseDriverFromRide(ride.driverId);

  const amountCents = Math.round(ride.fareEstimate * 100);
  if (ride.riderId) pushWalletTx(ride.riderId, 'debit', amountCents, `ride:${ride.id}:fare`);
  if (ride.driverId) pushWalletTx(ride.driverId, 'credit', Math.round(amountCents * 0.8), `ride:${ride.id}:payout`);

  return { module: 'rides', action: 'complete', ok: true, ride, amountCents, receipt: getRideReceipt(ride) };
}

export async function cancel(body: any, _params?: any, _query?: any) {
  const ride = getRide(body?.rideId);
  const riderId = getRiderId(body);
  if (!riderId || ride.riderId !== riderId) return { module: 'rides', action: 'cancel', error: 'only rider can cancel ride' };
  if (ride.status === 'canceled') return { module: 'rides', action: 'cancel', error: 'ride already canceled' };
  if (ride.status === 'completed') return { module: 'rides', action: 'cancel', error: 'cannot cancel completed ride' };
  if (ride.status === 'started') return { module: 'rides', action: 'cancel', error: 'cannot cancel started ride' };
  ride.status = 'canceled';
  ride.canceledAt = timestamp();
  ride.cancellationReason = body?.reason || 'canceled_by_rider';
  appendRideEvent(ride, 'ride_canceled', 'Ride canceled', 'Your ride was canceled before pickup.', 'rider', riderId, ride.canceledAt);
  if (ride.driverId) releaseDriverFromRide(ride.driverId);
  return {
    module: 'rides',
    action: 'cancel',
    ok: true,
    ride,
    cancellation: {
      canceledAt: ride.canceledAt,
      cancellationReason: ride.cancellationReason,
      cancellationFeeCents: 0
    },
    receipt: getRideReceipt(ride)
  };
}

export async function rate(body: any, _params?: any, _query?: any) {
  const ride = getRide(body?.rideId);
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
  const driverRating = updateDriverRating(ride.driverId);
  return { module: 'rides', action: 'rate', ok: true, rideId: ride.id, rating, review: ride.review, driverRating };
}
