import { store, timestamp, getActiveSurgeMultiplier } from '../database/data.store';

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function round(value: number) {
  return Number(value.toFixed(2));
}

function getOnlineDriverCount() {
  return Array.from(store.drivers.values()).filter(driver => driver.available && driver.availabilityStatus === 'online').length;
}

function getRecentRequestedRideCount(hours: number) {
  const cutoff = Date.now() - hours * 60 * 60 * 1000;
  return Array.from(store.rides.values()).filter(ride => new Date(ride.createdAt).getTime() >= cutoff).length;
}

export async function getCurrentSurge() {
  const multiplier = getActiveSurgeMultiplier();
  const config = store.surgeConfig.get('global');
  return { module: 'ml', ok: true, multiplier, reason: config?.reason, updatedAt: config?.updatedAt };
}

export async function predictSurge(body: any) {
  const demand = Number(body?.demand ?? getRecentRequestedRideCount(1));
  const availableDrivers = Math.max(Number(body?.availableDrivers ?? (getOnlineDriverCount() || 1)), 1);
  const weatherSeverity = clamp(Number(body?.weatherSeverity ?? 0), 0, 1);
  const specialEventBoost = body?.specialEvent ? 0.25 : 0;
  const pressure = demand / availableDrivers;
  const multiplier = clamp(round(1 + Math.max(0, pressure - 1) * 0.35 + weatherSeverity * 0.2 + specialEventBoost), 1, 4);
  const confidence = clamp(round(0.55 + Math.min(pressure, 3) * 0.1 + weatherSeverity * 0.05), 0.55, 0.95);

  return {
    module: 'ml',
    ok: true,
    area: body?.area || 'global',
    multiplier,
    confidence,
    inputs: { demand, availableDrivers, weatherSeverity, specialEvent: !!body?.specialEvent }
  };
}

export async function applySurge(body: any) {
  const multiplier = Number(body?.multiplier);
  if (!Number.isFinite(multiplier) || multiplier < 1 || multiplier > 10) {
    return { module: 'ml', action: 'apply-surge', error: 'multiplier must be between 1 and 10' };
  }
  const config = { multiplier, reason: body?.reason, updatedAt: timestamp() };
  store.surgeConfig.set('global', config);
  return { module: 'ml', action: 'apply-surge', ok: true, surgeConfig: config };
}

export async function predictDemand(body: any) {
  const horizonHours = Math.max(Number(body?.horizonHours || 1), 1);
  const lastDayDemand = getRecentRequestedRideCount(24);
  const hour = new Date().getUTCHours();
  const timeOfDayBoost = hour >= 7 && hour <= 9 || hour >= 17 && hour <= 20 ? 1.25 : 1;
  const prediction = Math.max(1, Math.round((lastDayDemand / 24) * horizonHours * timeOfDayBoost));
  const variance = Math.max(1, Math.round(prediction * 0.2));

  return {
    module: 'ml',
    ok: true,
    area: body?.area || 'global',
    horizonHours,
    predictedDemand: prediction,
    confidenceInterval: { low: Math.max(0, prediction - variance), high: prediction + variance },
    updatedAt: timestamp()
  };
}

export async function getRecommendations(body: any) {
  const routes = new Map<string, { pickupLat?: number; pickupLng?: number; dropoffLat?: number; dropoffLng?: number; count: number }>();
  for (const ride of store.rides.values()) {
    const key = `${ride.pickupLat ?? 'na'}:${ride.pickupLng ?? 'na'}->${ride.dropoffLat ?? 'na'}:${ride.dropoffLng ?? 'na'}`;
    const current = routes.get(key) || {
      pickupLat: ride.pickupLat,
      pickupLng: ride.pickupLng,
      dropoffLat: ride.dropoffLat,
      dropoffLng: ride.dropoffLng,
      count: 0
    };
    current.count += 1;
    routes.set(key, current);
  }

  const rideRecommendations = Array.from(routes.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 3)
    .map(([routeKey, route], index) => ({ id: `route_${index + 1}`, routeKey, score: route.count, ...route }));

  const restaurantRecommendations = Array.from(store.merchantProducts.values())
    .slice(0, 3)
    .map((product, index) => ({ id: `merchant_${index + 1}`, productId: product.id, merchantId: product.merchantId, name: product.name, score: 1 }));

  return {
    module: 'ml',
    ok: true,
    userId: body?.actor?.id,
    rideRecommendations,
    restaurantRecommendations
  };
}

export async function predictChurn(body: any) {
  const requestedUserId = body?.userId || body?.actor?.id;
  if (!requestedUserId) return { module: 'ml', action: 'predict-churn', error: 'userId required' };
  if (body?.actor?.role !== 'admin' && requestedUserId !== body?.actor?.id) {
    return { module: 'ml', action: 'predict-churn', error: 'forbidden' };
  }

  const rides = Array.from(store.rides.values())
    .filter(ride => ride.riderId === requestedUserId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const lastRide = rides[0];
  const inactivityDays = lastRide ? Math.floor((Date.now() - new Date(lastRide.createdAt).getTime()) / (24 * 60 * 60 * 1000)) : 999;
  const churnProbability = clamp(round(Math.min(0.95, 0.15 + inactivityDays / 60)), 0.15, 0.95);

  return {
    module: 'ml',
    ok: true,
    userId: requestedUserId,
    churnProbability,
    riskLevel: churnProbability >= 0.7 ? 'high' : churnProbability >= 0.4 ? 'medium' : 'low',
    lastRideAt: lastRide?.createdAt || null
  };
}
