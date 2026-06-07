/**
 * Analytics service – provides aggregated metrics for the platform.
 * All calculations run in-memory against the store. For production,
 * these queries would be backed by a data warehouse or read replica.
 */
import { store, getActiveSurgeMultiplier, getLoyaltyTier } from '../database/data.store';

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

// ─── Revenue trends ───────────────────────────────────────────────────────────

export async function getRevenueTrends(query: any) {
  const days = Math.min(parseInt(query?.days) || 30, 365);
  const sinceDate = daysAgo(days);

  const rides = Array.from(store.rides.values())
    .filter(r => r.createdAt >= sinceDate && r.status === 'completed');

  const dailyRevenue: Record<string, { revenue: number; rides: number }> = {};
  for (const ride of rides) {
    const date = daysBucket((ride as any).completedAt || ride.createdAt);
    if (!dailyRevenue[date]) dailyRevenue[date] = { revenue: 0, rides: 0 };
    dailyRevenue[date].revenue += (ride.fareDetails?.total || 0);
    dailyRevenue[date].rides += 1;
  }

  const trends = Object.entries(dailyRevenue)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, data]) => ({
      date,
      revenue: Math.round(data.revenue),
      rides: data.rides
    }));

  return { module: 'analytics', action: 'revenue-trends', ok: true, trends };
}

// ─── Vehicle breakdown ────────────────────────────────────────────────────────

export async function getVehicleBreakdown(query: any) {
  const days = Math.min(parseInt(query?.days) || 30, 365);
  const sinceDate = daysAgo(days);

  const vehicleTypes = ['economy', 'comfort', 'premium', 'xl'];
  const breakdown: Record<string, { rides: number; revenue: number }> = {};
  for (const t of vehicleTypes) breakdown[t] = { rides: 0, revenue: 0 };

  const rides = Array.from(store.rides.values())
    .filter(r => r.createdAt >= sinceDate && r.status === 'completed');

  for (const ride of rides) {
    const type = (ride.vehicleType as string) || 'economy';
    if (!breakdown[type]) breakdown[type] = { rides: 0, revenue: 0 };
    breakdown[type].rides += 1;
    breakdown[type].revenue += ride.fareDetails?.total || 0;
  }

  return {
    module: 'analytics',
    action: 'vehicle-breakdown',
    ok: true,
    breakdown: Object.entries(breakdown).map(([type, data]) => ({
      type,
      rides: data.rides,
      revenue: Math.round(data.revenue),
      avgFare: data.rides > 0 ? Math.round(data.revenue / data.rides) : 0
    }))
  };
}

// ─── Driver leaderboard ───────────────────────────────────────────────────────

export async function getDriverLeaderboard(query: any) {
  const days = Math.min(parseInt(query?.days) || 30, 365);
  const sortBy = query?.sort || 'earnings';
  const limit = Math.min(parseInt(query?.limit) || 20, 100);
  const sinceDate = daysAgo(days);

  const driverStats: Record<string, { driverId: string; driverName: string; rides: number; earnings: number; ratings: number[]; acceptanceRate: number; cancellationRate: number }> = {};

  const rides = Array.from(store.rides.values())
    .filter(r => r.createdAt >= sinceDate && r.status === 'completed');

  for (const ride of rides) {
    if (!ride.driverId) continue;

    if (!driverStats[ride.driverId]) {
      const driver = store.drivers.get(ride.driverId);
      const user = store.users.get(ride.driverId);
      driverStats[ride.driverId] = {
        driverId: ride.driverId,
        driverName: user?.email?.split('@')[0] || 'unknown',
        rides: 0,
        earnings: 0,
        ratings: [],
        acceptanceRate: driver?.acceptanceRate || 0,
        cancellationRate: driver?.cancellationRate || 0
      };
    }

    driverStats[ride.driverId].rides += 1;
    driverStats[ride.driverId].earnings += ride.fareDetails?.driverEarnings || 0;
    if (typeof ride.rating === 'number') {
      driverStats[ride.driverId].ratings.push(ride.rating);
    }
  }

  const leaderboard = Object.values(driverStats)
    .map(stats => ({
      ...stats,
      avgRating: stats.ratings.length > 0
        ? parseFloat((stats.ratings.reduce((a, b) => a + b, 0) / stats.ratings.length).toFixed(2))
        : 0,
      ratings: undefined
    }))
    .sort((a, b) => {
      if (sortBy === 'earnings') return b.earnings - a.earnings;
      if (sortBy === 'rating') return b.avgRating - a.avgRating;
      if (sortBy === 'rides') return b.rides - a.rides;
      return 0;
    })
    .slice(0, limit);

  return { module: 'analytics', action: 'driver-leaderboard', ok: true, leaderboard };
}

// ─── Churn risk ───────────────────────────────────────────────────────────────

export async function getChurnRisk(query: any) {
  const riskThreshold = Math.max(0, Math.min(100, parseInt(query?.threshold) || 70));
  const limit = Math.min(parseInt(query?.limit) || 50, 200);
  const today = new Date();

  const churnRiskUsers: Array<{
    userId: string;
    email?: string;
    churnScore: number;
    riskLevel: string;
    lastRideDate: string;
    daysSinceLastRide: number;
    totalRides: number;
    reason: string;
  }> = [];

  for (const user of store.users.values()) {
    if (user.role !== 'rider') continue;

    const userRides = Array.from(store.rides.values())
      .filter(r => r.riderId === user.id && r.status === 'completed')
      .sort((a, b) => ((b as any).completedAt || b.createdAt).localeCompare((a as any).completedAt || a.createdAt));

    if (userRides.length === 0) continue;

    const lastRide = userRides[0];
    const lastRideTs = (lastRide as any).completedAt || lastRide.createdAt;
    const daysSinceLastRide = Math.floor(
      (today.getTime() - new Date(lastRideTs).getTime()) / (1000 * 60 * 60 * 24)
    );

    let churnScore = 0;
    let reason = '';

    if (daysSinceLastRide > 30) {
      churnScore += 40;
      reason = `No rides in ${daysSinceLastRide} days`;
    } else if (daysSinceLastRide > 14) {
      churnScore += 20;
      reason = `Inactive for ${daysSinceLastRide} days`;
    }

    const recentRides = userRides.slice(0, 5);
    const oldRides = userRides.slice(5, 10);
    if (recentRides.length > 2 && oldRides.length > 2) {
      const recentAvg = recentRides.reduce((s, r) => s + ((r as any).passengerRating || 0), 0) / recentRides.length;
      const oldAvg = oldRides.reduce((s, r) => s + ((r as any).passengerRating || 0), 0) / oldRides.length;
      if (oldAvg - recentAvg > 0.5) {
        churnScore += 30;
        reason = `Rating dropped from ${oldAvg.toFixed(1)} to ${recentAvg.toFixed(1)}`;
      }
    }

    if (userRides.length < 5) {
      churnScore += 20;
      if (!reason) reason = `Low engagement: only ${userRides.length} rides`;
    }

    if (churnScore >= riskThreshold) {
      churnRiskUsers.push({
        userId: user.id,
        email: user.email,
        churnScore,
        riskLevel: churnScore >= 80 ? 'critical' : churnScore >= 60 ? 'high' : 'medium',
        lastRideDate: lastRideTs,
        daysSinceLastRide,
        totalRides: userRides.length,
        reason
      });
    }
  }

  const sorted = churnRiskUsers
    .sort((a, b) => b.churnScore - a.churnScore)
    .slice(0, limit);

  return {
    module: 'analytics',
    action: 'churn-risk',
    ok: true,
    users: sorted,
    total: churnRiskUsers.length
  };
}

// ─── Geographic breakdown ─────────────────────────────────────────────────────

export async function getGeographic(query: any) {
  const days = Math.min(parseInt(query?.days) || 30, 365);
  const sinceDate = daysAgo(days);

  const geoData: Record<string, { rides: number; revenue: number }> = {};

  const rides = Array.from(store.rides.values())
    .filter(r => r.createdAt >= sinceDate && r.status === 'completed');

  for (const ride of rides) {
    const city = 'New York'; // placeholder – production would reverse-geocode lat/lng
    if (!geoData[city]) geoData[city] = { rides: 0, revenue: 0 };
    geoData[city].rides += 1;
    geoData[city].revenue += ride.fareDetails?.total || 0;
  }

  const geographic = Object.entries(geoData)
    .map(([city, data]) => ({
      city,
      rides: data.rides,
      revenue: Math.round(data.revenue),
      avgFare: data.rides > 0 ? Math.round(data.revenue / data.rides) : 0
    }))
    .sort((a, b) => b.revenue - a.revenue);

  return { module: 'analytics', action: 'geographic', ok: true, geographic };
}

// ─── Demand forecast ──────────────────────────────────────────────────────────

export async function getDemandForecast(_query: any) {
  const forecast = [];
  const now = new Date();

  const hourMultipliers: Record<number, number> = {
    0: 0.3, 1: 0.2, 2: 0.15, 3: 0.1, 4: 0.1, 5: 0.2,
    6: 0.3, 7: 0.8, 8: 1.2, 9: 1.0, 10: 0.9, 11: 0.9,
    12: 0.9, 13: 0.8, 14: 0.7, 15: 0.8, 16: 1.0, 17: 1.3,
    18: 1.2, 19: 1.0, 20: 0.9, 21: 0.8, 22: 0.6, 23: 0.4
  };

  for (let h = 0; h < 24; h++) {
    const forecastTime = new Date(now.getTime() + h * 60 * 60 * 1000);
    const hour = forecastTime.getUTCHours();
    const multiplier = hourMultipliers[hour] ?? 0.7;
    const predictedRides = Math.round(50 * multiplier);

    const hh = String(forecastTime.getUTCHours()).padStart(2, '0');
    const mm = String(forecastTime.getUTCMinutes()).padStart(2, '0');
    forecast.push({
      time: `${hh}:${mm}`,
      hour,
      predictedRides,
      confidence: 0.85,
      surge: predictedRides > 80 ? 1.5 : predictedRides > 60 ? 1.2 : 1.0
    });
  }

  return { module: 'analytics', action: 'demand-forecast', ok: true, forecast };
}
