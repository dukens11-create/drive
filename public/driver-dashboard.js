// ─── Constants ────────────────────────────────────────────────────────────────
const API_BASE_URL = '';
const REJECTED_RIDES_KEY = 'driverRejectedRideIds';
const DRIVER_DOCS_KEY = 'driverDashboardDocs';
const DRIVER_SUPPORT_KEY = 'driverDashboardSupportLog';
const ALERT_DISPLAY_DURATION = 4200;
const GPS_LOG_KEY = 'driverGpsLog';
const LAST_KNOWN_LOCATION_KEY = 'driverLastKnownLocation';
const MAX_GPS_LOG_ENTRIES = 200;
const ROUTE_CACHE_TTL_MS = 30000;

const DEFAULT_FALLBACK_LAT = 37.7749;
const DEFAULT_FALLBACK_LNG = -122.4194;
const DEFAULT_LOCATION_ACCURACY_M = 80;
const DEFAULT_LOCATION_SPEED_KMH = 40;

// Map projection constants
const BASE_PROJECTION_SCALE = 190;    // %/degree at reference zoom
const REFERENCE_ZOOM_LEVEL = 15;
const MIN_SCALE_MULTIPLIER = 0.25;
const MAX_SCALE_MULTIPLIER = 64;

// ─── Mock Data ────────────────────────────────────────────────────────────────
const MOCK_COMPLETED_RIDES = [
  { id: 'ride_hist_101', pickupLat: 37.775, pickupLng: -122.418, dropoffLat: 37.789, dropoffLng: -122.401, fareEstimate: 24.5, minutes: 21, passengerRating: 4.9, completedAt: '2026-05-31T10:12:00.000Z' },
  { id: 'ride_hist_102', pickupLat: 37.764, pickupLng: -122.431, dropoffLat: 37.752, dropoffLng: -122.447, fareEstimate: 18.75, minutes: 16, passengerRating: 4.7, completedAt: '2026-05-30T18:42:00.000Z' },
  { id: 'ride_hist_103', pickupLat: 37.781, pickupLng: -122.406, dropoffLat: 37.794, dropoffLng: -122.392, fareEstimate: 31.2, minutes: 27, passengerRating: 5, completedAt: '2026-05-29T07:58:00.000Z' }
];
const MOCK_NEARBY_REQUESTS = [
  { id: 'ride_live_201', pickupLat: 37.776, pickupLng: -122.419, dropoffLat: 37.792, dropoffLng: -122.408, fareEstimate: 22.4, minutes: 19, status: 'requested', passengerName: 'Ava J.', passengerRating: 4.8 },
  { id: 'ride_live_202', pickupLat: 37.771, pickupLng: -122.414, dropoffLat: 37.759, dropoffLng: -122.436, fareEstimate: 17.35, minutes: 14, status: 'requested', passengerName: 'Liam R.', passengerRating: 4.6 }
];

// Simulation waypoints (San Francisco loop)
const SIMULATION_WAYPOINTS = [
  { lat: 37.7749, lng: -122.4194 },
  { lat: 37.7761, lng: -122.4180 },
  { lat: 37.7775, lng: -122.4165 },
  { lat: 37.7790, lng: -122.4148 },
  { lat: 37.7805, lng: -122.4130 },
  { lat: 37.7820, lng: -122.4110 },
  { lat: 37.7808, lng: -122.4090 },
  { lat: 37.7792, lng: -122.4075 },
  { lat: 37.7776, lng: -122.4088 },
  { lat: 37.7762, lng: -122.4105 },
  { lat: 37.7749, lng: -122.4120 },
  { lat: 37.7749, lng: -122.4194 },
];

// ─── App State ────────────────────────────────────────────────────────────────
let currentUser = null;
let accessToken = null;
let currentProfile = null;
let nearbyRideRequests = [];
let completedRideHistory = [];
let selectedRideForDetails = null;
let alertTimeoutId = null;

let mapState = {
  zoom: 15,
  centerLat: NaN,
  centerLng: NaN,
  panX: 0,
  panY: 0,
  followMode: true,
  satelliteView: false,
  lastPosition: null,   // { lat, lng, accuracy, heading, speed, timestamp }
  prevPosition: null,   // previous fix for heading calculation
  locationPermissionState: 'prompt',
  updateFrequencyMs: 3000,
  lastUpdateAt: null,
  renderPending: false,
  isDragging: false,
  dragStartX: 0,
  dragStartY: 0,
};

let gpsWatchId = null;
let gpsPollIntervalId = null;
let gpsSimulationIntervalId = null;
let gpsSimulationIndex = 0;
let wakeLockSentinel = null;
let routeCache = { pickupEta: null, dropoffEta: null, pickupDistKm: null, dropoffDistKm: null, cachedAt: 0 };

// ─── Utilities ────────────────────────────────────────────────────────────────
function showAlert(kind, message) {
  const alertDiv = document.getElementById('driver-alert');
  alertDiv.className = `alert alert-${kind} floating-alert`;
  alertDiv.classList.remove('d-none');
  alertDiv.textContent = message;
  if (alertTimeoutId) clearTimeout(alertTimeoutId);
  alertTimeoutId = window.setTimeout(() => {
    alertDiv.classList.add('d-none');
  }, ALERT_DISPLAY_DURATION);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  let data;
  try {
    data = await response.json();
  } catch (_error) {
    throw new Error('Unexpected server response.');
  }
  return { response, data };
}

function getRejectedRideIds() {
  try {
    const parsed = JSON.parse(localStorage.getItem(REJECTED_RIDES_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch (_error) {
    return [];
  }
}

function setRejectedRideIds(ids) {
  localStorage.setItem(REJECTED_RIDES_KEY, JSON.stringify(ids));
}

function getStoredList(storageKey) {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch (_error) {
    return [];
  }
}

function setStoredList(storageKey, value) {
  localStorage.setItem(storageKey, JSON.stringify(value));
}

function getDriverDisplayName(email) {
  if (!email) return 'Driver';
  return email
    .split('@')[0]
    .split(/[._-]+/g)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatCoordinate(lat, lng) {
  if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) return 'Unknown location';
  return `${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)}`;
}

function getLastKnownLocation() {
  try {
    const raw = localStorage.getItem(LAST_KNOWN_LOCATION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Number.isFinite(parsed?.lat) && Number.isFinite(parsed?.lng)) return parsed;
  } catch (_e) { /* ignore */ }
  return null;
}

function saveLastKnownLocation(lat, lng, accuracy) {
  try {
    localStorage.setItem(LAST_KNOWN_LOCATION_KEY, JSON.stringify({ lat, lng, accuracy, savedAt: Date.now() }));
  } catch (_e) { /* ignore */ }
}

function normalizeRide(ride, index) {
  const pickupLat = Number(ride.pickupLat ?? ride.startLat);
  const pickupLng = Number(ride.pickupLng ?? ride.startLng);
  const dropoffLat = Number(ride.dropoffLat ?? ride.endLat);
  const dropoffLng = Number(ride.dropoffLng ?? ride.endLng);
  return {
    id: ride.id || `ride_mock_${index + 1}`,
    status: ride.status || 'requested',
    pickupLat: Number.isFinite(pickupLat) ? pickupLat : DEFAULT_FALLBACK_LAT,
    pickupLng: Number.isFinite(pickupLng) ? pickupLng : DEFAULT_FALLBACK_LNG,
    dropoffLat: Number.isFinite(dropoffLat) ? dropoffLat : DEFAULT_FALLBACK_LAT + 0.01,
    dropoffLng: Number.isFinite(dropoffLng) ? dropoffLng : DEFAULT_FALLBACK_LNG + 0.01,
    fareEstimate: Number(ride.fareEstimate || 0),
    minutes: Number(ride.minutes || 18),
    passengerRating: Number(ride.passengerRating || 4.8),
    passengerName: ride.passengerName || `Passenger ${index + 1}`,
    completedAt: ride.completedAt || ride.updatedAt || new Date().toISOString()
  };
}

// Minimum distance moved (km) before recalculating heading from GPS movement.
// Below this threshold (~3 m) the fix is considered stationary to prevent jitter.
const MIN_MOVEMENT_DISTANCE_KM = 0.003;
/**
 * Haversine great-circle distance in kilometres.
 */
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const toRad = deg => deg * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Bearing (0–360°) from point A to point B.
 */
function calculateHeading(lat1, lng1, lat2, lng2) {
  const toRad = deg => deg * Math.PI / 180;
  const toDeg = rad => rad * 180 / Math.PI;
  const dLng = toRad(lng2 - lng1);
  const y = Math.sin(dLng) * Math.cos(toRad(lat2));
  const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/**
 * ETA in minutes given distance (km) and speed (km/h, defaults to 40 km/h).
 */
function calculateETA(distanceKm, speedKmh) {
  const speed = (Number.isFinite(speedKmh) && speedKmh > 2) ? speedKmh : DEFAULT_LOCATION_SPEED_KMH;
  return (distanceKm / speed) * 60;
}

function formatEta(minutes) {
  if (!Number.isFinite(minutes) || minutes < 0) return '--';
  if (minutes < 1) return '< 1 min';
  const mins = Math.round(minutes);
  if (mins >= 60) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  }
  return `${mins} min`;
}

function formatDistance(km) {
  if (!Number.isFinite(km)) return '--';
  const miles = km * 0.621371;
  if (km < 1) return `${Math.round(km * 1000)} m / ${(miles * 5280).toFixed(0)} ft`;
  return `${km.toFixed(2)} km / ${miles.toFixed(2)} mi`;
}

function headingToCardinal(degrees) {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW', 'N'];
  return dirs[Math.round(degrees / 45) % 8];
}

function getGeolocationOptions() {
  return { enableHighAccuracy: true, timeout: 8000, maximumAge: mapState.updateFrequencyMs };
}

// ─── GPS Log ──────────────────────────────────────────────────────────────────
function appendGpsLogEntry(lat, lng, accuracy, heading, speed) {
  const now = new Date().toISOString();
  const entry = { lat: +lat.toFixed(6), lng: +lng.toFixed(6), accuracy: Math.round(accuracy || 0), heading: Math.round(heading || 0), speed: +(speed || 0).toFixed(1), ts: now };
  // In-memory log display
  const logDiv = document.getElementById('gps-log');
  if (logDiv) {
    const line = document.createElement('div');
    line.textContent = `${now.slice(11, 19)} | ${lat.toFixed(5)},${lng.toFixed(5)} | acc:${Math.round(accuracy || 0)}m | hdg:${Math.round(heading || 0)}° | ${(speed || 0).toFixed(1)} km/h`;
    logDiv.prepend(line);
    // Keep at most 50 lines visible
    while (logDiv.children.length > 50) logDiv.lastChild.remove();
  }
  // Persist to localStorage
  try {
    const log = getStoredList(GPS_LOG_KEY);
    log.unshift(entry);
    if (log.length > MAX_GPS_LOG_ENTRIES) log.length = MAX_GPS_LOG_ENTRIES;
    setStoredList(GPS_LOG_KEY, log);
  } catch (_e) { /* quota exceeded – ignore */ }
}

// ─── Route Estimation ─────────────────────────────────────────────────────────
async function fetchRouteEstimate(originLat, originLng, destLat, destLng) {
  // Attempt Google Maps Directions API (requires API key exposed in env).
  // Falls back to haversine estimate without network call.
  const apiKey = typeof window !== 'undefined' && window.GOOGLE_MAPS_API_KEY;
  if (apiKey) {
    try {
      const origin = `${originLat},${originLng}`;
      const dest = `${destLat},${destLng}`;
      // NOTE: Google Maps Directions API keys used here are browser-restricted
      // (HTTP referrer rules) and only read public map data. For stricter
      // environments, proxy this request through /api/route-estimate instead.
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(dest)}&mode=driving&key=${encodeURIComponent(apiKey)}`;
      const { data } = await fetchJson(url, {});
      if (data?.routes?.[0]?.legs?.[0]) {
        const leg = data.routes[0].legs[0];
        const distKm = (leg.distance?.value || 0) / 1000;
        const durMin = (leg.duration?.value || 0) / 60;
        return { distKm, etaMin: durMin };
      }
    } catch (_e) { /* fall through to haversine */ }
  }
  const distKm = calculateDistance(originLat, originLng, destLat, destLng);
  const speedKmh = mapState.lastPosition?.speed > 2 ? mapState.lastPosition.speed : DEFAULT_LOCATION_SPEED_KMH;
  return { distKm, etaMin: calculateETA(distKm, speedKmh) };
}

async function recalculateRouteData() {
  const driverLat = mapState.lastPosition?.lat ?? Number(currentProfile?.lat);
  const driverLng = mapState.lastPosition?.lng ?? Number(currentProfile?.lng);
  if (!Number.isFinite(driverLat) || !Number.isFinite(driverLng)) return;

  const now = Date.now();
  if (now - routeCache.cachedAt < ROUTE_CACHE_TTL_MS) {
    updateMapUiReadouts();
    return;
  }

  const trackedRide = selectedRideForDetails || nearbyRideRequests[0] || null;
  if (!trackedRide) {
    routeCache = { pickupEta: null, dropoffEta: null, pickupDistKm: null, dropoffDistKm: null, cachedAt: now };
    updateMapUiReadouts();
    return;
  }

  try {
    const pickupResult = await fetchRouteEstimate(driverLat, driverLng, trackedRide.pickupLat, trackedRide.pickupLng);
    routeCache.pickupDistKm = pickupResult.distKm;
    routeCache.pickupEta = pickupResult.etaMin;

    const dropoffResult = await fetchRouteEstimate(trackedRide.pickupLat, trackedRide.pickupLng, trackedRide.dropoffLat, trackedRide.dropoffLng);
    routeCache.dropoffDistKm = dropoffResult.distKm;
    routeCache.dropoffEta = dropoffResult.etaMin;

    routeCache.cachedAt = Date.now();
  } catch (_e) {
    // Keep previous cache values
  }
  updateMapUiReadouts();
}

// ─── Map UI Readouts ──────────────────────────────────────────────────────────
function updateMapUiReadouts() {
  const pos = mapState.lastPosition;

  // Speed
  const speedEl = document.getElementById('gps-speed');
  if (speedEl) {
    const kmh = pos?.speed ?? 0;
    speedEl.textContent = `${kmh.toFixed(1)} km/h`;
  }

  // Accuracy
  const accEl = document.getElementById('gps-accuracy');
  if (accEl) {
    const acc = pos?.accuracy;
    if (Number.isFinite(acc)) {
      accEl.textContent = `±${Math.round(acc)} m`;
    } else {
      accEl.textContent = '--';
    }
  }

  // GPS Signal
  const sigEl = document.getElementById('gps-signal');
  if (sigEl && pos) {
    const acc = pos.accuracy || 999;
    if (acc <= 10) { sigEl.textContent = 'Excellent'; sigEl.className = 'gps-good'; }
    else if (acc <= 30) { sigEl.textContent = 'Good'; sigEl.className = 'gps-good'; }
    else if (acc <= 80) { sigEl.textContent = 'Fair'; sigEl.className = 'gps-medium'; }
    else { sigEl.textContent = 'Poor'; sigEl.className = 'gps-poor'; }
  } else if (sigEl) {
    sigEl.textContent = mapState.locationPermissionState === 'denied' ? 'Denied' : 'Waiting…';
    sigEl.className = '';
  }

  // Last update
  const updEl = document.getElementById('last-update');
  if (updEl && mapState.lastUpdateAt) {
    const secs = Math.round((Date.now() - mapState.lastUpdateAt) / 1000);
    updEl.textContent = secs < 5 ? 'Just now' : `${secs}s ago`;
  }

  // ETA
  const etaPickupEl = document.getElementById('eta-pickup');
  if (etaPickupEl) etaPickupEl.textContent = formatEta(routeCache.pickupEta);

  const etaDropoffEl = document.getElementById('eta-dropoff');
  if (etaDropoffEl) etaDropoffEl.textContent = formatEta(routeCache.dropoffEta);

  // Distance
  const distPickupEl = document.getElementById('distance-pickup');
  if (distPickupEl) distPickupEl.textContent = formatDistance(routeCache.pickupDistKm);

  const distDropoffEl = document.getElementById('distance-dropoff');
  if (distDropoffEl) distDropoffEl.textContent = formatDistance(routeCache.dropoffDistKm);

  // Heading / Compass
  const heading = pos?.heading;
  const compassEl = document.getElementById('compass-indicator');
  const headingTextEl = document.getElementById('heading-text');
  if (compassEl && Number.isFinite(heading)) {
    compassEl.textContent = headingToCardinal(heading);
    compassEl.style.transform = `rotate(${heading}deg)`;
  }
  if (headingTextEl) {
    headingTextEl.textContent = Number.isFinite(heading) ? `Heading: ${Math.round(heading)}°` : 'Heading: --°';
  }
}

// ─── Map Rendering ────────────────────────────────────────────────────────────
function roundCoord(value) {
  return Math.round(Number(value) * 1e5) / 1e5;
}

function queueMapRender() {
  if (mapState.renderPending) return;
  mapState.renderPending = true;
  requestAnimationFrame(() => {
    mapState.renderPending = false;
    renderMap();
  });
}

function renderMap() {
  const mapShell = document.getElementById('map-shell');
  const caption = document.getElementById('map-caption');
  const routeLayer = document.getElementById('map-route-layer');
  if (!mapShell || !caption || !routeLayer) return;

  // Satellite toggle class
  mapShell.classList.toggle('satellite-view', mapState.satelliteView);

  // Clear dynamic DOM elements and SVG route paths
  mapShell.querySelectorAll('.map-dynamic').forEach(node => node.remove());
  routeLayer.innerHTML = '';

  const driverLat = Number(mapState.lastPosition?.lat ?? currentProfile?.lat);
  const driverLng = Number(mapState.lastPosition?.lng ?? currentProfile?.lng);
  const hasDriverLocation = Number.isFinite(driverLat) && Number.isFinite(driverLng);

  // Initialise map centre on first render
  if (!Number.isFinite(mapState.centerLat) || !Number.isFinite(mapState.centerLng)) {
    const fallback = getLastKnownLocation() || { lat: DEFAULT_FALLBACK_LAT, lng: DEFAULT_FALLBACK_LNG };
    mapState.centerLat = hasDriverLocation ? driverLat : fallback.lat;
    mapState.centerLng = hasDriverLocation ? driverLng : fallback.lng;
  }

  // Follow mode: keep driver centred
  if (hasDriverLocation && mapState.followMode) {
    mapState.centerLat = driverLat;
    mapState.centerLng = driverLng;
    mapState.panX = 0;
    mapState.panY = 0;
  }

  // Projection helper: lat/lng → {left%, top%}
  // 50% is the map centre; -5/105 allow markers to render just outside the
  // visible area so they don't abruptly appear/disappear at the edge.
  const MAP_CENTER_PCT = 50;
  const MAP_OVERFLOW_MIN = -5;
  const MAP_OVERFLOW_MAX = 105;
  const scale = BASE_PROJECTION_SCALE * Math.max(MIN_SCALE_MULTIPLIER, Math.min(MAX_SCALE_MULTIPLIER, 2 ** (mapState.zoom - REFERENCE_ZOOM_LEVEL)));
  function project(lat, lng) {
    const left = MAP_CENTER_PCT + ((Number(lng) - mapState.centerLng) * scale) + mapState.panX;
    const top = MAP_CENTER_PCT - ((Number(lat) - mapState.centerLat) * scale) + mapState.panY;
    return { left: Math.max(MAP_OVERFLOW_MIN, Math.min(MAP_OVERFLOW_MAX, left)), top: Math.max(MAP_OVERFLOW_MIN, Math.min(MAP_OVERFLOW_MAX, top)) };
  }

  const trackedRide = selectedRideForDetails || nearbyRideRequests[0] || null;

  // ── Draw route polylines ──────────────────────────────────────────────────
  if (hasDriverLocation && trackedRide) {
    const driverPt = project(driverLat, driverLng);
    const pickupPt = project(trackedRide.pickupLat, trackedRide.pickupLng);
    const dropoffPt = project(trackedRide.dropoffLat, trackedRide.dropoffLng);

    // Driver → Pickup (blue)
    const toPickup = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    toPickup.setAttribute('x1', `${driverPt.left}%`);
    toPickup.setAttribute('y1', `${driverPt.top}%`);
    toPickup.setAttribute('x2', `${pickupPt.left}%`);
    toPickup.setAttribute('y2', `${pickupPt.top}%`);
    toPickup.setAttribute('stroke', '#0d6efd');
    toPickup.setAttribute('stroke-width', '2.5');
    toPickup.setAttribute('stroke-dasharray', '6 4');
    toPickup.setAttribute('stroke-linecap', 'round');
    routeLayer.appendChild(toPickup);

    // Pickup → Dropoff (green)
    const toDropoff = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    toDropoff.setAttribute('x1', `${pickupPt.left}%`);
    toDropoff.setAttribute('y1', `${pickupPt.top}%`);
    toDropoff.setAttribute('x2', `${dropoffPt.left}%`);
    toDropoff.setAttribute('y2', `${dropoffPt.top}%`);
    toDropoff.setAttribute('stroke', '#198754');
    toDropoff.setAttribute('stroke-width', '2.5');
    toDropoff.setAttribute('stroke-linecap', 'round');
    routeLayer.appendChild(toDropoff);
  }

  // ── Accuracy circle ───────────────────────────────────────────────────────
  const accuracy = mapState.lastPosition?.accuracy;
  if (hasDriverLocation && Number.isFinite(accuracy) && accuracy > 0) {
    const driverPt = project(driverLat, driverLng);
    // accuracy in metres → degrees → scaled percentage
    const accDeg = accuracy / 111000;
    const accPct = accDeg * scale * 2; // diameter in %
    const circle = document.createElement('div');
    circle.className = 'accuracy-circle map-dynamic';
    circle.style.left = `${driverPt.left}%`;
    circle.style.top = `${driverPt.top}%`;
    circle.style.width = `${accPct}%`;
    circle.style.height = `${accPct}%`;
    mapShell.appendChild(circle);
  }

  // ── Driver marker ─────────────────────────────────────────────────────────
  const driverPt = project(
    hasDriverLocation ? driverLat : DEFAULT_FALLBACK_LAT,
    hasDriverLocation ? driverLng : DEFAULT_FALLBACK_LNG
  );
  const driverDot = document.createElement('div');
  driverDot.className = 'point-driver map-dynamic';
  driverDot.title = hasDriverLocation ? `You: ${formatCoordinate(driverLat, driverLng)}` : 'Your location (estimated)';
  driverDot.style.left = `${driverPt.left}%`;
  driverDot.style.top = `${driverPt.top}%`;
  mapShell.appendChild(driverDot);

  // Direction arrow (rotated to show heading)
  const heading = mapState.lastPosition?.heading;
  if (Number.isFinite(heading)) {
    const arrow = document.createElement('div');
    arrow.className = 'driver-arrow map-dynamic';
    // Position arrow just above the driver dot
    arrow.style.left = `${driverPt.left}%`;
    arrow.style.top = `${driverPt.top}%`;
    arrow.style.transform = `translate(-50%, calc(-100% - 10px)) rotate(${heading}deg)`;
    mapShell.appendChild(arrow);
  }

  // ── Pickup pin ────────────────────────────────────────────────────────────
  if (trackedRide) {
    const pickupPt = project(trackedRide.pickupLat, trackedRide.pickupLng);
    const pickupPin = document.createElement('div');
    pickupPin.className = 'point-pickup map-dynamic';
    pickupPin.title = `Pickup: ${formatCoordinate(trackedRide.pickupLat, trackedRide.pickupLng)}`;
    pickupPin.style.left = `${pickupPt.left}%`;
    pickupPin.style.top = `${pickupPt.top}%`;
    mapShell.appendChild(pickupPin);

    const pickupLabel = document.createElement('div');
    pickupLabel.className = 'map-label map-dynamic';
    pickupLabel.textContent = 'Pickup';
    pickupLabel.style.left = `${pickupPt.left}%`;
    pickupLabel.style.top = `${pickupPt.top - 4}%`;
    mapShell.appendChild(pickupLabel);

    // ── Dropoff pin ─────────────────────────────────────────────────────────
    const dropoffPt = project(trackedRide.dropoffLat, trackedRide.dropoffLng);
    const dropoffPin = document.createElement('div');
    dropoffPin.className = 'point-dropoff map-dynamic';
    dropoffPin.title = `Dropoff: ${formatCoordinate(trackedRide.dropoffLat, trackedRide.dropoffLng)}`;
    dropoffPin.style.left = `${dropoffPt.left}%`;
    dropoffPin.style.top = `${dropoffPt.top}%`;
    mapShell.appendChild(dropoffPin);

    const dropoffLabel = document.createElement('div');
    dropoffLabel.className = 'map-label map-dynamic';
    dropoffLabel.textContent = 'Dropoff';
    dropoffLabel.style.left = `${dropoffPt.left}%`;
    dropoffLabel.style.top = `${dropoffPt.top - 4}%`;
    mapShell.appendChild(dropoffLabel);
  }

  // ── Nearby ride request dots ───────────────────────────────────────────────
  const rejected = new Set(getRejectedRideIds());
  nearbyRideRequests
    .filter(ride => !rejected.has(ride.id) && ride !== trackedRide)
    .slice(0, 8)
    .forEach(ride => {
      const pt = project(ride.pickupLat, ride.pickupLng);
      if (pt.left < -4 || pt.left > 104 || pt.top < -4 || pt.top > 104) return;
      const dot = document.createElement('div');
      dot.className = 'point-nearby map-dynamic';
      dot.title = `${ride.id} • ${formatCoordinate(ride.pickupLat, ride.pickupLng)}`;
      dot.style.left = `${pt.left}%`;
      dot.style.top = `${pt.top}%`;
      mapShell.appendChild(dot);
    });

  // ── Caption ───────────────────────────────────────────────────────────────
  if (hasDriverLocation) {
    caption.textContent = `Driver at ${formatCoordinate(roundCoord(driverLat), roundCoord(driverLng))} · ${nearbyRideRequests.length} nearby request(s) · Zoom ${mapState.zoom}`;
  } else {
    caption.textContent = `Location pending · ${nearbyRideRequests.length} nearby request(s) (mock data)`;
  }
}

// ─── GPS Tracking ─────────────────────────────────────────────────────────────
async function handlePositionUpdate(positionLike) {
  const lat = Number(positionLike.coords?.latitude ?? positionLike.lat);
  const lng = Number(positionLike.coords?.longitude ?? positionLike.lng);
  const accuracy = Number(positionLike.coords?.accuracy ?? positionLike.accuracy ?? DEFAULT_LOCATION_ACCURACY_M);
  const rawSpeed = positionLike.coords?.speed;  // m/s or null
  const rawHeading = positionLike.coords?.heading; // degrees or null

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

  // Speed in km/h
  const speedKmh = (Number.isFinite(rawSpeed) && rawSpeed >= 0) ? rawSpeed * 3.6 : (mapState.lastPosition?.speed ?? 0);

  // Heading: prefer native GPS heading when moving, else calculate from movement
  let heading = (Number.isFinite(rawHeading) && rawHeading >= 0 && speedKmh > 1) ? rawHeading : null;
  if (heading === null && mapState.lastPosition) {
    const prev = mapState.lastPosition;
    const dist = calculateDistance(prev.lat, prev.lng, lat, lng);
    if (dist > MIN_MOVEMENT_DISTANCE_KM) {
      heading = calculateHeading(prev.lat, prev.lng, lat, lng);
    } else {
      heading = prev.heading;
    }
  }

  mapState.prevPosition = mapState.lastPosition;
  mapState.lastPosition = { lat, lng, accuracy, heading: heading ?? 0, speed: speedKmh, timestamp: Date.now() };
  mapState.lastUpdateAt = Date.now();
  mapState.locationPermissionState = 'granted';

  // Persist for offline fallback
  saveLastKnownLocation(lat, lng, accuracy);

  // Update profile coords
  currentProfile = { ...(currentProfile || {}), lat, lng };

  // Log the fix
  appendGpsLogEntry(lat, lng, accuracy, heading ?? 0, speedKmh);

  // Sync location to backend (fire-and-forget)
  syncDriverLocation(lat, lng, accuracy).catch(() => {});

  // Recalculate route / ETA (respects cache TTL)
  recalculateRouteData().catch(() => {});

  // Re-render map
  queueMapRender();
  updateMapUiReadouts();
}

function handleGeoError(error) {
  if (error?.code === 1) {
    mapState.locationPermissionState = 'denied';
    showAlert('warning', 'Location permission denied. Enable GPS permissions to track rides.');
    return;
  }
  if (error?.code === 2) {
    showAlert('warning', 'GPS position unavailable. Retrying…');
  } else {
    showAlert('warning', 'GPS signal lost. Retrying location updates…');
  }
  // Fall back to last known location for map display
  const fallback = getLastKnownLocation();
  if (fallback && !mapState.lastPosition) {
    mapState.lastPosition = { lat: fallback.lat, lng: fallback.lng, accuracy: fallback.accuracy ?? DEFAULT_LOCATION_ACCURACY_M, heading: 0, speed: 0, timestamp: Date.now() };
    queueMapRender();
  }
}

async function startLocationTracking() {
  if (!navigator.geolocation) {
    showAlert('warning', 'Geolocation is unavailable on this browser.');
    return;
  }
  if (gpsWatchId !== null) return; // already tracking

  // Check/request permission
  try {
    if (navigator.permissions?.query) {
      const perm = await navigator.permissions.query({ name: 'geolocation' });
      mapState.locationPermissionState = perm.state;
      perm.onchange = () => {
        mapState.locationPermissionState = perm.state;
        if (perm.state === 'denied') {
          showAlert('warning', 'Location access denied. Tracking paused.');
          stopLocationTracking();
        } else if (perm.state === 'granted') {
          startLocationTracking();
        }
      };
    }
  } catch (_e) {
    mapState.locationPermissionState = 'prompt';
  }

  // Primary: continuous watchPosition
  gpsWatchId = navigator.geolocation.watchPosition(handlePositionUpdate, handleGeoError, getGeolocationOptions());

  // Secondary: polling interval for browsers that throttle watchPosition
  gpsPollIntervalId = window.setInterval(() => {
    navigator.geolocation.getCurrentPosition(handlePositionUpdate, handleGeoError, getGeolocationOptions());
  }, mapState.updateFrequencyMs);
}

function stopLocationTracking() {
  if (gpsWatchId !== null) {
    navigator.geolocation.clearWatch(gpsWatchId);
    gpsWatchId = null;
  }
  if (gpsPollIntervalId !== null) {
    window.clearInterval(gpsPollIntervalId);
    gpsPollIntervalId = null;
  }
}

async function refreshTrackingFrequency() {
  if (gpsWatchId === null) return;
  stopLocationTracking();
  await startLocationTracking();
}

async function ensureDriverLocation() {
  // If we already have a live position, nothing to do
  if (mapState.lastPosition) return;

  // Try last known from storage
  const stored = getLastKnownLocation();
  const fallback = stored || { lat: DEFAULT_FALLBACK_LAT, lng: DEFAULT_FALLBACK_LNG, accuracy: DEFAULT_LOCATION_ACCURACY_M };

  // One-shot current position with short timeout
  if (navigator.geolocation) {
    try {
      const coords = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          p => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
          err => {
            if (err?.code === 1) mapState.locationPermissionState = 'denied';
            reject(err);
          },
          { enableHighAccuracy: true, timeout: 5000, maximumAge: 10000 }
        );
      });
      await handlePositionUpdate({ coords: { latitude: coords.lat, longitude: coords.lng, accuracy: coords.accuracy, speed: null, heading: null } });
      return;
    } catch (_e) { /* fall through to fallback */ }
  }

  // Use fallback coords so map renders immediately
  mapState.centerLat = fallback.lat;
  mapState.centerLng = fallback.lng;
  currentProfile = { ...(currentProfile || {}), lat: fallback.lat, lng: fallback.lng };
  queueMapRender();
}

// ─── GPS Simulation ───────────────────────────────────────────────────────────
function toggleGpsSimulation() {
  const btn = document.getElementById('simulate-gps-button');
  if (gpsSimulationIntervalId !== null) {
    window.clearInterval(gpsSimulationIntervalId);
    gpsSimulationIntervalId = null;
    gpsSimulationIndex = 0;
    if (btn) { btn.innerHTML = '<i class="bi bi-play-circle"></i> Simulate GPS'; btn.classList.replace('btn-warning', 'btn-outline-warning'); }
    showAlert('info', 'GPS simulation stopped.');
    return;
  }

  showAlert('info', 'GPS simulation started — driving through San Francisco.');
  if (btn) { btn.innerHTML = '<i class="bi bi-stop-circle"></i> Stop Simulation'; btn.classList.replace('btn-outline-warning', 'btn-warning'); }

  gpsSimulationIntervalId = window.setInterval(() => {
    const wp = SIMULATION_WAYPOINTS[gpsSimulationIndex % SIMULATION_WAYPOINTS.length];
    const next = SIMULATION_WAYPOINTS[(gpsSimulationIndex + 1) % SIMULATION_WAYPOINTS.length];
    gpsSimulationIndex++;

    // Interpolate partway towards next waypoint for smoother movement
    const lat = wp.lat + (next.lat - wp.lat) * 0.5;
    const lng = wp.lng + (next.lng - wp.lng) * 0.5;
    const accuracy = 5 + Math.random() * 10;
    const speed = 25 + Math.random() * 20; // 25–45 km/h
    const heading = calculateHeading(wp.lat, wp.lng, next.lat, next.lng);

    handlePositionUpdate({
      coords: {
        latitude: lat, longitude: lng, accuracy,
        speed: speed / 3.6, // m/s
        heading
      }
    });
  }, mapState.updateFrequencyMs);
}

// ─── Wake Lock ────────────────────────────────────────────────────────────────
async function requestWakeLock() {
  if (!('wakeLock' in navigator)) return;
  try {
    if (wakeLockSentinel && !wakeLockSentinel.released) return;
    wakeLockSentinel = await navigator.wakeLock.request('screen');
    wakeLockSentinel.addEventListener('release', () => { wakeLockSentinel = null; });
  } catch (_e) { /* not critical */ }
}

// ─── Backend Sync ─────────────────────────────────────────────────────────────
async function syncDriverLocation(lat, lng, accuracy) {
  if (!accessToken) return;
  await fetchJson(`${API_BASE_URL}/api/drivers/location`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + accessToken },
    body: JSON.stringify({ lat, lng, accuracy })
  });
}

// ─── Profile & Availability ───────────────────────────────────────────────────
function getCurrentAvailability() {
  return currentProfile?.availabilityStatus || 'offline';
}

function renderDashboardSummary() {
  const requestsCount = nearbyRideRequests.length;
  const nearbyCount = document.getElementById('nearby-requests-count');
  const liveSummaryPill = document.getElementById('live-summary-pill');
  const focusHeadline = document.getElementById('focus-headline');
  if (nearbyCount) nearbyCount.textContent = `${requestsCount} live request${requestsCount === 1 ? '' : 's'}`;
  if (liveSummaryPill) liveSummaryPill.innerHTML = `<i class="bi bi-lightning-charge"></i>&nbsp; ${requestsCount} active request${requestsCount === 1 ? '' : 's'}`;
  if (focusHeadline) focusHeadline.textContent = requestsCount ? `${requestsCount} nearby request${requestsCount === 1 ? '' : 's'}` : 'Monitoring local demand';
}

function renderAvailabilityControls() {
  const availability = getCurrentAvailability();
  const pill = document.getElementById('availability-pill');
  const button = document.getElementById('toggle-availability-button');
  const statusHeadline = document.getElementById('status-headline');
  const isOnline = availability === 'online';
  pill.textContent = `Availability: ${availability.toUpperCase()}`;
  pill.dataset.state = isOnline ? 'online' : 'offline';
  button.dataset.state = isOnline ? 'online' : 'offline';
  button.innerHTML = isOnline
    ? '<i class="bi bi-pause-circle"></i> Go Offline'
    : '<i class="bi bi-broadcast"></i> Go Online';
  if (statusHeadline) {
    statusHeadline.textContent = isOnline ? 'Ready to accept trips' : 'Offline standby';
  }
}

function renderProfile() {
  const profileDiv = document.getElementById('profile-info');
  if (!currentProfile) {
    profileDiv.innerHTML = '<div class="profile-card-item text-danger">Unable to load driver profile.</div>';
    return;
  }

  const driverDisplayName = getDriverDisplayName(currentUser.email);
  profileDiv.innerHTML = `
    <div class="profile-card-item">
      <span class="metric-label">Driver</span>
      <strong>${escapeHtml(driverDisplayName)}</strong>
    </div>
    <div class="profile-grid">
      <div class="profile-card-item">
        <span class="metric-label">User ID</span>
        <strong>${escapeHtml(currentProfile.userId || currentUser.id || 'N/A')}</strong>
      </div>
      <div class="profile-card-item">
        <span class="metric-label">Rating</span>
        <strong>${escapeHtml(currentProfile.rating ?? 'N/A')}</strong>
      </div>
      <div class="profile-card-item">
        <span class="metric-label">Email</span>
        <strong>${escapeHtml(currentUser.email || 'N/A')}</strong>
      </div>
      <div class="profile-card-item">
        <span class="metric-label">Status</span>
        <strong>${escapeHtml(currentProfile.availabilityStatus || 'offline')}</strong>
      </div>
    </div>
  `;
}

async function loadDriverProfile() {
  try {
    const { data } = await fetchJson(`${API_BASE_URL}/api/drivers/me`, {
      headers: { Authorization: 'Bearer ' + accessToken }
    });
    if (!data?.ok) {
      currentProfile = null;
      renderProfile();
      return;
    }
    currentProfile = data.profile || {};
    renderProfile();
    renderAvailabilityControls();
  } catch (_error) {
    currentProfile = null;
    renderProfile();
  }
}

// ─── Ride Rendering ───────────────────────────────────────────────────────────
function renderAvailableRideRequests() {
  const listDiv = document.getElementById('available-rides');
  const rejected = new Set(getRejectedRideIds());
  const rides = nearbyRideRequests.filter(ride => !rejected.has(ride.id));

  if (!rides.length) {
    listDiv.innerHTML = '<div class="text-muted">No available ride requests right now.</div>';
    renderDashboardSummary();
    queueMapRender();
    return;
  }

  listDiv.innerHTML = rides.map(ride => `
    <div class="ride-item">
      <div class="ride-item-top">
        <div>
          <div class="ride-passenger">${escapeHtml(ride.passengerName || 'Passenger')}</div>
          <div class="ride-id">${escapeHtml(ride.id)} &bull; ${Number(ride.passengerRating || 0).toFixed(1)} &star;</div>
        </div>
        <span class="ride-status">${escapeHtml(ride.status)}</span>
      </div>
      <div class="ride-route">
        <span><i class="bi bi-geo-alt"></i> Pickup</span>
        <strong>${escapeHtml(formatCoordinate(ride.pickupLat, ride.pickupLng))}</strong>
      </div>
      <div class="ride-route">
        <span><i class="bi bi-pin-map"></i> Dropoff</span>
        <strong>${escapeHtml(formatCoordinate(ride.dropoffLat, ride.dropoffLng))}</strong>
      </div>
      <div class="ride-footer mt-3">
        <div class="status-stack">
          <div class="ride-meta">
            <span>Est. fare</span>
            <strong>$${Number(ride.fareEstimate || 0).toFixed(2)}</strong>
          </div>
          <div class="ride-meta">
            <span>ETA</span>
            <strong>${Number(ride.minutes || 0)} mins</strong>
          </div>
        </div>
        <button class="secondary-action choose-ride-button" data-ride-id="${escapeHtml(ride.id)}">Use Ride ID</button>
      </div>
    </div>
  `).join('');

  listDiv.querySelectorAll('.choose-ride-button').forEach(button => {
    button.addEventListener('click', () => {
      const rideIdInput = document.getElementById('ride-id-input');
      rideIdInput.value = button.getAttribute('data-ride-id') || '';
      rideIdInput.focus();
    });
  });

  queueMapRender();
}

async function loadAvailableRideRequests() {
  try {
    const { data } = await fetchJson(`${API_BASE_URL}/api/rides/history`, {
      headers: { Authorization: 'Bearer ' + accessToken }
    });
    if (data?.ok && Array.isArray(data.rides)) {
      nearbyRideRequests = data.rides
        .filter(ride => ['requested', 'accepted', 'started'].includes(ride.status))
        .map(normalizeRide);
    } else {
      nearbyRideRequests = [];
    }
  } catch (_error) {
    nearbyRideRequests = [];
  }

  if (!nearbyRideRequests.length) nearbyRideRequests = MOCK_NEARBY_REQUESTS.map(normalizeRide);
  renderAvailableRideRequests();
}

function renderRideHistory() {
  const body = document.getElementById('ride-history-body');
  if (!completedRideHistory.length) {
    body.innerHTML = '<tr><td colspan="6" class="text-muted">No completed rides yet.</td></tr>';
    return;
  }

  body.innerHTML = completedRideHistory.map(ride => `
    <tr>
      <td>${escapeHtml(ride.id)}</td>
      <td>${escapeHtml(formatCoordinate(ride.pickupLat, ride.pickupLng))}</td>
      <td>${escapeHtml(formatCoordinate(ride.dropoffLat, ride.dropoffLng))}</td>
      <td>$${Number(ride.fareEstimate || 0).toFixed(2)}</td>
      <td>${Number(ride.minutes || 0)} min</td>
      <td>${Number(ride.passengerRating || 0).toFixed(1)} ★</td>
    </tr>
  `).join('');
}

function renderPerformanceStats() {
  const container = document.getElementById('performance-stats');
  const allRides = [...nearbyRideRequests, ...completedRideHistory];
  const accepted = allRides.filter(ride => ['accepted', 'started', 'completed'].includes(ride.status)).length;
  const completed = allRides.filter(ride => ride.status === 'completed').length;
  const canceled = allRides.filter(ride => ride.status === 'canceled').length;
  const total = Math.max(allRides.length, 1);
  const averageRating = completedRideHistory.length
    ? completedRideHistory.reduce((sum, ride) => sum + Number(ride.passengerRating || 0), 0) / completedRideHistory.length
    : Number(currentProfile?.rating || 5);
  const recent = completedRideHistory.slice(0, 3).map(ride => Number(ride.passengerRating || 0));
  const trend = recent.length >= 2 && recent[0] >= recent[recent.length - 1] ? '↑ Improving' : '→ Stable';

  const stats = [
    { label: 'Acceptance Rate', value: `${Math.round((accepted / total) * 100)}%` },
    { label: 'Completion Rate', value: `${Math.round((completed / total) * 100)}%` },
    { label: 'Cancellation Rate', value: `${Math.round((canceled / total) * 100)}%` },
    { label: 'Average Rating Trend', value: `${averageRating.toFixed(2)} ★ ${trend}` }
  ];

  container.innerHTML = stats.map(stat => `
    <div class="metric-card ${stat.label === 'Average Rating Trend' ? 'highlight' : ''}">
      <div class="metric-label">${escapeHtml(stat.label)}</div>
      <div class="metric-value">${escapeHtml(stat.value)}</div>
    </div>
  `).join('');
}

async function loadRideHistory() {
  try {
    const { data } = await fetchJson(`${API_BASE_URL}/api/rides/history`, {
      headers: { Authorization: 'Bearer ' + accessToken }
    });
    if (data?.ok && Array.isArray(data.rides)) {
      completedRideHistory = data.rides.filter(ride => ride.status === 'completed').map(normalizeRide);
    } else {
      completedRideHistory = [];
    }
  } catch (_error) {
    completedRideHistory = [];
  }
  if (!completedRideHistory.length) completedRideHistory = MOCK_COMPLETED_RIDES.map(normalizeRide);
  renderRideHistory();
  renderPerformanceStats();
}

function getRideById(rideId) {
  return nearbyRideRequests.find(ride => ride.id === rideId) || completedRideHistory.find(ride => ride.id === rideId);
}

function renderRideDetailsModal(ride) {
  if (!ride) return;
  selectedRideForDetails = ride;
  const modal = document.getElementById('ride-details-modal');
  const content = document.getElementById('ride-details-content');
  content.innerHTML = `
    <div><strong>Passenger:</strong> ${escapeHtml(ride.passengerName || 'Guest Rider')}</div>
    <div><strong>Passenger Rating:</strong> ${Number(ride.passengerRating || 0).toFixed(1)} ★</div>
    <div><strong>Pickup:</strong> ${escapeHtml(formatCoordinate(ride.pickupLat, ride.pickupLng))}</div>
    <div><strong>Dropoff:</strong> ${escapeHtml(formatCoordinate(ride.dropoffLat, ride.dropoffLng))}</div>
    <div><strong>Estimated Fare:</strong> $${Number(ride.fareEstimate || 0).toFixed(2)}</div>
    <div><strong>Duration:</strong> ${Number(ride.minutes || 0)} mins</div>
  `;
  modal.classList.add('show');
  modal.setAttribute('aria-hidden', 'false');
  // Refresh route data for this ride
  routeCache.cachedAt = 0;
  recalculateRouteData().catch(() => {});
  queueMapRender();
}

function closeRideDetailsModal() {
  const modal = document.getElementById('ride-details-modal');
  modal.classList.remove('show');
  modal.setAttribute('aria-hidden', 'true');
  selectedRideForDetails = null;
  queueMapRender();
}

async function handleAcceptRide(event) {
  event.preventDefault();
  const rideIdInput = document.getElementById('ride-id-input');
  const rideId = rideIdInput.value.trim();
  if (!rideId) return;
  try {
    const { data } = await fetchJson(`${API_BASE_URL}/api/rides/accept`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + accessToken
      },
      body: JSON.stringify({ rideId })
    });
    if (!data?.ok) {
      showAlert('danger', data.error || 'Unable to accept ride.');
      return;
    }
    showAlert('success', `Ride ${rideId} accepted.`);
    const acceptedRide = getRideById(rideId) || normalizeRide({ id: rideId, status: 'accepted' }, 0);
    renderRideDetailsModal(acceptedRide);
    await Promise.all([loadAvailableRideRequests(), loadRideHistory(), loadEarnings()]);
    event.target.reset();
  } catch (_error) {
    showAlert('danger', 'Unable to accept ride.');
  }
}

function handleRejectRide() {
  const rideId = document.getElementById('ride-id-input').value.trim();
  if (!rideId) {
    showAlert('warning', 'Enter a ride ID to reject.');
    return;
  }
  const ids = getRejectedRideIds();
  if (!ids.includes(rideId)) ids.push(rideId);
  setRejectedRideIds(ids);
  showAlert('info', `Ride ${rideId} rejected from your local queue.`);
  renderAvailableRideRequests();
}

// ─── Earnings ─────────────────────────────────────────────────────────────────
async function loadEarnings() {
  const earningsDiv = document.getElementById('earnings-info');
  try {
    const { data } = await fetchJson(`${API_BASE_URL}/api/drivers/earnings`, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + accessToken }
    });
    const earningsCents = Number(data?.earningsCents);
    const rideCount = Number(data?.rideCount);
    if (!data?.ok || !Number.isFinite(earningsCents) || !Number.isFinite(rideCount)) {
      earningsDiv.innerHTML = '<div class="text-danger">Unable to load earnings.</div>';
      return;
    }
    const averagePayout = rideCount > 0 ? earningsCents / rideCount / 100 : 0;
    earningsDiv.innerHTML = `
      <div class="earnings-grid">
        <div class="metric-card highlight">
          <div class="metric-label">Total Earnings</div>
          <div class="metric-value">$${(earningsCents / 100).toFixed(2)}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Completed Ride Payouts</div>
          <div class="metric-value">${rideCount}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Average Payout</div>
          <div class="metric-value">$${averagePayout.toFixed(2)}</div>
        </div>
      </div>
    `;
  } catch (_error) {
    earningsDiv.innerHTML = '<div class="text-danger">Unable to load earnings.</div>';
  }
}

function setActivePane(pane) {
  document.querySelectorAll('.dashboard-pane').forEach(section => {
    section.classList.toggle('is-active', section.dataset.pane === pane);
  });
  document.querySelectorAll('.nav-tab').forEach(button => {
    button.classList.toggle('is-active', button.dataset.pane === pane);
  });
}
// ─── Documents ────────────────────────────────────────────────────────────────
function getDocumentStatus(expiryDate) {
  const now = new Date();
  const expiry = new Date(expiryDate);
  if (Number.isNaN(expiry.getTime())) return { text: 'Invalid expiry date', className: 'bg-secondary' };
  const days = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (days < 0) return { text: 'Expired', className: 'bg-danger' };
  if (days <= 30) return { text: `Expiring in ${days} day(s)`, className: 'bg-warning text-dark' };
  return { text: `Valid (${days} days left)`, className: 'bg-success' };
}

function renderDocumentList() {
  const docs = getStoredList(DRIVER_DOCS_KEY);
  const container = document.getElementById('document-list');
  if (!docs.length) {
    container.innerHTML = '<div class="text-muted">No documents uploaded yet.</div>';
    return;
  }
  container.innerHTML = docs.map(doc => {
    const status = getDocumentStatus(doc.expiryDate);
    return `
      <div class="ride-item">
        <div class="d-flex justify-content-between align-items-center">
          <strong>${escapeHtml(doc.type)}</strong>
          <span class="badge ${status.className}">${escapeHtml(status.text)}</span>
        </div>
        <div>File: ${escapeHtml(doc.fileName)}</div>
        <div>Expiry: ${escapeHtml(doc.expiryDate)}</div>
      </div>
    `;
  }).join('');
}

async function handleDocumentSubmit(event) {
  event.preventDefault();
  const type = document.getElementById('document-type').value;
  const expiryDate = document.getElementById('document-expiry').value;
  const fileInput = document.getElementById('document-file');
  const fileName = fileInput.files && fileInput.files.length ? fileInput.files[0].name : '';

  if (!fileName || !expiryDate) {
    showAlert('warning', 'Choose a document file and expiry date.');
    return;
  }

  const expiryDateValue = new Date(expiryDate);
  if (Number.isNaN(expiryDateValue.getTime())) {
    showAlert('warning', 'Provide a valid expiry date.');
    return;
  }

  const docs = getStoredList(DRIVER_DOCS_KEY);
  let docId = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}_${Math.random().toString(16).slice(2)}`;
  let attempt = 0;
  while (docs.some(doc => doc.id === docId) && attempt < 5) {
    docId = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    attempt += 1;
  }
  if (docs.some(doc => doc.id === docId)) docId = `${Date.now()}_${docs.length + 1}`;
  const nextDocs = [{ id: docId, type, expiryDate, fileName }, ...docs].slice(0, 15);
  setStoredList(DRIVER_DOCS_KEY, nextDocs);
  renderDocumentList();

  try {
    await fetchJson(`${API_BASE_URL}/api/drivers/documents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + accessToken
      },
      body: JSON.stringify({ documents: nextDocs.map(doc => `${doc.type}:${doc.expiryDate}:${doc.fileName}`) })
    });
  } catch (_error) {
    // local storage still provides a full mock workflow for dashboard testing
  }

  event.target.reset();
  showAlert('success', `${type} uploaded and tracked.`);
}

// ─── Support ──────────────────────────────────────────────────────────────────
function renderSupportLog() {
  const log = getStoredList(DRIVER_SUPPORT_KEY);
  const container = document.getElementById('support-log');
  if (!log.length) {
    container.innerHTML = '<div class="text-muted">No support messages yet.</div>';
    return;
  }
  container.innerHTML = log.map(entry => `
    <div class="mb-2">
      <div><strong>${escapeHtml(entry.author)}:</strong> ${escapeHtml(entry.message)}</div>
      <div class="text-muted small">${escapeHtml(entry.time)}</div>
    </div>
  `).join('');
}

function handleSupportSubmit(event) {
  event.preventDefault();
  const messageInput = document.getElementById('support-message');
  const message = messageInput.value.trim();
  if (!message) return;
  const now = new Date().toLocaleString();
  const log = getStoredList(DRIVER_SUPPORT_KEY);
  const nextLog = [
    { author: 'You', message, time: now },
    { author: 'Drive Support', message: 'Thanks! We received your request and will respond shortly.', time: now },
    ...log
  ].slice(0, 20);
  setStoredList(DRIVER_SUPPORT_KEY, nextLog);
  renderSupportLog();
  event.target.reset();
  showAlert('info', 'Support request sent.');
}

// ─── Availability ─────────────────────────────────────────────────────────────
async function toggleAvailability() {
  const current = getCurrentAvailability();
  const next = current === 'online' ? 'offline' : 'online';

  try {
    if (next === 'online') {
      await ensureDriverLocation();
      await startLocationTracking();
      await requestWakeLock();
    } else {
      stopLocationTracking();
    }
    const { data } = await fetchJson(`${API_BASE_URL}/api/drivers/availability`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + accessToken
      },
      body: JSON.stringify({ status: next })
    });
    if (!data?.ok) {
      showAlert('warning', data?.error || `Unable to go ${next}.`);
      return;
    }
    currentProfile = data.profile || currentProfile;
    renderProfile();
    renderAvailabilityControls();
    showAlert('success', `You are now ${next}.`);
  } catch (_error) {
    showAlert('danger', `Unable to go ${next}.`);
  }
}

// ─── Navigation Directions ────────────────────────────────────────────────────
function openDirections(kind) {
  if (!selectedRideForDetails) {
    showAlert('warning', 'Accept a ride first to open navigation.');
    return;
  }
  const pickupLat = Number(selectedRideForDetails.pickupLat);
  const pickupLng = Number(selectedRideForDetails.pickupLng);
  const dropoffLat = Number(selectedRideForDetails.dropoffLat);
  const dropoffLng = Number(selectedRideForDetails.dropoffLng);
  if (![pickupLat, pickupLng, dropoffLat, dropoffLng].every(Number.isFinite)) {
    showAlert('warning', 'Ride coordinates are unavailable for navigation.');
    return;
  }
  const pickup = `${pickupLat},${pickupLng}`;
  const dropoff = `${dropoffLat},${dropoffLng}`;
  const destination = kind === 'pickup' ? pickup : dropoff;
  const origin = kind === 'pickup' ? '' : `&origin=${encodeURIComponent(pickup)}`;
  const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}${origin}&travelmode=driving`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

// ─── Logout ───────────────────────────────────────────────────────────────────
function handleLogout() {
  stopLocationTracking();
  if (gpsSimulationIntervalId !== null) { window.clearInterval(gpsSimulationIntervalId); gpsSimulationIntervalId = null; }
  if (wakeLockSentinel && typeof wakeLockSentinel.release === 'function') wakeLockSentinel.release().catch(() => {});
  ['accessToken', 'refreshToken', 'user', 'drive.accessToken', 'drive.refreshToken', 'drive.user'].forEach(key => {
    localStorage.removeItem(key);
  });
  window.location.href = '/index.html';
}

// ─── Map Controls ─────────────────────────────────────────────────────────────
function setupMapControls() {
  // Follow mode toggle
  document.getElementById('follow-mode-button').addEventListener('click', () => {
    mapState.followMode = !mapState.followMode;
    const btn = document.getElementById('follow-mode-button');
    if (mapState.followMode) {
      btn.innerHTML = '<i class="bi bi-geo-alt-fill"></i> Follow: ON';
      btn.classList.replace('btn-outline-primary', 'btn-primary');
      mapState.panX = 0;
      mapState.panY = 0;
    } else {
      btn.innerHTML = '<i class="bi bi-geo-alt"></i> Follow: OFF';
      btn.classList.replace('btn-primary', 'btn-outline-primary');
    }
    queueMapRender();
  });

  // Satellite toggle
  document.getElementById('satellite-toggle-button').addEventListener('click', () => {
    mapState.satelliteView = !mapState.satelliteView;
    const btn = document.getElementById('satellite-toggle-button');
    btn.classList.toggle('btn-secondary', mapState.satelliteView);
    btn.classList.toggle('btn-outline-secondary', !mapState.satelliteView);
    queueMapRender();
  });

  // Zoom in
  document.getElementById('zoom-in-button').addEventListener('click', () => {
    mapState.zoom = Math.min(20, mapState.zoom + 1);
    queueMapRender();
  });

  // Zoom out
  document.getElementById('zoom-out-button').addEventListener('click', () => {
    mapState.zoom = Math.max(10, mapState.zoom - 1);
    queueMapRender();
  });

  // Mouse wheel zoom on map
  document.getElementById('map-shell').addEventListener('wheel', event => {
    event.preventDefault();
    mapState.zoom = Math.max(10, Math.min(20, mapState.zoom + (event.deltaY < 0 ? 1 : -1)));
    queueMapRender();
  }, { passive: false });

  // Pan by dragging
  const shell = document.getElementById('map-shell');
  shell.addEventListener('mousedown', event => {
    mapState.isDragging = true;
    mapState.dragStartX = event.clientX;
    mapState.dragStartY = event.clientY;
    shell.style.cursor = 'grabbing';
    mapState.followMode = false;
    const btn = document.getElementById('follow-mode-button');
    btn.innerHTML = '<i class="bi bi-geo-alt"></i> Follow: OFF';
    btn.classList.replace('btn-primary', 'btn-outline-primary');
  });
  window.addEventListener('mousemove', event => {
    if (!mapState.isDragging) return;
    mapState.panX += event.clientX - mapState.dragStartX;
    mapState.panY += event.clientY - mapState.dragStartY;
    mapState.dragStartX = event.clientX;
    mapState.dragStartY = event.clientY;
    queueMapRender();
  });
  window.addEventListener('mouseup', () => {
    mapState.isDragging = false;
    shell.style.cursor = 'grab';
  });

  // Update frequency
  document.getElementById('update-frequency-input').addEventListener('change', event => {
    mapState.updateFrequencyMs = Number(event.target.value) || 3000;
    routeCache.cachedAt = 0;
    refreshTrackingFrequency().catch(() => {});
    showAlert('info', `GPS update interval set to ${mapState.updateFrequencyMs / 1000}s.`);
  });

  // GPS simulation
  document.getElementById('simulate-gps-button').addEventListener('click', toggleGpsSimulation);
}

// ─── Periodic UI Refresh ──────────────────────────────────────────────────────
function startUiRefreshLoop() {
  // Refresh "X seconds ago" timestamps every 5 s
  window.setInterval(() => {
    if (mapState.lastUpdateAt) updateMapUiReadouts();
  }, 5000);
}

// ─── Page Lifecycle ───────────────────────────────────────────────────────────
window.addEventListener('load', async () => {
  accessToken = localStorage.getItem('accessToken');
  const userStr = localStorage.getItem('user');
  if (!accessToken || !userStr) {
    window.location.href = '/index.html';
    return;
  }

  try {
    currentUser = JSON.parse(userStr);
  } catch (_error) {
    handleLogout();
    return;
  }

  if (currentUser.role !== 'driver') {
    window.location.replace('/dashboard.html');
    return;
  }

  // Wire up static UI controls
  document.getElementById('logout-button').addEventListener('click', handleLogout);
  document.getElementById('accept-ride-form').addEventListener('submit', handleAcceptRide);
  document.getElementById('reject-ride-button').addEventListener('click', handleRejectRide);
  document.getElementById('toggle-availability-button').addEventListener('click', toggleAvailability);
  document.getElementById('document-form').addEventListener('submit', handleDocumentSubmit);
  document.getElementById('support-form').addEventListener('submit', handleSupportSubmit);
  document.getElementById('close-ride-details').addEventListener('click', closeRideDetailsModal);
  document.getElementById('ride-details-modal').addEventListener('click', event => {
    if (event.target.id === 'ride-details-modal') closeRideDetailsModal();
  });
  document.getElementById('pickup-directions-button').addEventListener('click', () => openDirections('pickup'));
  document.getElementById('dropoff-directions-button').addEventListener('click', () => openDirections('dropoff'));
  document.querySelectorAll('.nav-tab').forEach(button => {
    button.addEventListener('click', () => setActivePane(button.dataset.pane || 'map'));
  });

  // Map controls
  setupMapControls();

  document.getElementById('driver-role').textContent = `Role: ${String(currentUser.role || 'driver').toUpperCase()}`;
  setActivePane('map');
  renderDocumentList();
  renderSupportLog();

  // Background tracking: resume when tab becomes visible
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      requestWakeLock();
      routeCache.cachedAt = 0;
      recalculateRouteData().catch(() => {});
      navigator.geolocation?.getCurrentPosition(handlePositionUpdate, handleGeoError, getGeolocationOptions());
    }
  });

  // Cleanup on unload
  window.addEventListener('beforeunload', () => {
    stopLocationTracking();
    if (gpsSimulationIntervalId !== null) window.clearInterval(gpsSimulationIntervalId);
    if (wakeLockSentinel && typeof wakeLockSentinel.release === 'function') wakeLockSentinel.release().catch(() => {});
  });

  // Load data
  await Promise.all([loadDriverProfile(), loadAvailableRideRequests(), loadRideHistory(), loadEarnings()]);

  // Acquire initial location and start continuous tracking
  await ensureDriverLocation();
  await startLocationTracking();
  await requestWakeLock();

  // Periodic readout refresh
  startUiRefreshLoop();
});
