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

let currentUser = null;
let accessToken = '';
let refreshToken = '';
let selectedRideType = 'ECONOMY';
let rides = [];
let currentRide = null;
let riderLocationWatchId = null;
let lastLocationPushAt = 0;
let toastTimer = null;

const mapState = {
  map: null,
  token: '',
  markers: { pickup: null, destination: null, driver: null, rider: null },
  routeKey: '',
  routeRequestId: 0
};

function parseJson(value, fallback) {
  try {
    return JSON.parse(value);
  } catch (_error) {
    return fallback;
  }
}

function readStorage(keys, fallback = '') {
  const match = keys.map(key => localStorage.getItem(key)).find(value => value && value.length);
  return match || fallback;
}

function setText(id, value) {
  const node = document.getElementById(id);
  if (node) node.textContent = value;
}

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
}

function readSharedRideStore() {
  const raw = parseJson(localStorage.getItem(SHARED_RIDE_STORAGE_KEY) || 'null', null);
  if (!raw || typeof raw !== 'object') {
    return { version: SHARED_RIDE_STORAGE_VERSION, rides: [], updatedAt: new Date().toISOString() };
  }
  const records = Array.isArray(raw.rides) ? raw.rides : [];
  return {
    version: Number(raw.version) || SHARED_RIDE_STORAGE_VERSION,
    rides: records.map(normalizeRide),
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
  const nextRides = store.rides.map(ride => {
    if (ride.id !== rideId) return ride;
    return normalizeRide({ ...ride, ...patch, updatedAt: new Date().toISOString() });
  });
  writeSharedRideStore({ rides: nextRides });
  return nextRides.find(ride => ride.id === rideId) || null;
}

function mergeRides(backendRides, sharedRides) {
  const merged = new Map();
  [...sharedRides, ...backendRides].forEach(rawRide => {
    const ride = normalizeRide(rawRide);
    const previous = merged.get(ride.id) || {};
    merged.set(ride.id, normalizeRide({ ...previous, ...ride }));
  });
  return Array.from(merged.values()).sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
}

function normalizeRide(ride = {}, index = 0) {
  const fallbackPickup = Number.isFinite(Number(ride.pickupLat)) ? Number(ride.pickupLat) : DEFAULT_PICKUP.lat;
  const fallbackPickupLng = Number.isFinite(Number(ride.pickupLng)) ? Number(ride.pickupLng) : DEFAULT_PICKUP.lng;
  const fallbackDropoff = Number.isFinite(Number(ride.dropoffLat)) ? Number(ride.dropoffLat) : fallbackPickup + DEFAULT_DROPOFF_OFFSET_DEGREES;
  const fallbackDropoffLng = Number.isFinite(Number(ride.dropoffLng)) ? Number(ride.dropoffLng) : fallbackPickupLng + DEFAULT_DROPOFF_OFFSET_DEGREES;
  const miles = Number(ride.miles || 0);
  const minutes = Number(ride.minutes || 0);
  const defaultFareBreakdown = buildLocalFareBreakdown(miles, minutes, String(ride.rideType || 'ECONOMY').toUpperCase());
  return {
    id: ride.id || `rider_local_${Date.now()}_${index}`,
    riderId: ride.riderId || ride.userId || currentUser?.id || 'rider',
    riderName: ride.riderName || currentUser?.email || 'Rider',
    riderEmail: ride.riderEmail || currentUser?.email || '',
    pickupLat: fallbackPickup,
    pickupLng: fallbackPickupLng,
    dropoffLat: fallbackDropoff,
    dropoffLng: fallbackDropoffLng,
    pickupLabel: ride.pickupLabel || formatCoordinateLabel(fallbackPickup, fallbackPickupLng),
    destinationLabel: ride.destinationLabel || formatCoordinateLabel(fallbackDropoff, fallbackDropoffLng),
    rideType: String(ride.rideType || 'ECONOMY').toUpperCase(),
    miles,
    minutes,
    fareEstimate: Number(ride.fareEstimate || defaultFareBreakdown.fareEstimate),
    fareBreakdown: normalizeFareBreakdown(ride.fareBreakdown, defaultFareBreakdown),
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
  const data = await response.json();
  return { response, data };
}

function getAuthHeaders() {
  return accessToken ? { Authorization: ['Bearer', accessToken].join(' ') } : {};
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

function calculateLocalEstimate(pickup, destination, rideType) {
  const distanceKm = calculateDistanceKm(pickup.lat, pickup.lng, destination.lat, destination.lng);
  const miles = distanceKm * 0.621371;
  const minutes = Math.max(MIN_TRIP_MINUTES, Math.round(distanceKm * MINUTES_PER_KM));
  const breakdown = buildLocalFareBreakdown(miles, minutes, rideType);
  return { miles, minutes, fare: breakdown.fareEstimate, breakdown, route: { distanceMiles: miles, etaMinutes: minutes } };
}

async function estimateRideFare(pickup, dropoff, rideType = selectedRideType) {
  const localEstimate = calculateLocalEstimate(pickup, dropoff, rideType);
  if (!accessToken) return localEstimate;
  try {
    const { response, data } = await fetchJson('/api/rides/estimate', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        pickupLat: pickup.lat,
        pickupLng: pickup.lng,
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
  const baseRide = {
    riderId: currentUser.id,
    riderName: currentUser.email,
    riderEmail: currentUser.email,
    pickupLat: pickup.lat,
    pickupLng: pickup.lng,
    dropoffLat: destination.lat,
    dropoffLng: destination.lng,
    pickupLabel: document.getElementById('pickup-input').value.trim(),
    destinationLabel: document.getElementById('destination-input').value.trim(),
    rideType: selectedRideType,
    miles: estimate.miles,
    minutes: estimate.minutes,
    fareEstimate: estimate.fare,
    fareBreakdown: estimate.breakdown,
    status: 'requested',
    lifecycleState: 'requested',
    etaMinutes: estimate.minutes,
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
        const backendRide = normalizeRide({ ...baseRide, ...data.ride, fareBreakdown: data.ride.fareBreakdown || estimate.breakdown });
        upsertSharedRide(backendRide);
        return backendRide;
      }
    } catch (_error) {
      // Fall through to local demo mode.
    }
  }

  const localRide = normalizeRide({ ...baseRide, id: `ride_local_${Date.now()}` });
  upsertSharedRide(localRide);
  return localRide;
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
        const canceledRide = normalizeRide(data.ride);
        upsertSharedRide(canceledRide);
        return canceledRide;
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
  }
}

async function handleCancelRide() {
  if (!currentRide?.id) return;
  const cancelButton = document.getElementById('cancel-ride-button');
  cancelButton.disabled = true;
  const label = cancelButton.querySelector('span');
  if (label) label.textContent = 'Canceling…';
  try {
    const canceledRide = await cancelRide(currentRide.id);
    if (canceledRide) {
      currentRide = normalizeRide(canceledRide);
      rides = mergeRides([currentRide], readSharedRideStore().rides);
      renderRideState();
      showPopup('Ride canceled.');
    }
  } finally {
    if (label) label.textContent = 'Cancel Ride';
    syncActionButtons();
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

function setupSession() {
  accessToken = readStorage(AUTH_STORAGE_KEYS.access, '');
  refreshToken = readStorage(AUTH_STORAGE_KEYS.refresh, '');
  currentUser = parseJson(readStorage(AUTH_STORAGE_KEYS.user, '{}'), {});

  if (!accessToken || !refreshToken || !currentUser?.id) {
    window.location.replace('/users.html');
    return false;
  }

  if (String(currentUser.role || '').toLowerCase() !== 'rider') {
    window.location.replace('/driver-dashboard.html');
    return false;
  }

  syncProfileShell();
  return true;
}

function toggleSidebar(forceOpen) {
  const sidebar = document.querySelector('.sidebar');
  if (!sidebar) return;
  const next = typeof forceOpen === 'boolean' ? forceOpen : !sidebar.classList.contains('is-open');
  sidebar.classList.toggle('is-open', next);
}

function setupHandlers() {
  document.getElementById('logout-button').addEventListener('click', handleLogout);
  document.getElementById('sidebar-toggle').addEventListener('click', () => toggleSidebar(false));
  document.getElementById('header-menu-button').addEventListener('click', () => toggleSidebar(true));
  document.getElementById('request-ride-button').addEventListener('click', () => {
    handleRequestRide().catch(() => showPopup('Unable to request ride.'));
  });
  document.getElementById('cancel-ride-button').addEventListener('click', () => {
    handleCancelRide().catch(() => showPopup('Unable to cancel ride.'));
  });
  document.getElementById('current-location-button').addEventListener('click', () => {
    if (!navigator.geolocation) {
      showPopup('Geolocation unavailable in this browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(position => {
      const lat = Number(position.coords.latitude).toFixed(5);
      const lng = Number(position.coords.longitude).toFixed(5);
      document.getElementById('pickup-input').value = `${lat}, ${lng}`;
      refreshFareEstimate().catch(() => {});
    }, () => {
      showPopup('Unable to read your current location.');
    }, { enableHighAccuracy: true, timeout: CURRENT_LOCATION_TIMEOUT_MS });
  });

  document.querySelectorAll('[data-ride-type]').forEach(button => {
    button.addEventListener('click', () => {
      selectedRideType = button.getAttribute('data-ride-type') || 'ECONOMY';
      document.querySelectorAll('[data-ride-type]').forEach(node => {
        node.classList.toggle('is-active', node === button);
      });
      refreshFareEstimate().catch(() => {});
    });
  });

  ['pickup-input', 'destination-input'].forEach(id => {
    document.getElementById(id).addEventListener('input', () => {
      if (currentRide && ACTIVE_RIDE_STATUSES.includes(currentRide.status)) return;
      refreshFareEstimate().catch(() => {});
    });
  });

  window.addEventListener('storage', event => {
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
  });
}

window.addEventListener('load', async () => {
  document.querySelectorAll('.premium-card').forEach((card, index) => {
    card.style.transitionDelay = `${index * 0.06}s`;
  });
  document.body.classList.add('is-ready');
  if (!setupSession()) return;
  setupHandlers();
  await initializeMap();
  await refreshFareEstimate();
  await syncRides();
  startRiderLocationSync();
  window.setInterval(() => {
    syncRides().catch(() => {});
  }, RIDE_POLL_INTERVAL_MS);
});
