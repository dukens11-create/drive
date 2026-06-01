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
  type Ride
} from '../database/data.store';
import { markDriverAssigned, releaseDriverFromRide } from './drivers.service';
import { sendRealtimePushEvent } from './notifications.service';
import { logger } from '../utils/logger';

const BASE_FARE = 2.5;
const DISTANCE_RATE = 1.9;
const TIME_RATE = 0.25;
const CURRENCY = 'USD';

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
) {
  ride.events = [...getRideEvents(ride), { id: makeId('evt'), type, title, message, actorRole, actorId, createdAt }];
  ride.updatedAt = createdAt;
  markStoreDirty();
  return ride.events[ride.events.length - 1];
}

function buildFareDetails(miles: number, minutes: number) {
  const baseFare = BASE_FARE;
  const distanceFare = roundToTwoDecimals(miles * DISTANCE_RATE);
  const timeFare = roundToTwoDecimals(minutes * TIME_RATE);
  const subtotal = roundToTwoDecimals(baseFare + distanceFare + timeFare);
  const low = roundToTwoDecimals(Math.max(baseFare, subtotal * 0.9));
  const high = roundToTwoDecimals(subtotal * 1.15);
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
    canCancel: ride.status === 'requested' || ride.status === 'accepted' || ride.status === 'arrived_at_pickup',
    canRate: ride.status === 'completed' && typeof ride.rating !== 'number',
    canViewReceipt: ride.status === 'completed' || ride.status === 'canceled',
    canTrackDriver: ride.status === 'accepted' || ride.status === 'arrived_at_pickup' || ride.status === 'started'
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
  const surgeMultiplier = ride.surgeMultiplier || 1;
  // ride.fareEstimate already incorporates surge; compute gross from it directly
  const grossCents = ride.status === 'completed' ? Math.round(ride.fareEstimate * 100) : 0;
  const discountCents = ride.discountCents || 0;
  const totalCents = Math.max(0, grossCents - discountCents);
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
  const fare = buildFareDetails(route.distanceMiles, route.etaMinutes);
  const surgeMultiplier = getActiveSurgeMultiplier();
  const fareEstimate = roundToTwoDecimals(fare.fareEstimate * surgeMultiplier);
  const fareEstimateRange = {
    low: roundToTwoDecimals(fare.fareEstimateRange.low * surgeMultiplier),
    high: roundToTwoDecimals(fare.fareEstimateRange.high * surgeMultiplier)
  };
  return {
    module: 'rides',
    action: 'estimate',
    ok: true,
    route,
    currency: fare.currency,
    baseFare: fare.fareEstimate,
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
  return { module: 'rides', action: 'request', ok: true, ride, dispatch, discountCents, availableActions: getRideAvailableActions(ride) };
}

export async function history(body: any, _params?: any, _query?: any) {
  const actor = body?.actor;
  const riderId = actor?.role === 'rider' ? actor?.id : getRiderId(body);
  const limit = Math.max(1, Math.min(100, Number(body?.limit || 20)));
  const status = body?.status;
  const rides = Array.from(store.rides.values())
    .filter(ride => {
      if (actor?.role === 'admin') return true;
      if (actor?.role === 'driver') return ride.driverId === actor.id;
      return ride.riderId === riderId;
    })
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

export async function detail(body: any, params?: any, _query?: any) {
  const rideId = params?.rideId || body?.rideId;
  const ride = getRide(rideId);
  if (!ride) return { module: 'rides', action: 'detail', error: 'ride not found' };
  if (!canAccessRide(body?.actor, ride)) return { module: 'rides', action: 'detail', error: 'forbidden' };
  return {
    module: 'rides',
    action: 'detail',
    ok: true,
    ride: toRiderRideSummary(ride),
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

export async function accept(body: any, _params?: any, _query?: any) {
  const ride = getRide(body?.rideId);
  if (!ride) return { module: 'rides', action: 'accept', error: 'ride not found' };
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
  appendRideEvent(ride, 'driver_assigned', 'Pickup approaching', 'Driver is heading to your pickup point now.', 'driver', driverId);
  await pushRideNotification(
    ride.riderId,
    'trip_updates',
    'Driver accepted your ride',
    'Your driver is heading to your pickup location.',
    'trip_update_accepted'
  );
  return { module: 'rides', action: 'accept', ok: true, ride };
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
  appendRideEvent(ride, 'driver_arrived', 'Driver arrived', 'Your driver has arrived at the pickup point.', 'driver', driverId, now);
  return { module: 'rides', action: 'arrive', ok: true, ride, arrivedAt: now };
}

export async function start(body: any, _params?: any, _query?: any) {
  const ride = getRide(body?.rideId);
  if (!ride) return { module: 'rides', action: 'start', error: 'ride not found' };
  const driverId = getDriverId(body);
  if (!driverId || ride.driverId !== driverId) return { module: 'rides', action: 'start', error: 'only assigned driver can start ride' };
  if (ride.status !== 'accepted' && ride.status !== 'arrived_at_pickup') return { module: 'rides', action: 'start', error: 'ride not accepted' };
  ride.status = 'started';
  appendRideEvent(ride, 'passenger_onboard', 'Passenger onboard', 'Passenger has been picked up and the trip is now in progress.', 'driver', driverId);
  await pushRideNotification(
    ride.riderId,
    'trip_updates',
    'Trip started',
    'Your trip is now in progress.',
    'trip_update_started'
  );
  return { module: 'rides', action: 'start', ok: true, ride };
}

export async function complete(body: any, _params?: any, _query?: any) {
  const ride = getRide(body?.rideId);
  if (!ride) return { module: 'rides', action: 'complete', error: 'ride not found' };
  const driverId = getDriverId(body);
  if (!driverId || ride.driverId !== driverId) return { module: 'rides', action: 'complete', error: 'only assigned driver can complete ride' };
  if (ride.status !== 'started') return { module: 'rides', action: 'complete', error: 'ride not started' };

  ride.status = 'completed';
  appendRideEvent(ride, 'ride_completed', 'Ride completed', 'Your trip is complete and receipt details are ready.', 'driver', driverId);
  await pushRideNotification(
    ride.riderId,
    'trip_updates',
    'Trip completed',
    'Your ride is complete and receipt details are ready.',
    'trip_update_completed'
  );
  if (ride.driverId) releaseDriverFromRide(ride.driverId);

  const grossCents = Math.round(ride.fareEstimate * 100);
  const discountCents = ride.discountCents || 0;
  const amountCents = Math.max(0, grossCents - discountCents);
  if (ride.riderId) pushWalletTx(ride.riderId, 'debit', amountCents, `ride:${ride.id}:fare`);
  const driverPayoutCents = Math.round(amountCents * 0.8);
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

  return { module: 'rides', action: 'complete', ok: true, ride, grossCents, discountCents, amountCents, receipt: getRideReceipt(ride) };
}

export async function noShow(body: any, _params?: any, _query?: any) {
  const ride = getRide(body?.rideId);
  if (!ride) return { module: 'rides', action: 'no-show', error: 'ride not found' };
  const driverId = getDriverId(body);
  if (!driverId || ride.driverId !== driverId) return { module: 'rides', action: 'no-show', error: 'only assigned driver can report no-show' };
  if (ride.status !== 'arrived_at_pickup') return { module: 'rides', action: 'no-show', error: 'driver must be at pickup to report no-show' };
  const now = timestamp();
  ride.status = 'canceled';
  ride.canceledAt = now;
  ride.cancellationReason = 'rider_no_show';
  ride.cancellationActorRole = 'driver';
  ride.noShowReportedAt = now;
  appendRideEvent(ride, 'rider_no_show', 'Rider no-show', 'Driver waited at pickup but rider did not appear.', 'driver', driverId, now);
  if (ride.driverId) releaseDriverFromRide(ride.driverId);
  return {
    module: 'rides',
    action: 'no-show',
    ok: true,
    ride,
    cancellation: {
      canceledAt: now,
      cancellationReason: 'rider_no_show',
      cancellationActorRole: 'driver',
      cancellationFeeCents: 0
    }
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
  ride.status = 'canceled';
  ride.canceledAt = now;
  ride.cancellationReason = reason;
  ride.cancellationActorRole = 'driver';
  appendRideEvent(ride, 'ride_canceled', 'Ride canceled by driver', `Driver canceled the ride: ${reason}.`, 'driver', driverId, now);
  releaseDriverFromRide(driverId);
  return {
    module: 'rides',
    action: 'driver-cancel',
    ok: true,
    ride,
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
  ride.status = 'canceled';
  ride.canceledAt = timestamp();
  ride.cancellationReason = body?.reason || 'canceled_by_rider';
  ride.cancellationActorRole = 'rider';
  appendRideEvent(ride, 'ride_canceled', 'Ride canceled', 'Your ride was canceled before pickup.', 'rider', riderId, ride.canceledAt);
  await pushRideNotification(
    ride.riderId,
    'trip_updates',
    'Trip canceled',
    'Your ride request was canceled.',
    'trip_update_canceled'
  );
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
  const driverRating = updateDriverRating(ride.driverId);
  return { module: 'rides', action: 'rate', ok: true, rideId: ride.id, rating, review: ride.review, driverRating };
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
  return {
    module: 'rides',
    action: 'rate-passenger',
    ok: true,
    rideId: ride.id,
    rating,
    comment: ride.passengerReview
  };
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
