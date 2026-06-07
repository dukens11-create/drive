/**
 * Analytics aggregator – runs hourly to snapshot platform-wide metrics
 * into the analytics store for fast dashboard retrieval.
 */
import { store } from '../database/data.store';
import { logger } from '../utils/logger';

function daysAgo(n: number) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();
}

export async function runAnalyticsAggregator(): Promise<{ ok: boolean; error?: string }> {
  try {
    const now = new Date().toISOString();
    const rides = Array.from(store.rides.values());
    const drivers = Array.from(store.drivers.values());
    const users = Array.from(store.users.values());
    const payments = Array.from(store.payments.values());

    const last24h = daysAgo(1);
    const last7d = daysAgo(7);

    const activeRides = rides.filter(r =>
      ['accepted', 'arrived_at_pickup', 'started'].includes(r.status)
    );
    const completedToday = rides.filter(r => r.status === 'completed' && r.createdAt >= last24h);
    const capturedPayments = payments.filter(p => p.status === 'captured' && p.createdAt >= last24h);
    const failedPayments = payments.filter(p => p.status === 'failed' && p.createdAt >= last24h);

    const totalRevenue = capturedPayments.reduce((s, p) => s + p.amountCents, 0);
    const ratedRides = completedToday.filter(r => typeof r.rating === 'number');
    const avgRating = ratedRides.length > 0
      ? ratedRides.reduce((s, r) => s + (r.rating as number), 0) / ratedRides.length
      : 0;

    const snapshot = {
      capturedAt: now,
      period: 'hourly',
      activeRides: activeRides.length,
      activeDrivers: drivers.filter(d => d.availabilityStatus === 'online').length,
      activeRiders: new Set(activeRides.map(r => r.riderId)).size,
      totalRevenueCents: totalRevenue,
      totalRides: completedToday.length,
      avgRating: parseFloat(avgRating.toFixed(2)),
      newUsersLast24h: users.filter(u => u.role === 'rider' && u.createdAt >= last24h).length,
      newDriversLast24h: users.filter(u => u.role === 'driver' && u.createdAt >= last24h).length,
      successfulPayments: capturedPayments.length,
      failedPayments: failedPayments.length,
      pendingFraudAlerts: store.fraudAlerts.filter(a => !a.reviewed && a.riskLevel !== 'low').length,
      openSupportTickets: Array.from(store.tickets.values()).filter(t => t.status === 'open').length,
      ridesLast7d: rides.filter(r => r.status === 'completed' && r.createdAt >= last7d).length
    };

    logger.info('analytics aggregator run complete', snapshot);
    return { ok: true };
  } catch (err: any) {
    logger.error('analytics aggregator failed', { error: err?.message });
    return { ok: false, error: err?.message };
  }
}
