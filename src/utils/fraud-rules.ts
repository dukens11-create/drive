/**
 * Fraud rule evaluators – each rule accepts the userId (and optional context)
 * and returns true when the signal is detected.
 *
 * These are intentionally kept as pure functions so they can be unit-tested
 * independently of the service layer.
 */
import { store } from '../database/data.store';

// ─── Rule: High-frequency ride requests ───────────────────────────────────────
// More than 10 ride requests within the last hour
export function detectHighFrequencyRequests(userId: string): boolean {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  return (
    Array.from(store.rides.values()).filter(
      r => r.riderId === userId && r.createdAt >= oneHourAgo
    ).length > 10
  );
}

// ─── Rule: Excessive cancellations ────────────────────────────────────────────
// More than 5 cancellations in the last 24 hours
export function detectExcessiveCancellations(userId: string): boolean {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  return (
    Array.from(store.rides.values()).filter(
      r => r.riderId === userId && r.status === 'canceled' && r.createdAt >= oneDayAgo
    ).length > 5
  );
}

// ─── Rule: Payment failure streak ─────────────────────────────────────────────
// 3 or more of the 5 most recent payments failed
export function detectPaymentFailures(userId: string): boolean {
  const userPayments = Array.from(store.payments.values())
    .filter(p => p.riderId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5);
  return userPayments.filter(p => p.status === 'failed').length >= 3;
}

// ─── Rule: Multiple failed payments in last 24h ────────────────────────────────
// 3 or more distinct failed payments in the last 24 hours
export function detectRecentFailedPayments(userId: string): boolean {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  return (
    Array.from(store.payments.values()).filter(
      p => p.riderId === userId && p.status === 'failed' && p.createdAt >= oneDayAgo
    ).length >= 3
  );
}

// ─── Rule: New account placing a high-value ride ──────────────────────────────
// Account less than 24 hours old requesting a ride worth > $100
export function detectNewAccountHighValue(userId: string, fareAmountCents: number): boolean {
  const user = store.users.get(userId);
  if (!user) return false;
  const accountAgeMs = Date.now() - new Date(user.createdAt).getTime();
  return accountAgeMs < 24 * 60 * 60 * 1000 && fareAmountCents > 10_000;
}

// ─── Rule: Promo abuse ────────────────────────────────────────────────────────
// More than 3 promo-discounted rides in the last 24 hours
export function detectPromoAbuse(userId: string): boolean {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  return (
    Array.from(store.rides.values()).filter(
      r => r.riderId === userId && r.promoId && r.createdAt >= oneDayAgo
    ).length > 3
  );
}

// ─── Rule: Rapid bookings ─────────────────────────────────────────────────────
// 3 or more rides created within the last 10 minutes
export function detectRapidBookings(userId: string): boolean {
  const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  return (
    Array.from(store.rides.values()).filter(
      r => r.riderId === userId && r.createdAt >= tenMinAgo
    ).length >= 3
  );
}

// ─── Rule: Chargeback history ─────────────────────────────────────────────────
// The user has at least one chargeback on record
export function detectChargebackHistory(userId: string): boolean {
  return store.chargebacks.some(c => c.userId === userId);
}

// ─── Rule: Multiple chargebacks ───────────────────────────────────────────────
// The user has 2 or more chargebacks on record
export function detectMultipleChargebacks(userId: string): boolean {
  let count = 0;
  for (const c of store.chargebacks) {
    if (c.userId === userId && ++count >= 2) return true;
  }
  return false;
}

// ─── Rule: Impossible travel ──────────────────────────────────────────────────
// The user's two most recent completed rides imply travel of >100 miles in <30 min
export function detectImpossibleTravel(userId: string): boolean {
  const completed = Array.from(store.rides.values())
    .filter(r => r.riderId === userId && r.status === 'completed' && r.completedAt)
    .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''))
    .slice(0, 2);

  if (completed.length < 2) return false;

  const [r1, r2] = completed;
  const timeDiffMin =
    (new Date(r1.completedAt!).getTime() - new Date(r2.completedAt!).getTime()) /
    (1000 * 60);

  const latDiff = (r1.dropoffLat ?? 0) - (r2.pickupLat ?? 0);
  const lngDiff = (r1.dropoffLng ?? 0) - (r2.pickupLng ?? 0);
  // Approximate miles per degree of lat/lng (assumes spherical earth; accurate within ~5% at mid-latitudes)
  const MILES_PER_DEGREE = 69;
  const distanceMiles = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * MILES_PER_DEGREE;

  return distanceMiles > 100 && timeDiffMin < 30;
}

// ─── Rule: Very low rider rating ──────────────────────────────────────────────
export function detectVeryLowRating(userId: string): boolean {
  const rider = store.riders.get(userId);
  return !!rider && rider.rating > 0 && rider.rating < 2.0;
}

// ─── Rule: Low rider rating ───────────────────────────────────────────────────
export function detectLowRating(userId: string): boolean {
  const rider = store.riders.get(userId);
  return !!rider && rider.rating >= 2.0 && rider.rating < 3.0;
}

// ─── Rule: Frequent refund requests ──────────────────────────────────────────
// 3 or more refunds requested in the last 7 days
export function detectFrequentRefunds(userId: string): boolean {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  return (
    Array.from(store.refunds.values()).filter(
      r => (r.userId === userId) && r.createdAt >= sevenDaysAgo
    ).length >= 3
  );
}

// ─── Rule: Multiple open support tickets ──────────────────────────────────────
// 3 or more open support tickets
export function detectMultipleSupportTickets(userId: string): boolean {
  return (
    Array.from(store.tickets.values()).filter(
      t => t.userId === userId && t.status !== 'closed'
    ).length >= 3
  );
}

// ─── Rule: Multiple distinct payment methods ─────────────────────────────────
// More than 5 different payment methods used across the last 10 rides
export function detectMultiplePaymentMethods(userId: string): boolean {
  const recentRideIds = new Set(
    Array.from(store.rides.values())
      .filter(r => r.riderId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 10)
      .map(r => r.id)
  );

  const methodIds = new Set(
    Array.from(store.payments.values())
      .filter(p => p.riderId === userId && recentRideIds.has(p.rideId ?? ''))
      .map(p => p.paymentMethodId)
      .filter(Boolean)
  );

  return methodIds.size > 5;
}
