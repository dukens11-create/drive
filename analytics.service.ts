/**
 * Analytics service – provides aggregated metrics for the platform.
 * All calculations run in-memory against the store. For production,
 * these queries would be backed by a data warehouse or read replica.
 */
import { store, getActiveSurgeMultiplier, getLoyaltyTier } from './data.store';

function getUserId(body: any) {
  return body?.actor?.id || body?.userId;
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

function daysAgo(n: number) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();
}

function daysBucket(isoDate: string) {
  return isoDate.slice(0, 10);
}

// ─── Platform overview ────────────────────────────────────────────────────────

export async function getPlatformOverview() {
  const rides = Array.from(store.rides.values());
  const users = Array.from(store.users.values());
  const drivers = Array.from(store.drivers.values());
  const payments = Array.from(store.payments.values());

  const capturedPayments = payments.filter(p => p.status === 'captured');
  const totalRevenueCents = capturedPayments.reduce((sum, p) => sum + p.amountCents, 0);

  const last24h = daysAgo(1);
  const last7d = daysAgo(7);
  const last30d = daysAgo(30);

  return {
    module: 'analytics',
    ok: true,
    overview: {
      totalUsers: users.length,
      totalDrivers: drivers.length,
      activeDrivers: drivers.filter(d => d.availabilityStatus === 'online').length,
      totalRides: rides.length,
      completedRides: rides.filter(r => r.status === 'completed').length,
      canceledRides: rides.filter(r => r.status === 'canceled').length,
      totalRevenueCents,
      totalRevenueUsd: (totalRevenueCents / 100).toFixed(2),
      surgeMultiplier: getActiveSurgeMultiplier(),
      ridesLast24h: rides.filter(r => r.createdAt >= last24h).length,
      ridesLast7d: rides.filter(r => r.createdAt >= last7d).length,
      ridesLast30d: rides.filter(r => r.createdAt >= last30d).length,
      newUsersLast7d: users.filter(u => u.createdAt >= last7d).length,
      newUsersLast30d: users.filter(u => u.createdAt >= last30d).length
    }
  };
}

// ─── Revenue analytics ────────────────────────────────────────────────────────

export async function getRevenueAnalytics(body: any) {
  const days = Math.min(Number(body?.days || 30), 365);
  const sinceDate = daysAgo(days);

  const payments = Array.from(store.payments.values())
    .filter(p => p.status === 'captured' && p.createdAt >= sinceDate);

  // Group by day
  const byDay: Record<string, number> = {};
  for (const p of payments) {
    const day = daysBucket(p.createdAt);
    byDay[day] = (byDay[day] || 0) + p.amountCents;
  }

  const series = Object.entries(byDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, amountCents]) => ({ date, amountCents, amountUsd: (amountCents / 100).toFixed(2) }));

  const totalCents = payments.reduce((sum, p) => sum + p.amountCents, 0);
  const avgCents = payments.length > 0 ? Math.round(totalCents / payments.length) : 0;

  return {
    module: 'analytics',
    ok: true,
    revenue: {
      days,
      totalCents,
      totalUsd: (totalCents / 100).toFixed(2),
      avgPerRideCents: avgCents,
      avgPerRideUsd: (avgCents / 100).toFixed(2),
      transactionCount: payments.length,
      series
    }
  };
}

// ─── Ride analytics ───────────────────────────────────────────────────────────

export async function getRideAnalytics(body: any) {
  const days = Math.min(Number(body?.days || 30), 365);
  const sinceDate = daysAgo(days);

  const rides = Array.from(store.rides.values()).filter(r => r.createdAt >= sinceDate);

  const byStatus: Record<string, number> = {};
  const byDay: Record<string, number> = {};
  let totalMiles = 0;
  let totalMinutes = 0;
  let totalRating = 0;
  let ratingCount = 0;

  for (const ride of rides) {
    byStatus[ride.status] = (byStatus[ride.status] || 0) + 1;
    const day = daysBucket(ride.createdAt);
    byDay[day] = (byDay[day] || 0) + 1;
    totalMiles += ride.miles || 0;
    totalMinutes += ride.minutes || 0;
    if (typeof ride.rating === 'number') {
      totalRating += ride.rating;
      ratingCount++;
    }
  }

  const series = Object.entries(byDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));

  const completionRate = rides.length > 0
    ? ((byStatus['completed'] || 0) / rides.length * 100).toFixed(1)
    : '0.0';

  return {
    module: 'analytics',
    ok: true,
    rides: {
      days,
      total: rides.length,
      byStatus,
      completionRate: parseFloat(completionRate),
      avgMilesPerRide: rides.length > 0 ? (totalMiles / rides.length).toFixed(2) : '0.00',
      avgMinutesPerRide: rides.length > 0 ? (totalMinutes / rides.length).toFixed(2) : '0.00',
      avgRating: ratingCount > 0 ? (totalRating / ratingCount).toFixed(2) : null,
      series
    }
  };
}

// ─── Driver analytics ─────────────────────────────────────────────────────────

export async function getDriverAnalytics() {
  const drivers = Array.from(store.drivers.values());

  const byStatus: Record<string, number> = {};
  for (const d of drivers) {
    byStatus[d.availabilityStatus] = (byStatus[d.availabilityStatus] || 0) + 1;
  }

  const avgRating = drivers.length > 0
    ? (drivers.reduce((sum, d) => sum + d.rating, 0) / drivers.length).toFixed(2)
    : '0.00';

  const topDrivers = drivers
    .filter(d => d.rating > 0)
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 10)
    .map(d => ({ userId: d.userId, rating: d.rating, earningsCents: d.earningsCents }));

  return {
    module: 'analytics',
    ok: true,
    drivers: {
      total: drivers.length,
      byStatus,
      avgRating: parseFloat(avgRating),
      topDrivers
    }
  };
}

// ─── User/Passenger analytics ─────────────────────────────────────────────────

export async function getUserAnalytics(body: any) {
  const days = Math.min(Number(body?.days || 30), 365);
  const sinceDate = daysAgo(days);

  const users = Array.from(store.users.values());
  const rides = Array.from(store.rides.values());

  const byRole: Record<string, number> = {};
  for (const u of users) {
    byRole[u.role] = (byRole[u.role] || 0) + 1;
  }

  const newUsers = users.filter(u => u.createdAt >= sinceDate);
  const byDay: Record<string, number> = {};
  for (const u of newUsers) {
    const day = daysBucket(u.createdAt);
    byDay[day] = (byDay[day] || 0) + 1;
  }

  const activeRiderIds = new Set(
    rides.filter(r => r.createdAt >= sinceDate).map(r => r.riderId)
  );

  const series = Object.entries(byDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));

  return {
    module: 'analytics',
    ok: true,
    users: {
      days,
      total: users.length,
      byRole,
      newInPeriod: newUsers.length,
      activeRidersInPeriod: activeRiderIds.size,
      series
    }
  };
}

// ─── Real-time KPI ────────────────────────────────────────────────────────────

export async function getKpis() {
  const rides = Array.from(store.rides.values());
  const drivers = Array.from(store.drivers.values());
  const last1h = daysAgo(1 / 24);

  const activeRides = rides.filter(r => r.status === 'accepted' || r.status === 'started');
  const ridesLastHour = rides.filter(r => r.createdAt >= last1h);
  const capturedPayments = Array.from(store.payments.values()).filter(p => p.status === 'captured');

  return {
    module: 'analytics',
    ok: true,
    kpis: {
      timestamp: new Date().toISOString(),
      activeRides: activeRides.length,
      onlineDrivers: drivers.filter(d => d.availabilityStatus === 'online').length,
      ridesLastHour: ridesLastHour.length,
      totalRevenueCents: capturedPayments.reduce((sum, p) => sum + p.amountCents, 0),
      surgeMultiplier: getActiveSurgeMultiplier(),
      openSupportTickets: Array.from(store.tickets.values()).filter(t => t.status === 'open').length,
      openSafetyIncidents: store.safetyIncidents.filter(i => i.status === 'open').length,
      activeSubscriptions: Array.from(store.userSubscriptions.values()).filter(s => s.status === 'active').length,
      pendingFraudAlerts: store.fraudAlerts.filter(a => !a.reviewed && (a.riskLevel === 'high' || a.riskLevel === 'critical')).length
    }
  };
}

// ─── Churn analysis ───────────────────────────────────────────────────────────

export async function getChurnAnalysis(body: any) {
  const windowDays = Math.min(Number(body?.windowDays || 30), 365);
  const churned: string[] = [];
  const retained: string[] = [];

  const cutoff = daysAgo(windowDays);
  const riders = Array.from(store.users.values()).filter(u => u.role === 'rider' && u.createdAt < cutoff);

  for (const rider of riders) {
    const recentRide = Array.from(store.rides.values()).find(
      r => r.riderId === rider.id && r.createdAt >= cutoff
    );
    if (recentRide) retained.push(rider.id);
    else churned.push(rider.id);
  }

  const churnRate = riders.length > 0 ? ((churned.length / riders.length) * 100).toFixed(1) : '0.0';

  return {
    module: 'analytics',
    ok: true,
    churn: {
      windowDays,
      totalRiders: riders.length,
      retained: retained.length,
      churned: churned.length,
      churnRate: parseFloat(churnRate),
      retentionRate: parseFloat((100 - parseFloat(churnRate)).toFixed(1))
    }
  };
}

// ─── Loyalty analytics ────────────────────────────────────────────────────────

export async function getLoyaltyAnalytics() {
  const accounts = Array.from(store.loyaltyAccounts.values());

  const byTier: Record<string, number> = { bronze: 0, silver: 0, gold: 0, platinum: 0 };
  let totalPoints = 0;

  for (const a of accounts) {
    byTier[a.tier] = (byTier[a.tier] || 0) + 1;
    totalPoints += a.points;
  }

  return {
    module: 'analytics',
    ok: true,
    loyalty: {
      totalAccounts: accounts.length,
      byTier,
      totalPointsOutstanding: totalPoints,
      totalPointsValue: (totalPoints / 100).toFixed(2)
    }
  };
}
