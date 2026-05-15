import { dispatchRide } from './dispatch.engine';
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
} from './data.store';
import { markDriverAssigned, releaseDriverFromRide } from './drivers.service';

function getRide(id: string) {
  const ride = store.rides.get(id);
  if (!ride) throw new Error('ride not found');
  return ride;
}

export async function estimate(body: any, _params?: any, _query?: any) {
  const miles = Number(body?.miles || body?.distanceMiles || 0);
  const minutes = Number(body?.minutes || body?.etaMinutes || 0);
  const route = await estimateRoute({ distanceMiles: miles || undefined, etaMinutes: minutes || undefined });
  const baseFare = Math.round((2.5 + route.distanceMiles * 1.9 + route.etaMinutes * 0.25) * 100) / 100;
  const surgeMultiplier = getActiveSurgeMultiplier();
  const fareEstimate = Math.round(baseFare * surgeMultiplier * 100) / 100;
  return { module: 'rides', action: 'estimate', ok: true, route, baseFare, surgeMultiplier, fareEstimate };
}

export async function request(body: any, _params?: any, _query?: any) {
  const riderId = body?.actor?.id || body?.riderId || body?.userId;
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
      ride.updatedAt = timestamp();
      markStoreDirty();
    }
  }
  return { module: 'rides', action: 'request', ok: true, ride, dispatch, discountCents };
}

export async function accept(body: any, _params?: any, _query?: any) {
  const ride = getRide(body?.rideId);
  if (ride.status !== 'requested' && ride.status !== 'accepted') {
    return { module: 'rides', action: 'accept', error: `ride cannot be accepted: current status is ${ride.status}` };
  }
  const driverId = body?.actor?.id || body?.driverId;
  if (!driverId) return { module: 'rides', action: 'accept', error: 'driverId is required' };
  if (ride.status === 'accepted' && ride.driverId === driverId) return { module: 'rides', action: 'accept', ok: true, ride };
  if (ride.status === 'accepted' && ride.driverId !== driverId) {
    return { module: 'rides', action: 'accept', error: 'ride is already accepted by another driver' };
  }
  const assigned = markDriverAssigned(driverId);
  if (!assigned.ok) return { module: 'rides', action: 'accept', error: assigned.error };
  ride.driverId = driverId;
  ride.status = 'accepted';
  ride.updatedAt = timestamp();
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
  if (ride.driverId) releaseDriverFromRide(ride.driverId);

  const grossCents = Math.round(ride.fareEstimate * 100);
  const discountCents = ride.discountCents || 0;
  const amountCents = Math.max(0, grossCents - discountCents);
  if (ride.riderId) pushWalletTx(ride.riderId, 'debit', amountCents, `ride:${ride.id}:fare`);
  if (ride.driverId) pushWalletTx(ride.driverId, 'credit', Math.round(amountCents * 0.8), `ride:${ride.id}:payout`);

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
      }
    }
  }

  return { module: 'rides', action: 'complete', ok: true, ride, grossCents, discountCents, amountCents };
}

export async function cancel(body: any, _params?: any, _query?: any) {
  const ride = getRide(body?.rideId);
  const riderId = body?.actor?.id || body?.riderId || body?.userId;
  if (!riderId || ride.riderId !== riderId) return { module: 'rides', action: 'cancel', error: 'only rider can cancel ride' };
  if (ride.status === 'completed') return { module: 'rides', action: 'cancel', error: 'cannot cancel completed ride' };
  if (ride.status === 'started') return { module: 'rides', action: 'cancel', error: 'cannot cancel started ride' };
  ride.status = 'canceled';
  ride.updatedAt = timestamp();
  markStoreDirty();
  if (ride.driverId) releaseDriverFromRide(ride.driverId);
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
