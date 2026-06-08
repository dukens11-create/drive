const API_BASE_URL = '';
const MAPBOX_TOKEN_STORAGE_KEY = 'drive.mapboxToken';
const SHARED_RIDE_STORAGE_KEY = 'drive.sharedRideRequests.v1';
const SHARED_RIDE_STORAGE_VERSION = 1;
const AUTH_STORAGE_KEYS = {
  access: ['accessToken', 'drive.accessToken'],
  refresh: ['refreshToken', 'drive.refreshToken'],
  user: ['user', 'drive.user']
};
const RIDE_POLL_INTERVAL_MS = 2500;
const MIN_LOCATION_PUSH_INTERVAL_MS = 8000;
const DEFAULT_PICKUP = { lat: 37.77490, lng: -122.41940 };
const DEFAULT_DROPOFF_OFFSET_DEGREES = 0.01;
<<<<<<< HEAD
const POPUP_DISPLAY_DURATION_MS = 2600;
const MAP_BOUNDS_PADDING_PX = 80;
const MAP_MAX_ZOOM_LEVEL = 15;
const MAP_BOUNDS_ANIMATION_MS = 700;
const CURRENT_LOCATION_TIMEOUT_MS = 12000;
const WATCH_LOCATION_TIMEOUT_MS = 10000;
const DEFAULT_SERVICE_FEE_PERCENT = 0.12;
const MIN_TRIP_MINUTES = 6;
const MINUTES_PER_KM = 3.4;
const FARE_ESTIMATE_LOW_MULTIPLIER = 0.9;
const FARE_ESTIMATE_HIGH_MULTIPLIER = 1.15;
const MORNING_END_HOUR = 12;
const AFTERNOON_END_HOUR = 18;
const ACTIVE_RIDE_STATUSES = ['requested', 'accepted', 'arrived_at_pickup', 'started'];
const ROUTE_DASH_FRAMES = [
  [0, 4, 3],
  [0.6, 4, 2.4],
  [1.2, 4, 1.8],
  [1.8, 4, 1.2],
  [2.4, 4, 0.6],
  [3, 4, 0]
];
const VEHICLE_PRICING = {
  ECONOMY: { baseMultiplier: 1, minFare: 2.5, distanceRate: 1.9, timeRate: 0.25 },
  COMFORT: { baseMultiplier: 1.15, minFare: 3, distanceRate: 2.19, timeRate: 0.29 },
  PREMIUM: { baseMultiplier: 1.5, minFare: 5, distanceRate: 2.85, timeRate: 0.38 }
};
=======
const RIDE_TYPE_MULTIPLIER = { ECONOMY: 1, COMFORT: 1.25, PREMIUM: 1.6 };
const ACTIVE_RIDE_STATUSES = ['requested', 'accepted', 'arrived_at_pickup', 'started'];
const MIN_TRIP_MINUTES = 6;
const MINUTES_PER_KM = 3.4;
const BASE_FARE_USD = 2.5;
const RATE_PER_MILE_USD = 1.9;
const RATE_PER_MINUTE_USD = 0.25;
const TIME_FARE_MULTIPLIER_ADJUSTMENT = 0.9;
const DEFAULT_TAX_RATE = 0.085;
const FARE_RANGE_LOW_MULTIPLIER = 0.92;
const FARE_RANGE_HIGH_MULTIPLIER = 1.12;
const DEFAULT_DESTINATION_LAT_OFFSET = 0.012;
const DEFAULT_DESTINATION_LNG_OFFSET = 0.008;
const POPUP_DISPLAY_DURATION_MS = 2600;
const MAP_BOUNDS_PADDING_PX = 80;
const MAP_MAX_ZOOM_LEVEL = 15;
const MAP_BOUNDS_ANIMATION_MS = 650;
const CURRENT_LOCATION_TIMEOUT_MS = 12000;
const WATCH_LOCATION_TIMEOUT_MS = 10000;
const ROUTE_SOURCE_ID = 'rider-live-route';
const ROUTE_LAYER_CASING_ID = 'rider-live-route-casing';
const ROUTE_LAYER_ID = 'rider-live-route-line';
const MAPBOX_DIRECTIONS_PROFILE_URL = 'https://api.mapbox.com/directions/v5/mapbox/driving/';
>>>>>>> origin/main

let currentUser = null;
let accessToken = '';
let refreshToken = '';
let selectedRideType = 'ECONOMY';
let rides = [];
let currentRide = null;
let riderLocationWatchId = null;
let lastLocationPushAt = 0;
<<<<<<< HEAD
let latestEstimate = null;
let fareRequestSequence = 0;
let clockIntervalId = null;
=======
let toastTimer = null;
>>>>>>> origin/main

const mapState = {
  map: null,
  token: '',
<<<<<<< HEAD
  mapLoaded: false,
  markers: { pickup: null, destination: null, driver: null, rider: null },
  routeSourceId: 'rider-route',
  routeLineLayerId: 'rider-route-line',
  routeOutlineLayerId: 'rider-route-line-outline',
  routeAnimationTimer: null,
  routeGeojson: { type: 'FeatureCollection', features: [] },
  lastRouteKey: '',
  lastFetchedRouteKey: '',
  routeInstructions: [],
  routeSourceLabel: 'Estimated route',
  lastDriverPosition: null,
  driverHeading: 0,
  lastRideStatus: 'idle',
  hasFittedScene: false
=======
  markers: { pickup: null, destination: null, driver: null, rider: null },
  routeKey: '',
  routeRequestId: 0
>>>>>>> origin/main
};

function parseJson(value, fallback) {
  try {
    return JSON.parse(value);
  } catch (_error) {
    return fallback;
  }
}

<<<<<<< HEAD
function roundToTwo(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function formatCurrency(value) {
  return `$${roundToTwo(value).toFixed(2)}`;
}

function formatMiles(value) {
  return `${Number(value || 0).toFixed(1)} mi`;
}

function formatMinutes(value) {
  return `${Math.max(0, Math.round(Number(value || 0)))} min`;
}

function safeSetText(id, value) {
=======
function readStorage(keys, fallback = '') {
  const match = keys.map(key => localStorage.getItem(key)).find(value => value && value.length);
  return match || fallback;
}

function setText(id, value) {
>>>>>>> origin/main
  const node = document.getElementById(id);
  if (node) node.textContent = value;
}

<<<<<<< HEAD
function setButtonLoading(id, isLoading) {
  const button = document.getElementById(id);
  if (!button) return;
  button.classList.toggle('is-loading', Boolean(isLoading));
=======
function setElementVisible(id, visible) {
  const node = document.getElementById(id);
  if (node) node.classList.toggle('d-none', !visible);
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value || 0));
}

function formatCoordinateLabel(lat, lng) {
  return `${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`;
}

function formatCoordinateKey(lat, lng) {
  return `${Number(lng).toFixed(5)},${Number(lat).toFixed(5)}`;
}

function roundToTwo(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function buildLocalFareBreakdown(miles, minutes, rideType) {
  const multiplier = RIDE_TYPE_MULTIPLIER[rideType] || 1;
  const baseFare = roundToTwo(BASE_FARE_USD);
  const distanceFare = roundToTwo(miles * RATE_PER_MILE_USD * multiplier);
  const timeFare = roundToTwo(minutes * RATE_PER_MINUTE_USD * (TIME_FARE_MULTIPLIER_ADJUSTMENT * multiplier));
  const meterFare = roundToTwo(Math.max(baseFare, distanceFare + timeFare));
  const surgeMultiplier = 1;
  const surgeFare = roundToTwo(meterFare * surgeMultiplier);
  const serviceFeePercent = 0;
  const serviceFee = 0;
  const taxes = roundToTwo((surgeFare + serviceFee) * DEFAULT_TAX_RATE);
  const subtotal = roundToTwo(surgeFare + serviceFee);
  const total = roundToTwo(subtotal + taxes);
  return {
    currency: 'USD',
    baseFare,
    distanceFare,
    timeFare,
    meterFare,
    surgeMultiplier,
    surgeFare,
    serviceFeePercent,
    serviceFee,
    taxes,
    tolls: 0,
    discounts: 0,
    tips: 0,
    subtotal,
    total,
    fareEstimate: total,
    fareEstimateRange: {
      low: roundToTwo(Math.max(baseFare, total * FARE_RANGE_LOW_MULTIPLIER)),
      high: roundToTwo(total * FARE_RANGE_HIGH_MULTIPLIER)
    }
  };
}

function normalizeFareBreakdown(raw, fallback) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const base = fallback || buildLocalFareBreakdown(0, 0, selectedRideType);
  return {
    currency: source.currency || base.currency,
    baseFare: Number(source.baseFare ?? base.baseFare),
    distanceFare: Number(source.distanceFare ?? base.distanceFare),
    timeFare: Number(source.timeFare ?? base.timeFare),
    meterFare: Number(source.meterFare ?? base.meterFare),
    surgeMultiplier: Number(source.surgeMultiplier ?? base.surgeMultiplier),
    surgeFare: Number(source.surgeFare ?? base.surgeFare),
    serviceFeePercent: Number(source.serviceFeePercent ?? base.serviceFeePercent),
    serviceFee: Number(source.serviceFee ?? base.serviceFee),
    taxes: Number(source.taxes ?? base.taxes),
    tolls: Number(source.tolls ?? base.tolls),
    discounts: Number(source.discounts ?? base.discounts),
    tips: Number(source.tips ?? base.tips),
    subtotal: Number(source.subtotal ?? base.subtotal),
    total: Number(source.total ?? source.fareEstimate ?? base.total),
    fareEstimate: Number(source.fareEstimate ?? source.total ?? base.fareEstimate),
    fareEstimateRange: {
      low: Number(source.fareEstimateRange?.low ?? base.fareEstimateRange.low),
      high: Number(source.fareEstimateRange?.high ?? base.fareEstimateRange.high)
    }
  };
>>>>>>> origin/main
}

function readSharedRideStore() {
  const raw = parseJson(localStorage.getItem(SHARED_RIDE_STORAGE_KEY) || 'null', null);
  if (!raw || typeof raw !== 'object') {
    return { version: SHARED_RIDE_STORAGE_VERSION, rides: [], updatedAt: new Date().toISOString() };
  }
  return {
    version: Number(raw.version) || SHARED_RIDE_STORAGE_VERSION,
    rides: (Array.isArray(raw.rides) ? raw.rides : []).map(normalizeRide),
    updatedAt: raw.updatedAt || new Date().toISOString()
  };
}

function writeSharedRideStore(next) {
  localStorage.setItem(SHARED_RIDE_STORAGE_KEY, JSON.stringify({
    version: SHARED_RIDE_STORAGE_VERSION,
    rides: (Array.isArray(next?.rides) ? next.rides : []).map(normalizeRide),
    updatedAt: new Date().toISOString()
  }));
}

function upsertSharedRide(rideLike) {
  const ride = normalizeRide(rideLike);
  if (!ride.id) return ride;
  const store = readSharedRideStore();
  const byId = new Map(store.rides.map(item => [item.id, item]));
  const previous = byId.get(ride.id) || {};
  byId.set(ride.id, normalizeRide({ ...previous, ...ride, updatedAt: new Date().toISOString() }));
  writeSharedRideStore({ rides: Array.from(byId.values()) });
  return byId.get(ride.id);
}

function updateSharedRide(rideId, patch) {
  if (!rideId) return null;
  const store = readSharedRideStore();
  const nextRides = store.rides.map(ride => (ride.id === rideId
    ? normalizeRide({ ...ride, ...patch, updatedAt: new Date().toISOString() })
    : ride));
  writeSharedRideStore({ rides: nextRides });
  return nextRides.find(ride => ride.id === rideId) || null;
}

function mergeRides(backendRides, sharedRides) {
  const merged = new Map();
  [...(Array.isArray(sharedRides) ? sharedRides : []), ...(Array.isArray(backendRides) ? backendRides : [])].forEach(rawRide => {
    const ride = normalizeRide(rawRide);
    const previous = merged.get(ride.id) || {};
    merged.set(ride.id, normalizeRide({ ...previous, ...ride }));
  });
  return Array.from(merged.values()).sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
}

function normalizeRide(ride = {}, index = 0) {
  const fallbackPickupLat = Number.isFinite(Number(ride.pickupLat)) ? Number(ride.pickupLat) : DEFAULT_PICKUP.lat;
  const fallbackPickupLng = Number.isFinite(Number(ride.pickupLng)) ? Number(ride.pickupLng) : DEFAULT_PICKUP.lng;
  const fallbackDropoffLat = Number.isFinite(Number(ride.dropoffLat)) ? Number(ride.dropoffLat) : fallbackPickupLat + DEFAULT_DROPOFF_OFFSET_DEGREES;
  const fallbackDropoffLng = Number.isFinite(Number(ride.dropoffLng)) ? Number(ride.dropoffLng) : fallbackPickupLng + DEFAULT_DROPOFF_OFFSET_DEGREES;
<<<<<<< HEAD
  const rideFareDetails = ride.fareDetails || ride.fareBreakdown || null;
=======
  const miles = Number(ride.miles || 0);
  const minutes = Number(ride.minutes || 0);
  const defaultFareBreakdown = buildLocalFareBreakdown(miles, minutes, String(ride.rideType || 'ECONOMY').toUpperCase());
>>>>>>> origin/main
  return {
    id: ride.id || `rider_local_${Date.now()}_${index}`,
    riderId: ride.riderId || ride.userId || currentUser?.id || 'rider',
    riderName: ride.riderName || currentUser?.email || 'Rider',
    riderEmail: ride.riderEmail || currentUser?.email || '',
    pickupLat: fallbackPickupLat,
    pickupLng: fallbackPickupLng,
    dropoffLat: fallbackDropoffLat,
    dropoffLng: fallbackDropoffLng,
<<<<<<< HEAD
    pickupLabel: ride.pickupLabel || `${fallbackPickupLat.toFixed(5)}, ${fallbackPickupLng.toFixed(5)}`,
    destinationLabel: ride.destinationLabel || `${fallbackDropoffLat.toFixed(5)}, ${fallbackDropoffLng.toFixed(5)}`,
    rideType: String(ride.rideType || 'ECONOMY').toUpperCase(),
    miles: Number(ride.miles || 0),
    minutes: Number(ride.minutes || 0),
    fareEstimate: Number(ride.fareEstimate || rideFareDetails?.fareEstimate || rideFareDetails?.total || 0),
    fareDetails: rideFareDetails,
=======
    pickupLabel: ride.pickupLabel || formatCoordinateLabel(fallbackPickup, fallbackPickupLng),
    destinationLabel: ride.destinationLabel || formatCoordinateLabel(fallbackDropoff, fallbackDropoffLng),
    rideType: String(ride.rideType || 'ECONOMY').toUpperCase(),
    miles,
    minutes,
    fareEstimate: Number(ride.fareEstimate || defaultFareBreakdown.fareEstimate),
    fareBreakdown: normalizeFareBreakdown(ride.fareBreakdown, defaultFareBreakdown),
>>>>>>> origin/main
    status: String(ride.status || 'requested'),
    lifecycleState: String(ride.lifecycleState || ride.status || 'requested'),
    driverId: ride.driverId || null,
    driverName: ride.driverName || (ride.driverId ? `Driver ${String(ride.driverId).slice(0, 6)}` : null),
    etaMinutes: Number(ride.etaMinutes || ride.minutes || 0),
    riderLocation: ride.riderLocation && Number.isFinite(Number(ride.riderLocation.lat)) && Number.isFinite(Number(ride.riderLocation.lng))
      ? { lat: Number(ride.riderLocation.lat), lng: Number(ride.riderLocation.lng), updatedAt: ride.riderLocation.updatedAt || new Date().toISOString() }
      : null,
    driverLocation: ride.driverLocation && Number.isFinite(Number(ride.driverLocation.lat)) && Number.isFinite(Number(ride.driverLocation.lng))
      ? { lat: Number(ride.driverLocation.lat), lng: Number(ride.driverLocation.lng), updatedAt: ride.driverLocation.updatedAt || new Date().toISOString() }
      : null,
    events: Array.isArray(ride.events) ? ride.events : [],
    createdAt: ride.createdAt || new Date().toISOString(),
    updatedAt: ride.updatedAt || new Date().toISOString(),
    completedAt: ride.completedAt || null,
    canceledAt: ride.canceledAt || null
  };
}

async function fetchJson(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const data = await response.json().catch(() => null);
  return { response, data };
}

function getAuthHeaders() {
  return accessToken ? { Authorization: 'Bearer ' + accessToken } : {};
}

async function fetchBackendRides() {
  if (!accessToken) return [];
  const { response, data } = await fetchJson('/api/rides/history', { headers: getAuthHeaders() });
  if (!response.ok || !data?.ok || !Array.isArray(data.rides)) throw new Error(data?.error || 'Unable to fetch rides');
  return data.rides.map(normalizeRide);
}

function calculateDistanceKm(lat1, lng1, lat2, lng2) {
  const toRad = value => value * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

<<<<<<< HEAD
function calculateHeading(lat1, lng1, lat2, lng2) {
  const toRad = value => value * Math.PI / 180;
  const toDeg = value => value * 180 / Math.PI;
  const dLng = toRad(lng2 - lng1);
  const y = Math.sin(dLng) * Math.cos(toRad(lat2));
  const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

function normalizeHeading(degrees) {
  return ((Number(degrees) % 360) + 360) % 360;
}

function buildEstimateFromRoute(route, rideType = selectedRideType, overrides = {}) {
  const pricing = VEHICLE_PRICING[String(rideType || 'ECONOMY').toUpperCase()] || VEHICLE_PRICING.ECONOMY;
  const miles = Number(route?.distanceMiles || 0);
  const minutes = Number(route?.etaMinutes || 0);
  const surgeMultiplier = Math.max(1, Number(overrides.surgeMultiplier || 1));
  const taxes = roundToTwo(Number(overrides.taxes || 0));
  const baseFare = roundToTwo(pricing.minFare);
  const distanceFare = roundToTwo(miles * pricing.distanceRate);
  const timeFare = roundToTwo(minutes * pricing.timeRate);
  const meterFare = roundToTwo(Math.max(baseFare, distanceFare + timeFare));
  const surgeFare = roundToTwo(meterFare * surgeMultiplier * pricing.baseMultiplier);
  const serviceFee = roundToTwo(surgeFare * DEFAULT_SERVICE_FEE_PERCENT);
  const subtotal = roundToTwo(surgeFare + serviceFee);
  const total = roundToTwo(subtotal + taxes);
  return {
    currency: 'USD',
    fareEstimate: total,
    fareEstimateRange: {
      low: roundToTwo(Math.max(baseFare, total * FARE_ESTIMATE_LOW_MULTIPLIER)),
      high: roundToTwo(total * FARE_ESTIMATE_HIGH_MULTIPLIER)
    },
    fareBreakdown: {
      currency: 'USD',
      baseFare,
      distanceFare,
      timeFare,
      meterFare,
      surgeMultiplier,
      surgeFare,
      serviceFeePercent: DEFAULT_SERVICE_FEE_PERCENT,
      serviceFee,
      taxes,
      tolls: 0,
      discounts: 0,
      tips: 0,
      subtotal,
      total,
      driverEarnings: roundToTwo(Math.max(0, surgeFare - serviceFee)),
      fareEstimate: total,
      fareEstimateRange: {
        low: roundToTwo(Math.max(baseFare, total * FARE_ESTIMATE_LOW_MULTIPLIER)),
        high: roundToTwo(total * FARE_ESTIMATE_HIGH_MULTIPLIER)
      }
    }
  };
}

function buildLocalEstimate(pickup, destination, rideType = selectedRideType) {
  const distanceKm = calculateDistanceKm(pickup.lat, pickup.lng, destination.lat, destination.lng);
  const distanceMiles = roundToTwo(distanceKm * 0.621371);
  const etaMinutes = Math.max(MIN_TRIP_MINUTES, Math.round(distanceKm * MINUTES_PER_KM));
  const route = { distanceMiles, etaMinutes };
  return {
    ok: true,
    route,
    ...buildEstimateFromRoute(route, rideType)
  };
}

function normalizeEstimateResponse(payload, fallback) {
  if (!payload?.ok) return fallback;
  const route = {
    distanceMiles: Number(payload.route?.distanceMiles || fallback.route.distanceMiles),
    etaMinutes: Number(payload.route?.etaMinutes || fallback.route.etaMinutes)
  };
  const normalized = {
    ok: true,
    route,
    currency: payload.currency || fallback.currency || 'USD',
    fareEstimate: Number(payload.fareEstimate || fallback.fareEstimate || 0),
    fareEstimateRange: {
      low: Number(payload.fareEstimateRange?.low || fallback.fareEstimateRange?.low || 0),
      high: Number(payload.fareEstimateRange?.high || fallback.fareEstimateRange?.high || 0)
    },
    fareBreakdown: {
      ...(fallback.fareBreakdown || {}),
      ...(payload.fareBreakdown || {})
    }
  };
  normalized.fareBreakdown.fareEstimate = normalized.fareEstimate;
  normalized.fareBreakdown.fareEstimateRange = normalized.fareEstimateRange;
  normalized.fareBreakdown.total = Number(normalized.fareBreakdown.total ?? normalized.fareEstimate);
  normalized.fareBreakdown.taxes = Number(normalized.fareBreakdown.taxes || 0);
  normalized.fareBreakdown.baseFare = Number(normalized.fareBreakdown.baseFare || 0);
  normalized.fareBreakdown.distanceFare = Number(normalized.fareBreakdown.distanceFare || 0);
  normalized.fareBreakdown.timeFare = Number(normalized.fareBreakdown.timeFare || 0);
  normalized.fareBreakdown.surgeFare = Number(normalized.fareBreakdown.surgeFare || 0);
  normalized.fareBreakdown.surgeMultiplier = Number(normalized.fareBreakdown.surgeMultiplier || 1);
  return normalized;
}

async function estimateRideFare(pickup, destination) {
  const localEstimate = buildLocalEstimate(pickup, destination, selectedRideType);
=======
function calculateLocalEstimate(pickup, destination, rideType) {
  const distanceKm = calculateDistanceKm(pickup.lat, pickup.lng, destination.lat, destination.lng);
  const miles = distanceKm * 0.621371;
  const minutes = Math.max(MIN_TRIP_MINUTES, Math.round(distanceKm * MINUTES_PER_KM));
  const breakdown = buildLocalFareBreakdown(miles, minutes, rideType);
  return { miles, minutes, fare: breakdown.fareEstimate, breakdown, route: { distanceMiles: miles, etaMinutes: minutes } };
}

async function estimateRideFare(pickup, dropoff, rideType = selectedRideType) {
  const localEstimate = calculateLocalEstimate(pickup, dropoff, rideType);
>>>>>>> origin/main
  if (!accessToken) return localEstimate;
  try {
    const { response, data } = await fetchJson('/api/rides/estimate', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        pickupLat: pickup.lat,
        pickupLng: pickup.lng,
<<<<<<< HEAD
        dropoffLat: destination.lat,
        dropoffLng: destination.lng,
        rideType: selectedRideType
      })
    });
    if (!response.ok || !data?.ok) return localEstimate;
    return normalizeEstimateResponse(data, localEstimate);
=======
        dropoffLat: dropoff.lat,
        dropoffLng: dropoff.lng,
        rideType
      })
    });
    if (!response.ok || !data?.ok) return localEstimate;
    return {
      miles: Number(data.route?.distanceMiles || localEstimate.miles),
      minutes: Number(data.route?.etaMinutes || localEstimate.minutes),
      fare: Number(data.fareEstimate || localEstimate.fare),
      breakdown: normalizeFareBreakdown(data.fareBreakdown, localEstimate.breakdown),
      route: data.route || localEstimate.route
    };
>>>>>>> origin/main
  } catch (_error) {
    return localEstimate;
  }
}

function parseCoordinateInput(inputValue) {
  const matches = String(inputValue || '').match(/(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)/);
  if (!matches) return null;
  const lat = Number(matches[1]);
  const lng = Number(matches[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
<<<<<<< HEAD
  return { lat, lng };
}

function getPickupAndDestination() {
  const pickup = parseCoordinateInput(document.getElementById('pickup-input')?.value) || DEFAULT_PICKUP;
  const destination = parseCoordinateInput(document.getElementById('destination-input')?.value) || {
    lat: pickup.lat + 0.012,
    lng: pickup.lng + 0.008
  };
  return { pickup, destination };
}

async function requestRide(pickup, destination) {
  const estimate = latestEstimate || await estimateRideFare(pickup, destination);
=======
  return { lat, lng, label: formatCoordinateLabel(lat, lng) };
}

function getPickupAndDestination(options = {}) {
  const { requireExplicit = false, preferCurrentRide = true } = options;
  if (preferCurrentRide && currentRide?.pickupLat && currentRide?.dropoffLat) {
    return {
      pickup: { lat: Number(currentRide.pickupLat), lng: Number(currentRide.pickupLng), label: currentRide.pickupLabel },
      destination: { lat: Number(currentRide.dropoffLat), lng: Number(currentRide.dropoffLng), label: currentRide.destinationLabel }
    };
  }

  const pickup = parseCoordinateInput(document.getElementById('pickup-input').value);
  const destination = parseCoordinateInput(document.getElementById('destination-input').value);
  if (requireExplicit && (!pickup || !destination)) return null;
  const safePickup = pickup || DEFAULT_PICKUP;
  const safeDestination = destination || {
    lat: safePickup.lat + DEFAULT_DESTINATION_LAT_OFFSET,
    lng: safePickup.lng + DEFAULT_DESTINATION_LNG_OFFSET,
    label: formatCoordinateLabel(safePickup.lat + DEFAULT_DESTINATION_LAT_OFFSET, safePickup.lng + DEFAULT_DESTINATION_LNG_OFFSET)
  };
  return { pickup: safePickup, destination: safeDestination };
}

function getInitialsFromUser(user) {
  const source = String(user?.email || user?.name || 'Rider').trim();
  return (source[0] || 'R').toUpperCase();
}

function syncProfileShell() {
  const displayName = currentUser?.email || 'Rider';
  const riderId = currentUser?.id ? `Rider ID: ${currentUser.id}` : 'Rider ID: --';
  const initials = getInitialsFromUser(currentUser);
  ['sidebar-profile-avatar', 'header-user-avatar', 'profile-avatar'].forEach(id => setText(id, initials));
  setText('greeting-name', displayName);
  setText('header-user-name', displayName);
  setText('header-user-id', currentUser?.id ? `ID: ${currentUser.id}` : 'ID: --');
  setText('sidebar-user-name', displayName);
  setText('sidebar-user-meta', 'Ready to ride');
  setText('profile-name', displayName);
  setText('profile-meta', riderId);
  setText('rider-role', `Role: ${String(currentUser?.role || 'rider').toUpperCase()}`);
}

function hydrateInputsFromCurrentRide() {
  if (!currentRide) return;
  const pickupInput = document.getElementById('pickup-input');
  const destinationInput = document.getElementById('destination-input');
  if (pickupInput && currentRide.pickupLabel) pickupInput.value = currentRide.pickupLabel;
  if (destinationInput && currentRide.destinationLabel) destinationInput.value = currentRide.destinationLabel;
}

function getStatusViewModel(ride) {
  const status = String(ride?.status || 'idle');
  if (status === 'requested') {
    return { pill: 'Searching', message: 'Searching for a driver near your pickup.', step: 'searching', tone: 'searching' };
  }
  if (status === 'accepted') {
    return { pill: 'Assigned', message: 'A driver has accepted the trip and is on the way.', step: 'assigned', tone: 'assigned' };
  }
  if (status === 'arrived_at_pickup') {
    return { pill: 'Arriving', message: 'Your driver has arrived at the pickup point.', step: 'arriving', tone: 'arriving' };
  }
  if (status === 'started') {
    return { pill: 'In trip', message: 'Ride started — tracking live route to destination.', step: 'started', tone: 'started' };
  }
  if (status === 'completed') {
    return { pill: 'Completed', message: 'Ride completed — receipt and history are ready.', step: 'completed', tone: 'completed' };
  }
  if (status === 'canceled') {
    return { pill: 'Canceled', message: 'Ride canceled. You can request another ride anytime.', step: null, tone: 'canceled' };
  }
  return { pill: 'Idle', message: 'Enter pickup and destination to request a ride.', step: null, tone: 'idle' };
}

function updateTimeline(step) {
  const order = ['searching', 'assigned', 'arriving', 'started', 'completed'];
  const currentIndex = step ? order.indexOf(step) : -1;
  document.querySelectorAll('#trip-timeline li').forEach(item => {
    const itemIndex = order.indexOf(item.getAttribute('data-step'));
    item.classList.toggle('is-complete', currentIndex >= 0 && itemIndex < currentIndex);
    item.classList.toggle('is-current', currentIndex >= 0 && itemIndex === currentIndex);
  });
}

function renderRouteSummary(distanceMiles, minutes) {
  setText('route-distance', `${Number(distanceMiles || 0).toFixed(1)} mi`);
  setText('route-duration', `${Math.max(0, Math.round(Number(minutes || 0)))} min`);
}

function renderFareEstimate(estimate) {
  const breakdown = normalizeFareBreakdown(estimate.breakdown, buildLocalFareBreakdown(estimate.miles, estimate.minutes, selectedRideType));
  setText('fare-base', formatCurrency(breakdown.baseFare));
  setText('fare-distance', `${Number(estimate.miles || 0).toFixed(1)} mi`);
  setText('fare-duration', `${Math.max(0, Math.round(Number(estimate.minutes || 0)))} min`);
  setText('fare-surge', `${Number(breakdown.surgeMultiplier || 1).toFixed(1)}x`);
  setText('fare-taxes', formatCurrency((breakdown.taxes || 0) + (breakdown.serviceFee || 0) + (breakdown.tolls || 0)));
  setText('fare-estimate', formatCurrency(breakdown.fareEstimate || estimate.fare));
  setText('fare-total-caption', `${formatCurrency(breakdown.fareEstimateRange.low)} – ${formatCurrency(breakdown.fareEstimateRange.high)} range`);
  renderRouteSummary(estimate.miles, estimate.minutes);
}

async function renderRideTypePrices(pickup, destination) {
  const typeEntries = Object.keys(RIDE_TYPE_MULTIPLIER);
  await Promise.all(typeEntries.map(async rideType => {
    const estimate = await estimateRideFare(pickup, destination, rideType);
    setText(`price-${rideType.toLowerCase()}`, formatCurrency(estimate.fare));
  }));
}

function setMapLoading(isLoading, message) {
  const overlay = document.getElementById('map-loading-state');
  if (!overlay) return;
  overlay.classList.toggle('is-hidden', !isLoading);
  const label = overlay.querySelector('span:last-child');
  if (label && message) label.textContent = message;
}

function setMapStatus(message, detail = 'Mapbox GL JS v3.4.0 with live directions.') {
  setText('map-status', message);
  setText('map-status-detail', detail);
}

async function refreshFareEstimate() {
  const route = getPickupAndDestination();
  const estimate = await estimateRideFare(route.pickup, route.destination, selectedRideType);
  renderFareEstimate(estimate);
  await renderRideTypePrices(route.pickup, route.destination);
  renderMapState();
}

function readMapboxToken() {
  const queryToken = new URLSearchParams(window.location.search).get('mapbox_token') || '';
  const storedToken = localStorage.getItem(MAPBOX_TOKEN_STORAGE_KEY) || '';
  const metaToken = String(document.querySelector('meta[name="mapbox-token"]')?.content || '').trim();
  return String(queryToken || storedToken || metaToken || '').trim();
}

function ensureRouteLayers() {
  if (!mapState.map || !mapState.map.isStyleLoaded()) return false;
  if (!mapState.map.getSource(ROUTE_SOURCE_ID)) {
    mapState.map.addSource(ROUTE_SOURCE_ID, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] }
    });
  }
  if (!mapState.map.getLayer(ROUTE_LAYER_CASING_ID)) {
    mapState.map.addLayer({
      id: ROUTE_LAYER_CASING_ID,
      type: 'line',
      source: ROUTE_SOURCE_ID,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': 'rgba(255,255,255,0.45)',
        'line-width': 9,
        'line-opacity': 0.8
      }
    });
  }
  if (!mapState.map.getLayer(ROUTE_LAYER_ID)) {
    mapState.map.addLayer({
      id: ROUTE_LAYER_ID,
      type: 'line',
      source: ROUTE_SOURCE_ID,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': '#16c784',
        'line-width': 5,
        'line-opacity': 0.95
      }
    });
  }
  return true;
}

function buildMarkerElement(name) {
  const element = document.createElement('div');
  element.className = `map-marker map-marker--${name}`;
  return element;
}

function setMarker(name, lng, lat) {
  if (!mapState.map) return;
  const existing = mapState.markers[name];
  if (existing) {
    existing.setLngLat([lng, lat]);
    return;
  }
  mapState.markers[name] = new mapboxgl.Marker({ element: buildMarkerElement(name) })
    .setLngLat([lng, lat])
    .addTo(mapState.map);
}

async function fetchDirectionsGeoJson(coordinates) {
  const requestUrl = new URL(`${MAPBOX_DIRECTIONS_PROFILE_URL}${coordinates.map(point => `${point.lng},${point.lat}`).join(';')}`);
  requestUrl.searchParams.set('access_token', mapState.token);
  requestUrl.searchParams.set('alternatives', 'false');
  requestUrl.searchParams.set('geometries', 'geojson');
  requestUrl.searchParams.set('overview', 'full');
  requestUrl.searchParams.set('steps', 'false');
  const response = await fetch(requestUrl.toString());
  if (!response.ok) throw new Error('Unable to fetch route');
  const data = await response.json();
  const route = data.routes?.[0];
  if (!route?.geometry?.coordinates?.length) throw new Error('Missing route geometry');
  return {
    geojson: {
      type: 'FeatureCollection',
      features: [{ type: 'Feature', geometry: route.geometry, properties: {} }]
    },
    distanceMiles: Number(route.distance || 0) / 1609.34,
    durationMinutes: Number(route.duration || 0) / 60
  };
}

function updateRouteSource(data) {
  if (!ensureRouteLayers()) return;
  const source = mapState.map.getSource(ROUTE_SOURCE_ID);
  if (source) source.setData(data);
}

async function updateRouteGeometry(pickup, destination, driverLocation) {
  if (!mapState.map || !ensureRouteLayers()) return;
  const routeCoordinates = [];
  const rideStatus = String(currentRide?.status || '');
  if (driverLocation && ['accepted', 'arrived_at_pickup', 'started'].includes(rideStatus)) {
    routeCoordinates.push({ lng: Number(driverLocation.lng), lat: Number(driverLocation.lat) });
  }
  if (rideStatus !== 'started') {
    routeCoordinates.push({ lng: Number(pickup.lng), lat: Number(pickup.lat) });
  }
  routeCoordinates.push({ lng: Number(destination.lng), lat: Number(destination.lat) });
  const routeKey = routeCoordinates.map(point => formatCoordinateKey(point.lat, point.lng)).join('|');
  const requestId = ++mapState.routeRequestId;

  if (mapState.routeKey === routeKey) return;

  setMapLoading(true, 'Rendering live route…');
  try {
    const route = await fetchDirectionsGeoJson(routeCoordinates);
    if (requestId !== mapState.routeRequestId) return;
    mapState.routeKey = routeKey;
    updateRouteSource(route.geojson);
    renderRouteSummary(route.distanceMiles, route.durationMinutes);
    setMapStatus('Route ready', 'Turn-by-turn route loaded from Mapbox Directions API.');
  } catch (_error) {
    if (requestId !== mapState.routeRequestId) return;
    mapState.routeKey = routeKey;
    updateRouteSource({
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: routeCoordinates.map(point => [point.lng, point.lat])
        },
        properties: { fallback: true }
      }]
    });
    setMapStatus('Using estimated route', 'Directions API unavailable — showing direct route preview.');
  } finally {
    setMapLoading(false);
  }
}

async function initializeMap() {
  mapState.token = readMapboxToken();
  if (!mapState.token || typeof window.mapboxgl === 'undefined') {
    document.getElementById('map-fallback').classList.remove('d-none');
    setMapLoading(false);
    setMapStatus('Map unavailable', 'Add a valid Mapbox token to render the live route.');
    return;
  }

  try {
    localStorage.setItem(MAPBOX_TOKEN_STORAGE_KEY, mapState.token);
    mapboxgl.accessToken = mapState.token;
    mapState.map = new mapboxgl.Map({
      container: 'mapbox',
      style: 'mapbox://styles/mapbox/navigation-night-v1',
      center: [DEFAULT_PICKUP.lng, DEFAULT_PICKUP.lat],
      zoom: 12.8
    });
    mapState.map.addControl(new mapboxgl.NavigationControl({ showCompass: true }), 'top-right');
    mapState.map.on('load', () => {
      ensureRouteLayers();
      setMapLoading(false);
      renderMapState();
    });
  } catch (_error) {
    document.getElementById('map-fallback').classList.remove('d-none');
    setMapLoading(false);
    setMapStatus('Map unavailable', 'Mapbox initialization failed for this session.');
  }
}

function renderMapState() {
  if (!mapState.map) return;
  const { pickup, destination } = getPickupAndDestination();
  setMarker('pickup', pickup.lng, pickup.lat);
  setMarker('destination', destination.lng, destination.lat);

  const driverLocation = currentRide?.driverLocation;
  if (driverLocation && Number.isFinite(Number(driverLocation.lat)) && Number.isFinite(Number(driverLocation.lng))) {
    setMarker('driver', Number(driverLocation.lng), Number(driverLocation.lat));
  }

  const riderLocation = currentRide?.riderLocation;
  if (riderLocation && Number.isFinite(Number(riderLocation.lat)) && Number.isFinite(Number(riderLocation.lng))) {
    setMarker('rider', Number(riderLocation.lng), Number(riderLocation.lat));
  }

  const bounds = new mapboxgl.LngLatBounds();
  [
    { lat: pickup.lat, lng: pickup.lng },
    { lat: destination.lat, lng: destination.lng },
    driverLocation,
    riderLocation
  ].forEach(point => {
    if (point && Number.isFinite(Number(point.lat)) && Number.isFinite(Number(point.lng))) {
      bounds.extend([Number(point.lng), Number(point.lat)]);
    }
  });

  if (!bounds.isEmpty()) {
    mapState.map.fitBounds(bounds, { padding: MAP_BOUNDS_PADDING_PX, maxZoom: MAP_MAX_ZOOM_LEVEL, duration: MAP_BOUNDS_ANIMATION_MS });
  }

  updateRouteGeometry(pickup, destination, driverLocation).catch(() => {
    setMapLoading(false);
  });
}

function selectCurrentRide() {
  const riderRides = rides.filter(ride => ride.riderId === currentUser.id);
  if (!riderRides.length) {
    currentRide = null;
    return;
  }
  const active = riderRides.find(ride => ACTIVE_RIDE_STATUSES.includes(ride.status));
  currentRide = active || riderRides[0];
}

function showPopup(message) {
  const popup = document.getElementById('ride-popup');
  popup.textContent = message;
  popup.classList.remove('d-none');
  if (toastTimer) window.clearTimeout(toastTimer);
  const nextToastTimer = window.setTimeout(() => {
    popup.classList.add('d-none');
  }, POPUP_DISPLAY_DURATION_MS);
  toastTimer = nextToastTimer;
}

function syncActionButtons() {
  const requestButton = document.getElementById('request-ride-button');
  const cancelButton = document.getElementById('cancel-ride-button');
  const canCancel = !!currentRide && ['requested', 'accepted', 'arrived_at_pickup'].includes(currentRide.status);
  requestButton.disabled = !!currentRide && ['requested', 'accepted', 'arrived_at_pickup', 'started'].includes(currentRide.status);
  cancelButton.classList.toggle('is-hidden', !canCancel);
  cancelButton.disabled = !canCancel;
}

function syncTripInputLockState() {
  const isLocked = !!currentRide && ACTIVE_RIDE_STATUSES.includes(currentRide.status);
  ['pickup-input', 'destination-input'].forEach(id => {
    const input = document.getElementById(id);
    if (!input) return;
    input.readOnly = isLocked;
    input.setAttribute('aria-readonly', String(isLocked));
    if (isLocked) {
      input.setAttribute('title', 'Trip coordinates are locked while an active ride is in progress.');
    } else {
      input.removeAttribute('title');
    }
  });
}

function renderRideState() {
  const state = getStatusViewModel(currentRide);
  setText('ride-status-pill', state.pill);
  const statusPill = document.getElementById('ride-status-pill');
  if (statusPill) statusPill.dataset.status = state.tone;
  setText('status-message', state.message);
  setText('breadcrumb-status', currentRide ? `${state.pill} ride in progress` : 'Active rider session');
  updateTimeline(state.step);
  syncActionButtons();
  syncTripInputLockState();

  const canShowDriverCard = currentRide && ['accepted', 'arrived_at_pickup', 'started'].includes(currentRide.status);
  setElementVisible('driver-assigned-card', canShowDriverCard);
  if (canShowDriverCard) {
    setText('driver-name', `Driver: ${currentRide.driverName || currentRide.driverId || '--'}`);
    const driverLocation = currentRide.driverLocation
      ? `${Number(currentRide.driverLocation.lat).toFixed(5)}, ${Number(currentRide.driverLocation.lng).toFixed(5)}`
      : '--';
    setText('driver-location', `Location: ${driverLocation}`);
    setText('driver-eta', `ETA: ${Number(currentRide.etaMinutes || currentRide.minutes || 0)} min`);
  }

  if (currentRide) {
    hydrateInputsFromCurrentRide();
    renderFareEstimate({
      miles: currentRide.miles,
      minutes: currentRide.minutes,
      fare: currentRide.fareEstimate,
      breakdown: currentRide.fareBreakdown
    });
  }

  renderMapState();
}

async function syncRides() {
  let backendRides = [];
  try {
    backendRides = await fetchBackendRides();
  } catch (_error) {
    backendRides = [];
  }

  const sharedRides = readSharedRideStore().rides;
  rides = mergeRides(backendRides, sharedRides);
  writeSharedRideStore({ rides });
  selectCurrentRide();
  renderRideState();
}

async function requestRide(pickup, destination) {
  const estimate = await estimateRideFare(pickup, destination, selectedRideType);
>>>>>>> origin/main
  const baseRide = {
    riderId: currentUser.id,
    riderName: currentUser.email,
    riderEmail: currentUser.email,
    pickupLat: pickup.lat,
    pickupLng: pickup.lng,
    dropoffLat: destination.lat,
    dropoffLng: destination.lng,
    pickupLabel: document.getElementById('pickup-input')?.value.trim() || `${pickup.lat.toFixed(5)}, ${pickup.lng.toFixed(5)}`,
    destinationLabel: document.getElementById('destination-input')?.value.trim() || `${destination.lat.toFixed(5)}, ${destination.lng.toFixed(5)}`,
    rideType: selectedRideType,
<<<<<<< HEAD
    miles: estimate.route.distanceMiles,
    minutes: estimate.route.etaMinutes,
    fareEstimate: estimate.fareEstimate,
    fareDetails: estimate.fareBreakdown,
=======
    miles: estimate.miles,
    minutes: estimate.minutes,
    fareEstimate: estimate.fare,
    fareBreakdown: estimate.breakdown,
>>>>>>> origin/main
    status: 'requested',
    lifecycleState: 'requested',
    etaMinutes: estimate.route.etaMinutes,
    riderLocation: mapState.markers.rider
      ? { lat: mapState.markers.rider.getLngLat().lat, lng: mapState.markers.rider.getLngLat().lng, updatedAt: new Date().toISOString() }
      : null,
    events: [{
      id: `evt_${Date.now()}`,
      type: 'ride_requested',
      title: 'Ride requested',
      message: 'Waiting for a driver to accept your trip.',
      createdAt: new Date().toISOString()
    }]
  };

  if (accessToken) {
    try {
      const { response, data } = await fetchJson('/api/rides/request', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          pickupLat: pickup.lat,
          pickupLng: pickup.lng,
          dropoffLat: destination.lat,
          dropoffLng: destination.lng,
          rideType: selectedRideType
        })
      });
      if (response.ok && data?.ok && data.ride) {
<<<<<<< HEAD
        return upsertSharedRide({ ...baseRide, ...data.ride, fareDetails: data.ride.fareDetails || baseRide.fareDetails });
=======
        const backendRide = normalizeRide({ ...baseRide, ...data.ride, fareBreakdown: data.ride.fareBreakdown || estimate.breakdown });
        upsertSharedRide(backendRide);
        return backendRide;
>>>>>>> origin/main
      }
    } catch (_error) {
      // Fall back to local demo mode.
    }
  }

  return upsertSharedRide({ ...baseRide, id: `ride_local_${Date.now()}` });
}

async function cancelRide(rideId) {
  if (!rideId) return null;
  if (accessToken) {
    try {
      const { response, data } = await fetchJson('/api/rides/cancel', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ rideId })
      });
      if (response.ok && data?.ok && data.ride) {
        return upsertSharedRide(data.ride);
      }
    } catch (_error) {
      // Continue to local cancellation fallback.
    }
  }

  return updateSharedRide(rideId, {
    status: 'canceled',
    lifecycleState: 'canceled',
    canceledAt: new Date().toISOString(),
    events: [
      ...(currentRide?.events || []),
      {
        id: `evt_cancel_${Date.now()}`,
        type: 'ride_canceled',
        title: 'Ride canceled',
        message: 'Ride was canceled by rider.',
        createdAt: new Date().toISOString()
      }
    ]
  });
}

<<<<<<< HEAD
function getStatusViewModel(ride) {
  const status = String(ride?.status || 'idle');
  if (status === 'requested') return { pill: 'Searching', message: 'Searching for the best nearby driver.', step: 'searching', headerStatus: 'Finding a driver' };
  if (status === 'accepted') return { pill: 'Assigned', message: 'Your driver is on the way to pickup.', step: 'assigned', headerStatus: 'Driver assigned' };
  if (status === 'arrived_at_pickup') return { pill: 'Arriving', message: 'Your driver has arrived at the pickup point.', step: 'arriving', headerStatus: 'Driver at pickup' };
  if (status === 'started') return { pill: 'In trip', message: 'You are on the way to your destination.', step: 'started', headerStatus: 'Ride in progress' };
  if (status === 'completed') return { pill: 'Completed', message: 'Ride completed successfully.', step: 'completed', headerStatus: 'Trip completed' };
  if (status === 'canceled') return { pill: 'Canceled', message: 'Ride canceled.', step: null, headerStatus: 'Ride canceled' };
  return { pill: 'Idle', message: 'Enter pickup and destination to request a ride.', step: null, headerStatus: 'Ready to ride' };
}

function updateTimeline(step) {
  const order = ['searching', 'assigned', 'arriving', 'started', 'completed'];
  const currentIndex = step ? order.indexOf(step) : -1;
  document.querySelectorAll('#trip-timeline .timeline-step').forEach(item => {
    const itemIndex = order.indexOf(item.getAttribute('data-step'));
    item.classList.toggle('is-complete', currentIndex >= 0 && itemIndex < currentIndex);
    item.classList.toggle('is-current', currentIndex >= 0 && itemIndex === currentIndex);
  });
}

function renderRideState() {
  const state = getStatusViewModel(currentRide);
  safeSetText('ride-status-pill', state.pill);
  safeSetText('status-message', state.message);
  safeSetText('header-status-text', state.headerStatus);
  updateTimeline(state.step);

  const assignedCard = document.getElementById('driver-assigned-card');
  const showDriverCard = Boolean(currentRide && ['accepted', 'arrived_at_pickup', 'started'].includes(currentRide.status));
  if (assignedCard) assignedCard.classList.toggle('d-none', !showDriverCard);
  if (showDriverCard) {
    safeSetText('driver-name', currentRide.driverName || currentRide.driverId || '--');
    safeSetText('driver-location', currentRide.driverLocation
      ? `${Number(currentRide.driverLocation.lat).toFixed(5)}, ${Number(currentRide.driverLocation.lng).toFixed(5)}`
      : '--');
    safeSetText('driver-eta', formatMinutes(currentRide.etaMinutes || currentRide.minutes || 0));
  }

  const cancelButton = document.getElementById('cancel-ride-button');
  if (cancelButton) cancelButton.disabled = !currentRide || !['requested', 'accepted', 'arrived_at_pickup'].includes(currentRide.status);

  const previousStatus = mapState.lastRideStatus;
  mapState.lastRideStatus = currentRide?.status || 'idle';
  renderMapState({ fitRoute: previousStatus !== mapState.lastRideStatus });
}

function showPopup(message) {
  const popup = document.getElementById('ride-popup');
  if (!popup) return;
  popup.textContent = message;
  popup.classList.remove('d-none');
  window.setTimeout(() => popup.classList.add('d-none'), POPUP_DISPLAY_DURATION_MS);
}

function updateRideTypePricing(estimate) {
  const route = estimate?.route || { distanceMiles: 0, etaMinutes: 0 };
  const taxes = Number(estimate?.fareBreakdown?.taxes || 0);
  const surgeMultiplier = Number(estimate?.fareBreakdown?.surgeMultiplier || 1);
  Object.entries({
    economy: 'ECONOMY',
    comfort: 'COMFORT',
    premium: 'PREMIUM'
  }).forEach(([id, rideType]) => {
    const nextEstimate = rideType === selectedRideType
      ? estimate
      : { route, ...buildEstimateFromRoute(route, rideType, { taxes, surgeMultiplier }) };
    safeSetText(`price-${id}`, formatCurrency(nextEstimate?.fareEstimate || 0));
  });
}

function renderFareEstimate(estimate) {
  latestEstimate = estimate;
  safeSetText('fare-distance', formatMiles(estimate.route.distanceMiles));
  safeSetText('fare-duration', formatMinutes(estimate.route.etaMinutes));
  safeSetText('fare-base', formatCurrency(estimate.fareBreakdown.baseFare));
  safeSetText('fare-distance-fare', formatCurrency(estimate.fareBreakdown.distanceFare));
  safeSetText('fare-time-fare', formatCurrency(estimate.fareBreakdown.timeFare));
  safeSetText('fare-surge', formatCurrency(estimate.fareBreakdown.surgeFare));
  safeSetText('fare-taxes', formatCurrency(estimate.fareBreakdown.taxes));
  safeSetText('fare-estimate', formatCurrency(estimate.fareEstimate));
  safeSetText('fare-range', `${formatCurrency(estimate.fareEstimateRange.low)} - ${formatCurrency(estimate.fareEstimateRange.high)}`);
  safeSetText('map-route-distance', formatMiles(estimate.route.distanceMiles));
  safeSetText('map-route-duration', formatMinutes(estimate.route.etaMinutes));
  updateRideTypePricing(estimate);
}

async function refreshFareEstimate(options = {}) {
  const { fitRoute = false } = options;
  const requestId = ++fareRequestSequence;
  const { pickup, destination } = getPickupAndDestination();
  const estimate = await estimateRideFare(pickup, destination);
  if (requestId !== fareRequestSequence) return;
  renderFareEstimate(estimate);
  renderMapState({ fitRoute });
}

function readMapboxToken() {
  const queryToken = new URLSearchParams(window.location.search).get('mapbox_token') || '';
  const storedToken = localStorage.getItem(MAPBOX_TOKEN_STORAGE_KEY) || '';
  const metaToken = String(document.querySelector('meta[name="mapbox-token"]')?.content || '').trim();
  return String(queryToken || storedToken || metaToken || '').trim();
}

function createRouteMarkerElement(kind) {
  const marker = document.createElement('div');
  marker.className = `route-marker route-marker--${kind}`;
  marker.setAttribute('aria-label', kind === 'pickup' ? 'Pickup marker' : 'Destination marker');
  return marker;
}

function createDriverMarkerElement() {
  const element = document.createElement('div');
  element.className = 'driver-marker';

  const speedBadge = document.createElement('div');
  speedBadge.className = 'driver-marker-speed';
  speedBadge.textContent = 'Driver';

  const body = document.createElement('div');
  body.className = 'driver-marker-body';

  const arrow = document.createElement('span');
  arrow.className = 'driver-marker-arrow';
  arrow.textContent = '▲';

  body.appendChild(arrow);
  element.append(speedBadge, body);
  return element;
}

function createRiderMarkerElement() {
  const marker = document.createElement('div');
  marker.className = 'rider-marker';
  marker.setAttribute('aria-label', 'Rider location marker');
  return marker;
}

function updateDriverMarkerVisuals(position) {
  const markerElement = mapState.markers.driver?.getElement?.();
  if (!markerElement || !position) return;
  const arrow = markerElement.querySelector('.driver-marker-arrow');
  const speedBadge = markerElement.querySelector('.driver-marker-speed');
  if (arrow) {
    arrow.style.transform = `rotate(${normalizeHeading(position.heading ?? mapState.driverHeading)}deg)`;
  }
  if (speedBadge) {
    speedBadge.textContent = currentRide?.driverName || 'Driver';
  }
}

function startRouteDashAnimation() {
  if (mapState.routeAnimationTimer || !mapState.map) return;
  let frameIndex = 0;
  mapState.routeAnimationTimer = window.setInterval(() => {
    if (!mapState.map?.getLayer(mapState.routeLineLayerId)) return;
    mapState.map.setPaintProperty(mapState.routeLineLayerId, 'line-dasharray', ROUTE_DASH_FRAMES[frameIndex]);
    frameIndex = (frameIndex + 1) % ROUTE_DASH_FRAMES.length;
  }, 180);
}

function ensureRouteLayers() {
  if (!mapState.mapLoaded || !mapState.map) return;
  if (!mapState.map.getSource(mapState.routeSourceId)) {
    mapState.map.addSource(mapState.routeSourceId, {
      type: 'geojson',
      data: mapState.routeGeojson
    });
  }
  if (!mapState.map.getLayer(mapState.routeOutlineLayerId)) {
    mapState.map.addLayer({
      id: mapState.routeOutlineLayerId,
      type: 'line',
      source: mapState.routeSourceId,
      paint: {
        'line-color': 'rgba(255, 255, 255, 0.26)',
        'line-width': 9,
        'line-opacity': 0.9
      }
    });
  }
  if (!mapState.map.getLayer(mapState.routeLineLayerId)) {
    mapState.map.addLayer({
      id: mapState.routeLineLayerId,
      type: 'line',
      source: mapState.routeSourceId,
      paint: {
        'line-color': '#1b80ff',
        'line-width': 5,
        'line-opacity': 0.92,
        'line-dasharray': ROUTE_DASH_FRAMES[0]
      }
    });
  }
  startRouteDashAnimation();
}

function updateRouteSource() {
  if (!mapState.mapLoaded || !mapState.map) return;
  ensureRouteLayers();
  const source = mapState.map.getSource(mapState.routeSourceId);
  if (source) source.setData(mapState.routeGeojson);
}

function buildFallbackDirections(pickup, destination) {
  return {
    geometry: [[pickup.lng, pickup.lat], [destination.lng, destination.lat]],
    instructions: [
      `Start from pickup at ${pickup.lat.toFixed(4)}, ${pickup.lng.toFixed(4)}.`,
      `Continue to destination at ${destination.lat.toFixed(4)}, ${destination.lng.toFixed(4)}.`
    ],
    sourceLabel: 'Estimated route'
  };
}

async function fetchDirectionsRoute(pickup, destination) {
  if (!mapState.token) return buildFallbackDirections(pickup, destination);
  try {
    const url = new URL(`https://api.mapbox.com/directions/v5/mapbox/driving/${pickup.lng},${pickup.lat};${destination.lng},${destination.lat}`);
    url.searchParams.set('access_token', mapState.token);
    url.searchParams.set('alternatives', 'false');
    url.searchParams.set('geometries', 'geojson');
    url.searchParams.set('overview', 'full');
    url.searchParams.set('steps', 'true');
    const response = await fetch(url.toString());
    const payload = await response.json().catch(() => null);
    const route = payload?.routes?.[0];
    const coordinates = Array.isArray(route?.geometry?.coordinates) ? route.geometry.coordinates : null;
    if (!response.ok || !coordinates?.length) return buildFallbackDirections(pickup, destination);
    const instructions = (Array.isArray(route.legs) ? route.legs : [])
      .flatMap(leg => Array.isArray(leg.steps) ? leg.steps : [])
      .map(step => step?.maneuver?.instruction || step?.name)
      .filter(Boolean)
      .slice(0, 4);
    return {
      geometry: coordinates,
      instructions: instructions.length ? instructions : buildFallbackDirections(pickup, destination).instructions,
      sourceLabel: 'Mapbox live route'
    };
  } catch (_error) {
    return buildFallbackDirections(pickup, destination);
  }
}

function renderRouteInstructions(instructions) {
  const list = document.getElementById('route-instructions');
  if (!list) return;
  list.innerHTML = '';
  (instructions?.length ? instructions : ['Set pickup and destination to preview your trip.']).forEach(item => {
    const li = document.createElement('li');
    li.textContent = item;
    list.appendChild(li);
  });
}

function fitMapToScene(pickup, destination) {
  if (!mapState.map || typeof window.mapboxgl?.LngLatBounds === 'undefined') return;
  const points = [];
  const routeCoordinates = mapState.routeGeojson.features[0]?.geometry?.coordinates;
  if (Array.isArray(routeCoordinates) && routeCoordinates.length) points.push(...routeCoordinates);
  points.push([pickup.lng, pickup.lat], [destination.lng, destination.lat]);

  const driverLocation = currentRide?.driverLocation;
  if (driverLocation && Number.isFinite(Number(driverLocation.lat)) && Number.isFinite(Number(driverLocation.lng))) {
    points.push([Number(driverLocation.lng), Number(driverLocation.lat)]);
  }

  const riderLocation = currentRide?.riderLocation;
  if (riderLocation && Number.isFinite(Number(riderLocation.lat)) && Number.isFinite(Number(riderLocation.lng))) {
    points.push([Number(riderLocation.lng), Number(riderLocation.lat)]);
  }

  if (!points.length) return;
  const bounds = new window.mapboxgl.LngLatBounds(points[0], points[0]);
  points.forEach(point => bounds.extend(point));
  mapState.map.fitBounds(bounds, {
    padding: { top: MAP_BOUNDS_PADDING_PX, right: MAP_BOUNDS_PADDING_PX, bottom: 140, left: MAP_BOUNDS_PADDING_PX },
    maxZoom: MAP_MAX_ZOOM_LEVEL,
    duration: MAP_BOUNDS_ANIMATION_MS
  });
  mapState.hasFittedScene = true;
}

function syncMapMarkers(pickup, destination) {
  if (!mapState.mapLoaded || !mapState.map || typeof window.mapboxgl === 'undefined') return;

  if (!mapState.markers.pickup) {
    mapState.markers.pickup = new window.mapboxgl.Marker({ element: createRouteMarkerElement('pickup') });
  }
  if (!mapState.markers.destination) {
    mapState.markers.destination = new window.mapboxgl.Marker({ element: createRouteMarkerElement('destination') });
  }

  mapState.markers.pickup
    .setLngLat([pickup.lng, pickup.lat])
    .setPopup(new window.mapboxgl.Popup({ offset: 16 }).setText('Pickup'))
    .addTo(mapState.map);

  mapState.markers.destination
    .setLngLat([destination.lng, destination.lat])
    .setPopup(new window.mapboxgl.Popup({ offset: 16 }).setText('Destination'))
    .addTo(mapState.map);

  const riderLocation = currentRide?.riderLocation;
  if (riderLocation && Number.isFinite(Number(riderLocation.lat)) && Number.isFinite(Number(riderLocation.lng))) {
    if (!mapState.markers.rider) {
      mapState.markers.rider = new window.mapboxgl.Marker({ element: createRiderMarkerElement() });
    }
    mapState.markers.rider
      .setLngLat([Number(riderLocation.lng), Number(riderLocation.lat)])
      .addTo(mapState.map);
  } else if (mapState.markers.rider) {
    mapState.markers.rider.remove();
  }

  const driverLocation = currentRide?.driverLocation;
  if (driverLocation && Number.isFinite(Number(driverLocation.lat)) && Number.isFinite(Number(driverLocation.lng))) {
    if (!mapState.markers.driver) {
      mapState.markers.driver = new window.mapboxgl.Marker({ element: createDriverMarkerElement() });
    }
    if (mapState.lastDriverPosition) {
      mapState.driverHeading = calculateHeading(
        mapState.lastDriverPosition.lat,
        mapState.lastDriverPosition.lng,
        Number(driverLocation.lat),
        Number(driverLocation.lng)
      );
    }
    mapState.lastDriverPosition = { lat: Number(driverLocation.lat), lng: Number(driverLocation.lng) };
    mapState.markers.driver
      .setLngLat([Number(driverLocation.lng), Number(driverLocation.lat)])
      .setPopup(new window.mapboxgl.Popup({ offset: 20 }).setText(currentRide?.driverName || 'Driver'))
      .addTo(mapState.map);
    updateDriverMarkerVisuals({ heading: mapState.driverHeading });
  } else if (mapState.markers.driver) {
    mapState.markers.driver.remove();
    mapState.lastDriverPosition = null;
  }
}

async function refreshMapRoute(options = {}) {
  const { fitRoute = false, force = false } = options;
  const { pickup, destination } = getPickupAndDestination();
  const nextRouteKey = [pickup.lat, pickup.lng, destination.lat, destination.lng].map(value => Number(value).toFixed(5)).join(':');
  mapState.lastRouteKey = nextRouteKey;
  if (!force && mapState.lastFetchedRouteKey === nextRouteKey) {
    if (fitRoute || !mapState.hasFittedScene) fitMapToScene(pickup, destination);
    return;
  }

  const route = await fetchDirectionsRoute(pickup, destination);
  if (nextRouteKey !== mapState.lastRouteKey) return;
  mapState.lastFetchedRouteKey = nextRouteKey;
  mapState.routeGeojson = {
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: route.geometry
      }
    }]
  };
  mapState.routeInstructions = route.instructions;
  mapState.routeSourceLabel = route.sourceLabel;
  updateRouteSource();
  renderRouteInstructions(route.instructions);
  safeSetText('route-source-badge', route.sourceLabel);
  if (fitRoute || !mapState.hasFittedScene) fitMapToScene(pickup, destination);
}

function renderMapState(options = {}) {
  const { fitRoute = false } = options;
  const { pickup, destination } = getPickupAndDestination();
  if (!mapState.mapLoaded) {
    const fallbackDirections = buildFallbackDirections(pickup, destination);
    renderRouteInstructions(fallbackDirections.instructions);
    safeSetText('route-source-badge', fallbackDirections.sourceLabel);
    return;
  }
  syncMapMarkers(pickup, destination);
  refreshMapRoute({ fitRoute }).catch(() => {
    const fallbackDirections = buildFallbackDirections(pickup, destination);
    renderRouteInstructions(fallbackDirections.instructions);
    safeSetText('route-source-badge', fallbackDirections.sourceLabel);
  });
}

async function initializeMap() {
  mapState.token = readMapboxToken();
  if (!mapState.token || typeof window.mapboxgl === 'undefined') {
    document.getElementById('map-fallback')?.classList.remove('d-none');
    return;
  }

  try {
    window.mapboxgl.accessToken = mapState.token;
    mapState.map = new window.mapboxgl.Map({
      container: 'mapbox',
      style: 'mapbox://styles/mapbox/navigation-night-v1',
      center: [DEFAULT_PICKUP.lng, DEFAULT_PICKUP.lat],
      zoom: 12.5,
      pitch: 42,
      bearing: -14,
      antialias: true
    });
    mapState.map.addControl(new window.mapboxgl.NavigationControl({ showCompass: true }), 'top-right');
    mapState.map.on('load', () => {
      mapState.mapLoaded = true;
      document.getElementById('map-fallback')?.classList.add('d-none');
      ensureRouteLayers();
      renderMapState({ fitRoute: true });
    });
    mapState.map.on('style.load', () => {
      ensureRouteLayers();
      updateRouteSource();
      renderMapState();
    });
  } catch (_error) {
    document.getElementById('map-fallback')?.classList.remove('d-none');
  }
}

function selectCurrentRide() {
  const riderRides = rides.filter(ride => ride.riderId === currentUser.id);
  if (!riderRides.length) {
    currentRide = null;
    return;
  }
  const active = riderRides.find(ride => ACTIVE_RIDE_STATUSES.includes(ride.status));
  currentRide = active || riderRides[0];
}

async function syncRides() {
  let backendRides = [];
  try {
    backendRides = await fetchBackendRides();
  } catch (_error) {
    backendRides = [];
  }
  rides = mergeRides(backendRides, readSharedRideStore().rides);
  writeSharedRideStore({ rides });
  selectCurrentRide();
  renderRideState();
}

async function handleRequestRide() {
  const { pickup, destination } = getPickupAndDestination();
  setButtonLoading('request-ride-button', true);
  try {
    const ride = await requestRide(pickup, destination);
    currentRide = normalizeRide(ride);
    rides = mergeRides([currentRide], readSharedRideStore().rides);
    renderRideState();
    showPopup('Ride request sent. Searching for driver...');
  } finally {
    setButtonLoading('request-ride-button', false);
=======
async function handleRequestRide() {
  const route = getPickupAndDestination({ requireExplicit: true, preferCurrentRide: false });
  if (!route) {
    showPopup('Enter pickup and destination as lat, lng before requesting a ride.');
    return;
  }
  const requestButton = document.getElementById('request-ride-button');
  requestButton.disabled = true;
  const label = requestButton.querySelector('span');
  if (label) label.textContent = 'Requesting…';
  try {
    const ride = await requestRide(route.pickup, route.destination);
    currentRide = ride;
    rides = mergeRides([ride], readSharedRideStore().rides);
    renderRideState();
    showPopup('Ride request sent. Searching for driver...');
  } finally {
    if (label) label.textContent = 'Request Ride';
    syncActionButtons();
>>>>>>> origin/main
  }
}

async function handleCancelRide() {
  if (!currentRide?.id) return;
<<<<<<< HEAD
  setButtonLoading('cancel-ride-button', true);
=======
  const cancelButton = document.getElementById('cancel-ride-button');
  cancelButton.disabled = true;
  const label = cancelButton.querySelector('span');
  if (label) label.textContent = 'Canceling…';
>>>>>>> origin/main
  try {
    const canceledRide = await cancelRide(currentRide.id);
    if (canceledRide) {
      currentRide = normalizeRide(canceledRide);
      rides = mergeRides([currentRide], readSharedRideStore().rides);
      renderRideState();
      showPopup('Ride canceled.');
    }
  } finally {
<<<<<<< HEAD
    setButtonLoading('cancel-ride-button', false);
=======
    if (label) label.textContent = 'Cancel Ride';
    syncActionButtons();
>>>>>>> origin/main
  }
}

function handleLogout() {
  [...AUTH_STORAGE_KEYS.access, ...AUTH_STORAGE_KEYS.refresh, ...AUTH_STORAGE_KEYS.user].forEach(key => {
    localStorage.removeItem(key);
  });
  window.location.href = '/users.html';
}

function startRiderLocationSync() {
  if (!navigator.geolocation || riderLocationWatchId !== null) return;
  riderLocationWatchId = navigator.geolocation.watchPosition(position => {
    const lat = Number(position.coords.latitude);
    const lng = Number(position.coords.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    if (Date.now() - lastLocationPushAt < MIN_LOCATION_PUSH_INTERVAL_MS) return;
    lastLocationPushAt = Date.now();
    if (currentRide?.id && ACTIVE_RIDE_STATUSES.includes(currentRide.status)) {
      const updated = updateSharedRide(currentRide.id, {
        riderLocation: { lat, lng, updatedAt: new Date().toISOString() }
      });
      if (updated) {
        currentRide = normalizeRide(updated);
        renderRideState();
      }
    }
  }, error => {
    console.warn('Rider location watch failed', error);
  }, { enableHighAccuracy: true, maximumAge: 0, timeout: WATCH_LOCATION_TIMEOUT_MS });
}

<<<<<<< HEAD
function updateHeaderClock() {
  const now = new Date();
  const hours = now.getHours();
  const period = hours < MORNING_END_HOUR ? 'morning' : hours < AFTERNOON_END_HOUR ? 'afternoon' : 'evening';
  safeSetText('greeting-period', period);
  safeSetText('header-current-time', now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }));
}
=======
function setupSession() {
  accessToken = readStorage(AUTH_STORAGE_KEYS.access, '');
  refreshToken = readStorage(AUTH_STORAGE_KEYS.refresh, '');
  currentUser = parseJson(readStorage(AUTH_STORAGE_KEYS.user, '{}'), {});
>>>>>>> origin/main

function renderUserProfile() {
  const email = currentUser?.email || 'Rider';
  safeSetText('sidebar-user-name', email);
  safeSetText('header-user-name', email.split('@')[0] || email);
  safeSetText('user-card-name', email);
  safeSetText('user-card-id', `ID: ${currentUser?.id || '--'}`);
  safeSetText('profile-name', email);
  safeSetText('profile-meta', `Rider ID: ${currentUser?.id || '--'}`);
  safeSetText('rider-role', `Role: ${String(currentUser?.role || 'rider').toUpperCase()}`);
}

function seedDefaultInputs() {
  const pickupInput = document.getElementById('pickup-input');
  const destinationInput = document.getElementById('destination-input');
  if (pickupInput && !pickupInput.value.trim()) {
    pickupInput.value = `${DEFAULT_PICKUP.lat.toFixed(5)}, ${DEFAULT_PICKUP.lng.toFixed(5)}`;
  }
  if (destinationInput && !destinationInput.value.trim()) {
    destinationInput.value = `${(DEFAULT_PICKUP.lat + 0.012).toFixed(5)}, ${(DEFAULT_PICKUP.lng + 0.008).toFixed(5)}`;
  }
}

function setupSession() {
  accessToken = localStorage.getItem('accessToken') || localStorage.getItem('drive.accessToken') || '';
  refreshToken = localStorage.getItem('refreshToken') || localStorage.getItem('drive.refreshToken') || '';
  currentUser = parseJson(localStorage.getItem('user') || localStorage.getItem('drive.user') || '{}', {});
  if (!accessToken || !refreshToken || !currentUser?.id) {
    window.location.replace('/users.html');
    return false;
  }
  if (String(currentUser.role || '').toLowerCase() !== 'rider') {
    window.location.replace('/driver-dashboard.html');
    return false;
  }
<<<<<<< HEAD
  renderUserProfile();
  updateHeaderClock();
=======

  syncProfileShell();
>>>>>>> origin/main
  return true;
}

function toggleSidebar(forceOpen) {
  const sidebar = document.querySelector('.sidebar');
  if (!sidebar) return;
  const next = typeof forceOpen === 'boolean' ? forceOpen : !sidebar.classList.contains('is-open');
  sidebar.classList.toggle('is-open', next);
}

function setupHandlers() {
<<<<<<< HEAD
  document.getElementById('logout-button')?.addEventListener('click', handleLogout);
  document.getElementById('request-ride-button')?.addEventListener('click', () => {
=======
  document.getElementById('logout-button').addEventListener('click', handleLogout);
  document.getElementById('sidebar-toggle').addEventListener('click', () => toggleSidebar(false));
  document.getElementById('header-menu-button').addEventListener('click', () => toggleSidebar(true));
  document.getElementById('request-ride-button').addEventListener('click', () => {
>>>>>>> origin/main
    handleRequestRide().catch(() => showPopup('Unable to request ride.'));
  });
  document.getElementById('cancel-ride-button')?.addEventListener('click', () => {
    handleCancelRide().catch(() => showPopup('Unable to cancel ride.'));
  });
  document.getElementById('current-location-button')?.addEventListener('click', () => {
    if (!navigator.geolocation) {
      showPopup('Geolocation unavailable in this browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(position => {
      const lat = Number(position.coords.latitude).toFixed(5);
      const lng = Number(position.coords.longitude).toFixed(5);
      const pickupInput = document.getElementById('pickup-input');
      if (pickupInput) pickupInput.value = `${lat}, ${lng}`;
      refreshFareEstimate({ fitRoute: true }).catch(() => {});
    }, () => {
      showPopup('Unable to read your current location.');
    }, { enableHighAccuracy: true, timeout: CURRENT_LOCATION_TIMEOUT_MS });
  });

  document.querySelectorAll('[data-ride-type]').forEach(button => {
    button.addEventListener('click', () => {
      selectedRideType = button.getAttribute('data-ride-type') || 'ECONOMY';
      document.querySelectorAll('[data-ride-type]').forEach(node => node.classList.toggle('is-active', node === button));
      refreshFareEstimate().catch(() => {});
    });
  });

  ['pickup-input', 'destination-input'].forEach(id => {
<<<<<<< HEAD
    document.getElementById(id)?.addEventListener('input', () => {
      mapState.lastFetchedRouteKey = '';
      refreshFareEstimate({ fitRoute: true }).catch(() => {});
=======
    document.getElementById(id).addEventListener('input', () => {
      if (currentRide && ACTIVE_RIDE_STATUSES.includes(currentRide.status)) return;
      refreshFareEstimate().catch(() => {});
>>>>>>> origin/main
    });
  });

  window.addEventListener('storage', event => {
<<<<<<< HEAD
    if (event.key === SHARED_RIDE_STORAGE_KEY) syncRides().catch(() => {});
  });

  window.addEventListener('beforeunload', () => {
    if (clockIntervalId) window.clearInterval(clockIntervalId);
    if (mapState.routeAnimationTimer) window.clearInterval(mapState.routeAnimationTimer);
=======
    if ([SHARED_RIDE_STORAGE_KEY, ...AUTH_STORAGE_KEYS.access, ...AUTH_STORAGE_KEYS.refresh, ...AUTH_STORAGE_KEYS.user, MAPBOX_TOKEN_STORAGE_KEY].includes(event.key)) {
      if (!setupSession()) return;
      syncRides().catch(() => {});
      refreshFareEstimate().catch(() => {});
      if (event.key === MAPBOX_TOKEN_STORAGE_KEY && !mapState.map) {
        initializeMap().catch(() => {});
      }
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      syncRides().catch(() => {});
    }
>>>>>>> origin/main
  });
}

window.addEventListener('load', async () => {
  document.querySelectorAll('.premium-card').forEach((card, index) => {
    card.style.transitionDelay = `${index * 0.06}s`;
  });
  document.body.classList.add('is-ready');
  if (!setupSession()) return;
  seedDefaultInputs();
  setupHandlers();
  clockIntervalId = window.setInterval(updateHeaderClock, 60000);
  await initializeMap();
  await refreshFareEstimate({ fitRoute: true });
  await syncRides();
  startRiderLocationSync();
  window.setInterval(() => {
    syncRides().catch(() => {});
  }, RIDE_POLL_INTERVAL_MS);
});
