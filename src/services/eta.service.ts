import { env } from '../config/env';

const ROUTE_CACHE_TTL_MS = 30 * 60 * 1000;
const ROUTE_CACHE_LIMIT = 250;
const FALLBACK_DISTANCE_MILES = 3.2;

type RouteCacheEntry = {
  expiresAt: number;
  payload: {
    provider: string;
    distanceMiles: number;
    etaMinutes: number;
    polyline: string;
    steps: Array<{ distanceMeters: number; durationSeconds: number; instruction: string }>;
  };
};

const routeCache = new Map<string, RouteCacheEntry>();

function toNumber(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function buildCacheKey(pickupLat: number, pickupLng: number, dropoffLat: number, dropoffLng: number) {
  return [pickupLat, pickupLng, dropoffLat, dropoffLng].map(value => value.toFixed(5)).join(':');
}

function getCachedRoute(cacheKey: string) {
  const cached = routeCache.get(cacheKey);
  if (!cached) return null;
  if (Date.now() > cached.expiresAt) {
    routeCache.delete(cacheKey);
    return null;
  }
  routeCache.delete(cacheKey);
  routeCache.set(cacheKey, cached);
  return cached.payload;
}

function setCachedRoute(cacheKey: string, payload: RouteCacheEntry['payload']) {
  routeCache.set(cacheKey, {
    expiresAt: Date.now() + ROUTE_CACHE_TTL_MS,
    payload
  });
  while (routeCache.size > ROUTE_CACHE_LIMIT) {
    const oldestKey = routeCache.keys().next().value;
    if (!oldestKey) break;
    routeCache.delete(oldestKey);
  }
}

function buildFallbackRoute(input: any) {
  const distanceMiles = Number(input?.distanceMiles ?? FALLBACK_DISTANCE_MILES);
  const etaMinutes = Number(input?.etaMinutes ?? Math.max(8, Math.round(distanceMiles * 3.5)));
  return {
    cached: false,
    provider: 'mock_fallback',
    distanceMiles,
    etaMinutes,
    polyline: 'mfp_Ih}~pAfCwK`GeV',
    steps: []
  };
}

async function fetchMapboxRoute(pickupLat: number, pickupLng: number, dropoffLat: number, dropoffLng: number) {
  const token = env.mapboxApiKey || env.mapboxPublicToken;
  if (!token) return null;
  const coordinates = `${pickupLng},${pickupLat};${dropoffLng},${dropoffLat}`;
  const url = new URL(`https://api.mapbox.com/directions/v5/mapbox/driving/${coordinates}`);
  url.searchParams.set('alternatives', 'false');
  url.searchParams.set('geometries', 'polyline');
  url.searchParams.set('steps', 'true');
  url.searchParams.set('overview', 'full');
  url.searchParams.set('access_token', token);

  const response = await fetch(url.toString());
  if (!response.ok) {
    return null;
  }
  const body = await response.json() as any;
  const route = Array.isArray(body?.routes) ? body.routes[0] : null;
  if (!route) return null;
  const distanceMeters = Number(route.distance);
  const durationSeconds = Number(route.duration);
  if (!Number.isFinite(distanceMeters) || !Number.isFinite(durationSeconds)) return null;

  return {
    provider: 'mapbox',
    distanceMiles: Number((distanceMeters / 1609.344).toFixed(2)),
    etaMinutes: Math.max(1, Math.round(durationSeconds / 60)),
    polyline: String(route.geometry || ''),
    steps: Array.isArray(route.legs)
      ? route.legs.flatMap((leg: any) => (Array.isArray(leg?.steps) ? leg.steps : [])).map((step: any) => ({
        distanceMeters: Number(step?.distance || 0),
        durationSeconds: Number(step?.duration || 0),
        instruction: String(step?.maneuver?.instruction || '')
      }))
      : []
  };
}

export async function estimateRoute(input: any) {
  const pickupLat = toNumber(input?.pickupLat);
  const pickupLng = toNumber(input?.pickupLng);
  const dropoffLat = toNumber(input?.dropoffLat);
  const dropoffLng = toNumber(input?.dropoffLng);
  const canRoute = pickupLat != null && pickupLng != null && dropoffLat != null && dropoffLng != null;
  if (!canRoute) return buildFallbackRoute(input);

  const cacheKey = buildCacheKey(pickupLat, pickupLng, dropoffLat, dropoffLng);
  const cachedRoute = getCachedRoute(cacheKey);
  if (cachedRoute) return { ...cachedRoute, cached: true };

  try {
    const liveRoute = await fetchMapboxRoute(pickupLat, pickupLng, dropoffLat, dropoffLng);
    if (liveRoute) {
      setCachedRoute(cacheKey, liveRoute);
      return { ...liveRoute, cached: false };
    }
  } catch {
    // Fall back to mock estimate when the provider fails.
  }

  return buildFallbackRoute(input);
}
