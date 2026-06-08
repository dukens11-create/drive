const API_BASE_URL = '';
const MAPBOX_TOKEN_STORAGE_KEY = 'drive.mapboxToken';
const MAPBOX_GEOCODE_CACHE_STORAGE_KEY = 'drive.mapboxGeocodeCache.v1';
const SHARED_RIDE_STORAGE_KEY = 'drive.sharedRideRequests.v1';
const SHARED_RIDE_STORAGE_VERSION = 1;
const RIDE_POLL_INTERVAL_MS = 2500;
const MIN_LOCATION_PUSH_INTERVAL_MS = 8000;
const DEFAULT_PICKUP = { lat: 37.7749, lng: -122.4194 };
const DEFAULT_DROPOFF_OFFSET_DEGREES = 0.01;
const POPUP_DISPLAY_DURATION_MS = 2600;
const MAP_BOUNDS_PADDING_PX = 80;
const MAP_MAX_ZOOM_LEVEL = 15;
const MAP_BOUNDS_ANIMATION_MS = 700;
const CURRENT_LOCATION_TIMEOUT_MS = 12000;
const WATCH_LOCATION_TIMEOUT_MS = 10000;
const GEOCODE_DEBOUNCE_MS = 500;
const MIN_GEOCODE_QUERY_LENGTH = 3;
const GEOCODE_CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 7;
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

let currentUser = null;
let accessToken = '';
let refreshToken = '';
let selectedRideType = 'ECONOMY';
let rides = [];
let currentRide = null;
let riderLocationWatchId = null;
let lastLocationPushAt = 0;
let latestEstimate = null;
let fareRequestSequence = 0;
let clockIntervalId = null;
const geocodeDebounceTimers = {};

const mapState = {
  map: null,
  token: '',
  mapLoaded: false,
  resizeHandlerBound: false,
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
};

function parseJson(value, fallback) {
  try {
    return JSON.parse(value);
  } catch (_error) {
    return fallback;
  }
}

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
  const node = document.getElementById(id);
  if (node) node.textContent = value;
}

function formatCoordinatePair(lat, lng) {
  return `${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`;
}

function setButtonLoading(id, isLoading) {
  const button = document.getElementById(id);
  if (!button) return;
  button.classList.toggle('is-loading', Boolean(isLoading));
  if (isLoading) {
    button.dataset.wasDisabled = button.disabled ? 'true' : 'false';
    button.disabled = true;
  } else {
    button.disabled = button.dataset.wasDisabled === 'true';
    delete button.dataset.wasDisabled;
  }
}

function setInputLoading(id, isLoading) {
  const input = document.getElementById(id);
  if (!input) return;
  input.setAttribute('aria-busy', Boolean(isLoading) ? 'true' : 'false');
  input.parentElement?.classList.toggle('is-loading', Boolean(isLoading));
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
  const rideFareDetails = ride.fareDetails || ride.fareBreakdown || null;
  return {
    id: ride.id || `rider_local_${Date.now()}_${index}`,
    riderId: ride.riderId || ride.userId || currentUser?.id || 'rider',
    riderName: ride.riderName || currentUser?.email || 'Rider',
    riderEmail: ride.riderEmail || currentUser?.email || '',
    pickupLat: fallbackPickupLat,
    pickupLng: fallbackPickupLng,
    dropoffLat: fallbackDropoffLat,
    dropoffLng: fallbackDropoffLng,
    pickupLabel: ride.pickupLabel || `${fallbackPickupLat.toFixed(5)}, ${fallbackPickupLng.toFixed(5)}`,
    destinationLabel: ride.destinationLabel || `${fallbackDropoffLat.toFixed(5)}, ${fallbackDropoffLng.toFixed(5)}`,
    rideType: String(ride.rideType || 'ECONOMY').toUpperCase(),
    miles: Number(ride.miles || 0),
    minutes: Number(ride.minutes || 0),
    fareEstimate: Number(ride.fareEstimate || rideFareDetails?.fareEstimate || rideFareDetails?.total || 0),
    fareDetails: rideFareDetails,
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
  if (!accessToken) return localEstimate;
  try {
    const { response, data } = await fetchJson('/api/rides/estimate', {
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
    if (!response.ok || !data?.ok) return localEstimate;
    return normalizeEstimateResponse(data, localEstimate);
  } catch (_error) {
    return localEstimate;
  }
}

function parseCoordinateInput(inputValue) {
  const matches = String(inputValue || '').trim().match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
  if (!matches) return null;
  const lat = Number(matches[1]);
  const lng = Number(matches[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

function readGeocodeCache() {
  const cache = parseJson(localStorage.getItem(MAPBOX_GEOCODE_CACHE_STORAGE_KEY) || '{}', {});
  return cache && typeof cache === 'object' ? cache : {};
}

function writeGeocodeCache(cache) {
  localStorage.setItem(MAPBOX_GEOCODE_CACHE_STORAGE_KEY, JSON.stringify(cache || {}));
}

async function geocodeAddress(query) {
  const normalizedQuery = String(query || '').trim().toLowerCase();
  if (!normalizedQuery) return null;

  const now = Date.now();
  const cache = readGeocodeCache();
  const cached = cache[normalizedQuery];
  if (cached && now - Number(cached.cachedAt || 0) < GEOCODE_CACHE_TTL_MS) {
    return { lat: Number(cached.lat), lng: Number(cached.lng) };
  }

  const token = mapState.token || readMapboxToken();
  if (!token) return null;

  try {
    const encodedQuery = encodeURIComponent(normalizedQuery);
    const url = new URL(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedQuery}.json`);
    url.searchParams.set('access_token', token);
    url.searchParams.set('limit', '1');
    const response = await fetch(url.toString());
    const payload = await response.json().catch(() => null);
    const feature = payload?.features?.[0];
    const center = Array.isArray(feature?.center) ? feature.center : null;
    const lng = Number(center?.[0]);
    const lat = Number(center?.[1]);
    if (!response.ok || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;

    cache[normalizedQuery] = { lat, lng, cachedAt: now };
    writeGeocodeCache(cache);
    return { lat, lng };
  } catch (_error) {
    return null;
  }
}

async function resolveCoordinateInput(id, options = {}) {
  const { fitRoute = true, showError = false } = options;
  const input = document.getElementById(id);
  const rawValue = String(input?.value || '').trim();
  if (!input || !rawValue) return parseCoordinateInput(rawValue);
  const parsedCoordinates = parseCoordinateInput(rawValue);
  if (parsedCoordinates) return parsedCoordinates;

  const token = mapState.token || readMapboxToken();
  if (!token) {
    if (showError) {
      showPopup('Mapbox token missing. Enter coordinates as "lat, lng" or add a token to geocode places.');
    }
    return null;
  }

  setInputLoading(id, true);
  try {
    const coordinates = await geocodeAddress(rawValue);
    if (!coordinates) {
      if (showError) showPopup(`Address not found for "${rawValue}".`);
      return null;
    }
    input.value = formatCoordinatePair(coordinates.lat, coordinates.lng);
    mapState.lastFetchedRouteKey = '';
    await refreshFareEstimate({ fitRoute });
    return coordinates;
  } finally {
    setInputLoading(id, false);
  }
}

function queueGeocodeResolution(id, options = {}) {
  if (geocodeDebounceTimers[id]) window.clearTimeout(geocodeDebounceTimers[id]);
  const input = document.getElementById(id);
  const value = String(input?.value || '').trim();
  if (!value || parseCoordinateInput(value) || value.length < MIN_GEOCODE_QUERY_LENGTH) return;
  geocodeDebounceTimers[id] = window.setTimeout(() => {
    resolveCoordinateInput(id, options).catch(() => {});
  }, GEOCODE_DEBOUNCE_MS);
}

function getPickupAndDestination(options = {}) {
  const { allowFallback = false } = options;
  const pickup = parseCoordinateInput(document.getElementById('pickup-input')?.value);
  const destination = parseCoordinateInput(document.getElementById('destination-input')?.value);
  if (!allowFallback) {
    return { pickup, destination, hasValidCoordinates: Boolean(pickup && destination) };
  }
  const nextPickup = pickup || DEFAULT_PICKUP;
  const nextDestination = destination || {
    lat: nextPickup.lat + 0.012,
    lng: nextPickup.lng + 0.008
  };
  return { pickup: nextPickup, destination: nextDestination, hasValidCoordinates: Boolean(pickup && destination) };
}

async function requestRide(pickup, destination) {
  const estimate = latestEstimate || await estimateRideFare(pickup, destination);
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
    miles: estimate.route.distanceMiles,
    minutes: estimate.route.etaMinutes,
    fareEstimate: estimate.fareEstimate,
    fareDetails: estimate.fareBreakdown,
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
        return upsertSharedRide({ ...baseRide, ...data.ride, fareDetails: data.ride.fareDetails || baseRide.fareDetails });
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
  const requestButton = document.getElementById('request-ride-button');
  const buttonGroup = document.querySelector('.button-group');
  const canCancelRide = Boolean(currentRide && ['requested', 'accepted', 'arrived_at_pickup'].includes(currentRide.status));
  if (requestButton) {
    requestButton.disabled = canCancelRide;
    requestButton.classList.toggle('d-none', canCancelRide);
  }
  if (cancelButton) {
    cancelButton.disabled = !canCancelRide;
    cancelButton.classList.toggle('d-none', !canCancelRide);
  }
  if (buttonGroup) {
    const visibleButtons = [requestButton, cancelButton].filter(button => button && !button.classList.contains('d-none')).length;
    buttonGroup.classList.toggle('single-action', visibleButtons <= 1);
  }

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

function setMapFallbackMessage(message) {
  const fallback = document.getElementById('map-fallback');
  if (!fallback) return;
  const detail = fallback.querySelector('#map-fallback-detail') || fallback.querySelector('p');
  if (detail) detail.textContent = message;
}

function setMapLoading(isLoading) {
  const loading = document.getElementById('map-loading');
  if (!loading) return;
  loading.classList.toggle('is-hidden', !isLoading);
}

function resizeMapNow(delay = 0) {
  const run = () => {
    if (!mapState.map) return;
    mapState.map.resize();
  };
  if (delay > 0) {
    window.setTimeout(run, delay);
    return;
  }
  run();
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
  const { pickup, destination, hasValidCoordinates } = getPickupAndDestination();
  if (!hasValidCoordinates || !pickup || !destination) {
    renderMapState({ fitRoute, allowFallback: true });
    return;
  }
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
  const { pickup, destination } = getPickupAndDestination({ allowFallback: true });
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
  const { fitRoute = false, allowFallback = true } = options;
  const { pickup, destination } = getPickupAndDestination({ allowFallback });
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
  const mapContainer = document.getElementById('mapbox');
  setMapLoading(true);
  console.log('Mapbox token:', mapState.token ? '✓' : '✗ MISSING');
  console.log('Map container:', mapContainer ? '✓' : '✗ NOT FOUND');
  if (!mapContainer) {
    console.error('Map container #mapbox not found.');
    setMapFallbackMessage('Map container missing. Refresh the page and try again.');
    document.getElementById('map-fallback')?.classList.remove('d-none');
    setMapLoading(false);
    return;
  }
  if (!mapState.token) {
    console.error('Mapbox token missing.');
    setMapFallbackMessage('Mapbox token missing. Add ?mapbox_token=YOUR_TOKEN or set the mapbox-token meta tag.');
    document.getElementById('map-fallback')?.classList.remove('d-none');
    setMapLoading(false);
    return;
  }
  if (typeof window.mapboxgl === 'undefined') {
    console.error('Mapbox library failed to load.');
    setMapFallbackMessage('Mapbox library failed to load. Check your connection and refresh.');
    document.getElementById('map-fallback')?.classList.remove('d-none');
    setMapLoading(false);
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
    console.log('Map instance:', mapState.map ? '✓' : '✗ FAILED');
    mapState.map.addControl(new window.mapboxgl.NavigationControl({ showCompass: true }), 'top-right');
    mapState.map.on('error', event => {
      console.error('Mapbox runtime error:', event?.error || event);
      setMapFallbackMessage('Map failed to render. Check your Mapbox token/network and retry.');
      document.getElementById('map-fallback')?.classList.remove('d-none');
      setMapLoading(false);
    });
    mapState.map.on('load', () => {
      mapState.mapLoaded = true;
      document.getElementById('map-fallback')?.classList.add('d-none');
      setMapLoading(false);
      ensureRouteLayers();
      renderMapState({ fitRoute: true });
      resizeMapNow();
      resizeMapNow(120);
    });
    mapState.map.on('style.load', () => {
      ensureRouteLayers();
      updateRouteSource();
      renderMapState();
      resizeMapNow();
    });
    resizeMapNow();
    resizeMapNow(50);
  } catch (_error) {
    console.error('Unable to initialize Mapbox map.', _error);
    setMapFallbackMessage('Unable to initialize the map. Verify your Mapbox token and try again.');
    document.getElementById('map-fallback')?.classList.remove('d-none');
    setMapLoading(false);
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
  await Promise.all([
    resolveCoordinateInput('pickup-input', { fitRoute: true, showError: true }),
    resolveCoordinateInput('destination-input', { fitRoute: true, showError: true })
  ]);
  const { pickup, destination, hasValidCoordinates } = getPickupAndDestination();
  if (!hasValidCoordinates || !pickup || !destination) {
    showPopup('Enter valid pickup and destination coordinates to request a ride.');
    return;
  }
  setButtonLoading('request-ride-button', true);
  try {
    const ride = await requestRide(pickup, destination);
    currentRide = normalizeRide(ride);
    rides = mergeRides([currentRide], readSharedRideStore().rides);
    renderRideState();
    showPopup('Ride request sent. Searching for driver...');
  } finally {
    setButtonLoading('request-ride-button', false);
    renderRideState();
  }
}

async function handleCancelRide() {
  if (!currentRide?.id) return;
  setButtonLoading('cancel-ride-button', true);
  try {
    const canceledRide = await cancelRide(currentRide.id);
    if (canceledRide) {
      currentRide = normalizeRide(canceledRide);
      rides = mergeRides([currentRide], readSharedRideStore().rides);
      renderRideState();
      showPopup('Ride canceled.');
    }
  } finally {
    setButtonLoading('cancel-ride-button', false);
    renderRideState();
  }
}

function handleLogout() {
  ['accessToken', 'refreshToken', 'user', 'drive.accessToken', 'drive.refreshToken', 'drive.user'].forEach(key => {
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

function updateHeaderClock() {
  const now = new Date();
  const hours = now.getHours();
  const period = hours < MORNING_END_HOUR ? 'morning' : hours < AFTERNOON_END_HOUR ? 'afternoon' : 'evening';
  safeSetText('greeting-period', period);
  safeSetText('header-current-time', now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }));
}

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
    pickupInput.value = formatCoordinatePair(DEFAULT_PICKUP.lat, DEFAULT_PICKUP.lng);
  }
  if (destinationInput && !destinationInput.value.trim()) {
    destinationInput.value = formatCoordinatePair(DEFAULT_PICKUP.lat + 0.012, DEFAULT_PICKUP.lng + 0.008);
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
  renderUserProfile();
  updateHeaderClock();
  return true;
}

function setupHandlers() {
  document.getElementById('logout-button')?.addEventListener('click', handleLogout);
  document.getElementById('request-ride-button')?.addEventListener('click', () => {
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
      if (pickupInput) pickupInput.value = formatCoordinatePair(lat, lng);
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
    document.getElementById(id)?.addEventListener('input', () => {
      mapState.lastFetchedRouteKey = '';
      const value = String(document.getElementById(id)?.value || '').trim();
      if (!value) {
        refreshFareEstimate({ fitRoute: true }).catch(() => {});
        return;
      }
      if (parseCoordinateInput(value)) {
        setInputLoading(id, false);
        refreshFareEstimate({ fitRoute: true }).catch(() => {});
        return;
      }
      queueGeocodeResolution(id, { fitRoute: true, showError: false });
    });
    document.getElementById(id)?.addEventListener('blur', () => {
      resolveCoordinateInput(id, { fitRoute: true, showError: true }).catch(() => {});
    });
  });

  window.addEventListener('storage', event => {
    if (event.key === SHARED_RIDE_STORAGE_KEY) syncRides().catch(() => {});
  });

  if (!mapState.resizeHandlerBound) {
    mapState.resizeHandlerBound = true;
    window.addEventListener('resize', () => resizeMapNow(50));
  }

  window.addEventListener('beforeunload', () => {
    if (clockIntervalId) window.clearInterval(clockIntervalId);
    if (mapState.routeAnimationTimer) window.clearInterval(mapState.routeAnimationTimer);
    Object.values(geocodeDebounceTimers).forEach(timer => window.clearTimeout(timer));
  });
}

window.addEventListener('load', async () => {
  if (!setupSession()) return;
  seedDefaultInputs();
  setupHandlers();
  clockIntervalId = window.setInterval(updateHeaderClock, 60000);
  await initializeMap();
  resizeMapNow();
  resizeMapNow(120);
  await refreshFareEstimate({ fitRoute: true });
  await syncRides();
  startRiderLocationSync();
  window.setInterval(() => {
    syncRides().catch(() => {});
  }, RIDE_POLL_INTERVAL_MS);
});
