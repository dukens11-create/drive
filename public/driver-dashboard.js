// ─── Constants ────────────────────────────────────────────────────────────────
const API_BASE_URL = '';
const REJECTED_RIDES_KEY = 'driverRejectedRideIds';
const RIDE_REQUEST_HISTORY_KEY = 'driverRideRequestHistory';
const RIDE_REQUEST_ANALYTICS_KEY = 'driverRideRequestAnalytics';
const RIDE_ALERT_MUTE_UNTIL_KEY = 'driverRideAlertMuteUntil';
const DRIVER_DOCS_KEY = 'driverDashboardDocs';
const DRIVER_SUPPORT_KEY = 'driverDashboardSupportLog';
const DRIVER_REALTIME_CONFIG_KEY = 'driverRealtimeConfig';
const DRIVER_REALTIME_CACHE_KEY = 'driverRealtimeCache';
const DRIVER_OFFLINE_LOCATION_QUEUE_KEY = 'driverOfflineLocationQueue';
const MAX_OFFLINE_LOCATION_QUEUE = 50;
const REALTIME_POLL_INTERVAL_MS = 12_000;
const ALERT_DISPLAY_DURATION = 4200;
const PROFILE_LOAD_MAX_RETRIES = 2;
const PROFILE_RETRY_DELAY_MS = 800;
const GPS_LOG_KEY = 'driverGpsLog';
const LAST_KNOWN_LOCATION_KEY = 'driverLastKnownLocation';
const MAX_GPS_LOG_ENTRIES = 200;
const GPS_RETRY_MAX_ATTEMPTS = 3;
const GPS_RETRY_BASE_DELAY_MS = 2_000;
const GPS_ACQUISITION_TIMEOUT_MS = 30_000;
const INITIAL_GPS_LOOKUP_TIMEOUT_MS = 5_000;
const GPS_STALE_POSITION_MS = 9_000;
const ROUTE_CACHE_TTL_MS = 15000;
const ROUTE_RECALC_DEBOUNCE_MS = 1200;
const ROUTE_MOVEMENT_REFRESH_KM = 0.08;
const MAPBOX_TOKEN_STORAGE_KEY = 'drive.mapboxToken';
const MAPBOX_STYLE_STREETS = 'mapbox://styles/mapbox/navigation-night-v1';
const MAPBOX_STYLE_SATELLITE = 'mapbox://styles/mapbox/satellite-streets-v12';
const RIDE_REQUEST_ALERT_WINDOW_MS = 18000;
const RIDE_REQUEST_COUNTDOWN_TICK_MS = 1000;
const RIDE_REQUEST_EXPIRING_THRESHOLD_MS = 7000;
const SWIPE_ACCEPT_THRESHOLD = 0.72;
const SWIPE_DECLINE_THRESHOLD = 0.52;
const SWIPE_ACCEPT_TRACK_PADDING = 14;
const SWIPE_VERTICAL_THRESHOLD = 80;
const SWIPE_HORIZONTAL_THRESHOLD = 60;
const SHEET_DRAG_THRESHOLD = 18;
const RIDE_REQUEST_HISTORY_LIMIT = 60;
const RIDE_REQUEST_ANALYTICS_LIMIT = 120;
const RIDE_POPUP_TERMINAL_STATE_MS = 1500;
const RIDE_ALERT_MUTE_WINDOW_MS = 5 * 60 * 1000;

const DEFAULT_FALLBACK_LAT = 37.7749;
const DEFAULT_FALLBACK_LNG = -122.4194;
const DEFAULT_LOCATION_ACCURACY_M = 80;
const DEFAULT_LOCATION_SPEED_KMH = 40;
const MAX_ACCEPTABLE_ACCURACY_M = 150;
const MAX_REASONABLE_SPEED_KMH = 160;
const STOPPED_SPEED_THRESHOLD_KMH = 3;
const ACCELERATION_THRESHOLD_KMH = 8;
const MIN_ANIMATION_SPEED_KMH = 12;
const MIN_ANIMATION_DISTANCE_KM = 0.00005;
const MARKER_ANIMATION_MIN_MS = 900;
const MARKER_ANIMATION_MAX_MS = 4800;
const TRAIL_HISTORY_LIMIT = 32;
const TRAIL_POINT_DISTANCE_KM = 0.012;
const GPS_JITTER_TOLERANCE_KM = 0.05;
const CAMERA_UPDATE_THROTTLE_MS = 140;
const CAMERA_BASE_ZOOM = 17.3;
const CAMERA_MIN_ZOOM = 13.4;
const CAMERA_MAX_ZOOM = 17.6;
const CAMERA_ZOOM_SPEED_CAP_KMH = 110;
const CAMERA_ZOOM_SPEED_DIVISOR = 32;
const CAMERA_AHEAD_DISTANCE_KM = 0.08;
const BASE_FARE = 2.5;
const DISTANCE_RATE = 1.9;
const TIME_RATE = 0.25;
const KMH_TO_MPH_FACTOR = 0.621371;

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
let isProfileLoading = false;
let nearbyRideRequests = [];
let completedRideHistory = [];
let selectedRideForDetails = null;
let earningsSnapshot = { earningsCents: 0, rideCount: 0 };
let realtimeSubscriptions = [];
let realtimePollers = [];
let realtimeSocket = null;
let alertTimeoutId = null;
let pendingRideActionHandler = null;

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
  gpsLoading: false,
  gpsRetryCount: 0,
  gpsRetryExhausted: false,
  gpsStatusMessage: 'Acquiring GPS...',
  renderPending: false,
  isDragging: false,
  dragStartX: 0,
  dragStartY: 0,
  mapboxToken: '',
  mapboxInstance: null,
  mapboxReady: false,
  mapboxInitPromise: null,
  routeVisible: true,
  routeFitPending: false,
  routeHoveredSegment: null,
  routeLayerEventsBound: false,
  markers: {
    driver: null,
    pickup: null,
    destination: null,
    passengers: new Map(),
  },
  motion: {
    displayPosition: null,
    animationFrameId: null,
    animationFrom: null,
    animationTo: null,
    animationStartedAt: 0,
    animationDurationMs: 0,
    queuedPosition: null,
    trail: [],
    averageSpeedKmh: 0,
    maxSpeedKmh: 0,
    totalDistanceKm: 0,
    samples: 0,
    status: 'Waiting for GPS',
    lastCameraSyncAt: 0
  },
  activePointerId: null
};

let sheetState = {
  minHeight: 108,
  maxHeight: 620,
  snapPoints: [],
  currentHeight: 360,
  isDragging: false,
  dragStartY: 0,
  dragStartHeight: 360,
  lastDragY: 0,
  lastDragAt: 0,
  velocity: 0
};

const PANE_ORDER = ['map', 'trip-details', 'passenger-info', 'settings', 'earnings'];
let activePane = 'map';

let gpsWatchId = null;
let gpsPollIntervalId = null;
let gpsSimulationIntervalId = null;
let gpsRetryTimeoutId = null;
let gpsAcquireTimeoutId = null;
let gpsPermissionStatus = null;
let gpsSimulationIndex = 0;
let wakeLockSentinel = null;
let routeRefreshTimeoutId = null;

function createEmptyRouteCache() {
  return {
    pickupEta: null,
    dropoffEta: null,
    pickupDistKm: null,
    dropoffDistKm: null,
    totalDistKm: null,
    pickupDurationMin: null,
    dropoffDurationMin: null,
    totalDurationMin: null,
    pickupGeometry: null,
    dropoffGeometry: null,
    cacheKey: '',
    driverLat: null,
    driverLng: null,
    cachedAt: 0,
    loading: false,
    warning: '',
    statusMessage: 'Waiting for route',
    lastAnnouncement: '',
  };
}

let routeCache = createEmptyRouteCache();
let rideRequestCountdownIntervalId = null;
let rideRequestFeedInitialized = false;
let knownRideRequestIds = new Set();
const rideRequestExpirations = new Map();
const acceptingRideIds = new Set();
let incomingRideAudioContext = null;
let rideRequestPopupState = {
  rideId: null,
  rideSnapshot: null,
  phase: 'hidden',
  expiresAt: null,
  autoHideTimerId: null,
  lowTimeCuePlayed: false
};

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

function triggerHapticFeedback(pattern = 25) {
  if (typeof navigator?.vibrate !== 'function') return;
  navigator.vibrate(pattern);
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

function sleep(ms) {
  return new Promise(resolve => {
    window.setTimeout(resolve, ms);
  });
}

function logGpsEvent(level, message, payload) {
  const writer = typeof console?.[level] === 'function' ? console[level] : console.log;
  if (typeof payload === 'undefined') {
    writer(`[GPS] ${message}`);
    return;
  }
  writer(`[GPS] ${message}`, payload);
}

function setGpsStatus(message, { loading = mapState.gpsLoading } = {}) {
  mapState.gpsLoading = loading;
  if (message) mapState.gpsStatusMessage = message;
  const caption = document.getElementById('map-caption');
  if (caption && message) caption.textContent = message;
  updateMapUiReadouts();
}

function clearGpsRetryTimer() {
  if (gpsRetryTimeoutId !== null) {
    window.clearTimeout(gpsRetryTimeoutId);
    gpsRetryTimeoutId = null;
  }
}

function clearGpsAcquisitionTimeout() {
  if (gpsAcquireTimeoutId !== null) {
    window.clearTimeout(gpsAcquireTimeoutId);
    gpsAcquireTimeoutId = null;
  }
}

function parseStoredJson(key, fallback) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || 'null');
    if (parsed && typeof parsed === 'object') return parsed;
  } catch (_error) {
    // ignore malformed local cache payloads
  }
  return fallback;
}

function getRealtimeCache() {
  return parseStoredJson(DRIVER_REALTIME_CACHE_KEY, {});
}

function setRealtimeCache(nextCache) {
  localStorage.setItem(DRIVER_REALTIME_CACHE_KEY, JSON.stringify(nextCache || {}));
}

function getRealtimeConfig() {
  if (typeof window !== 'undefined' && window.DRIVE_REALTIME_CONFIG && typeof window.DRIVE_REALTIME_CONFIG === 'object') {
    return window.DRIVE_REALTIME_CONFIG;
  }
  return parseStoredJson(DRIVER_REALTIME_CONFIG_KEY, {});
}

function setRealtimeStatus(message, kind = 'info') {
  if (!message) return;
  showAlert(kind, message);
}

function cacheRealtimeSection(section, payload) {
  const cache = getRealtimeCache();
  cache[section] = payload;
  cache.updatedAt = new Date().toISOString();
  setRealtimeCache(cache);
}

function hydrateDashboardFromCache() {
  const cache = getRealtimeCache();
  if (Array.isArray(cache.activeRides)) nearbyRideRequests = cache.activeRides.map(normalizeRide);
  if (Array.isArray(cache.completedRides)) completedRideHistory = cache.completedRides.map(normalizeRide);
  if (cache.earnings && typeof cache.earnings === 'object') earningsSnapshot = {
    earningsCents: Number(cache.earnings.earningsCents) || 0,
    rideCount: Number(cache.earnings.rideCount) || 0
  };
  if (cache.location && Number.isFinite(Number(cache.location.lat)) && Number.isFinite(Number(cache.location.lng))) {
    currentProfile = { ...(currentProfile || {}), lat: Number(cache.location.lat), lng: Number(cache.location.lng) };
  }
  if (nearbyRideRequests.length) renderAvailableRideRequests();
  if (completedRideHistory.length) {
    renderRideHistory();
    renderPerformanceStats();
  }
  renderEarnings();
}

function getOfflineLocationQueue() {
  const parsed = parseStoredJson(DRIVER_OFFLINE_LOCATION_QUEUE_KEY, { queue: [] });
  return Array.isArray(parsed.queue) ? parsed.queue : [];
}

function setOfflineLocationQueue(queue) {
  localStorage.setItem(
    DRIVER_OFFLINE_LOCATION_QUEUE_KEY,
    JSON.stringify({ queue: queue.slice(-MAX_OFFLINE_LOCATION_QUEUE) })
  );
}

function queueOfflineLocation(location) {
  const queue = getOfflineLocationQueue();
  queue.push(location);
  setOfflineLocationQueue(queue);
}

function getDriverRealtimeBasePath() {
  if (!currentUser?.id) return null;
  return `drivers/${currentUser.id}`;
}

function getFirebaseDatabaseUrl() {
  const config = getRealtimeConfig();
  const provider = String(config.provider || 'firebase').toLowerCase();
  if (provider !== 'firebase') return '';
  const raw = String(config.databaseUrl || '').trim();
  return raw.replace(/\/+$/, '');
}

function getFirebaseAuthQuery() {
  const config = getRealtimeConfig();
  const token = String(config.databaseAuthToken || '').trim();
  return token ? `auth=${encodeURIComponent(token)}` : '';
}

function buildFirebaseUrl(path, { stream = false } = {}) {
  const databaseUrl = getFirebaseDatabaseUrl();
  if (!databaseUrl) return '';
  const cleanPath = String(path || '').replace(/^\/+/, '');
  const authQuery = getFirebaseAuthQuery();
  const params = [];
  if (authQuery) params.push(authQuery);
  if (stream) params.push('print=silent');
  const suffix = params.length ? `?${params.join('&')}` : '';
  return `${databaseUrl}/${cleanPath}.json${suffix}`;
}

async function pushFirebaseValue(path, payload, method = 'PUT') {
  const url = buildFirebaseUrl(path);
  if (!url) return false;
  const response = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return response.ok;
}

function cloneJson(value) {
  if (value === null || value === undefined) return value;
  return JSON.parse(JSON.stringify(value));
}

function applyFirebaseDelta(current, deltaPath, deltaData) {
  if (!deltaPath || deltaPath === '/') return cloneJson(deltaData);
  const nextState = cloneJson(current) || {};
  const segments = String(deltaPath).split('/').filter(Boolean);
  let cursor = nextState;

  for (let index = 0; index < segments.length - 1; index += 1) {
    const key = segments[index];
    const nextKey = segments[index + 1];
    if (cursor[key] === undefined || cursor[key] === null || typeof cursor[key] !== 'object') {
      cursor[key] = /^\d+$/.test(nextKey) ? [] : {};
    }
    cursor = cursor[key];
  }

  const leaf = segments[segments.length - 1];
  if (deltaData === null) {
    if (Array.isArray(cursor)) {
      const index = Number(leaf);
      if (Number.isInteger(index)) cursor.splice(index, 1);
    } else {
      delete cursor[leaf];
    }
  } else {
    cursor[leaf] = cloneJson(deltaData);
  }
  return nextState;
}

function normalizeRealtimeRidePayload(payload) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];
  if (Array.isArray(payload.items)) return payload.items;
  return Object.values(payload);
}

function applyRealtimeRides(payload) {
  if (payload === null || payload === undefined) return;
  const rides = normalizeRealtimeRidePayload(payload).map(normalizeRide);
  nearbyRideRequests = rides.filter(ride => ['requested', 'accepted', 'arrived_at_pickup', 'started'].includes(ride.status));
  completedRideHistory = rides.filter(ride => ride.status === 'completed');
  cacheRealtimeSection('activeRides', nearbyRideRequests);
  cacheRealtimeSection('completedRides', completedRideHistory);
  renderAvailableRideRequests();
  renderRideHistory();
  renderPerformanceStats();
}

function applyRealtimeEarnings(payload) {
  if (payload === null || payload === undefined) return;
  if (!payload || typeof payload !== 'object') return;
  const earningsCents = Number(payload.earningsCents);
  const rideCount = Number(payload.rideCount);
  if (!Number.isFinite(earningsCents) || !Number.isFinite(rideCount)) return;
  earningsSnapshot = { earningsCents, rideCount };
  cacheRealtimeSection('earnings', earningsSnapshot);
  renderEarnings();
}

function applyRealtimeLocation(payload) {
  const lat = Number(payload?.lat);
  const lng = Number(payload?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
  cacheRealtimeSection('location', { lat, lng, updatedAt: payload?.updatedAt || new Date().toISOString() });
  handlePositionUpdate({
    lat,
    lng,
    accuracy: payload?.accuracy ?? mapState.lastPosition?.accuracy ?? DEFAULT_LOCATION_ACCURACY_M,
    speed: payload?.speed,
    heading: payload?.heading,
    timestamp: payload?.updatedAt || Date.now()
  }, { syncBackend: false, skipLog: true }).catch(() => {});
  renderProfile();
}

function subscribeFirebaseStream(path, applyPayload) {
  const streamUrl = buildFirebaseUrl(path, { stream: true });
  if (!streamUrl || typeof EventSource !== 'function') return null;
  let state = null;
  const source = new EventSource(streamUrl);
  const handleEvent = event => {
    try {
      const parsed = JSON.parse(event.data || '{}');
      const deltaPath = typeof parsed.path === 'string' ? parsed.path : '/';
      state = applyFirebaseDelta(state, deltaPath, parsed.data);
      applyPayload(state);
    } catch (_error) {
      // ignore malformed stream payloads
    }
  };
  source.addEventListener('put', handleEvent);
  source.addEventListener('patch', handleEvent);
  source.addEventListener('keep-alive', () => {});
  source.onerror = () => {
    source.close();
  };
  return () => source.close();
}

function addRealtimePoller(path, applyPayload) {
  const url = buildFirebaseUrl(path);
  if (!url) return;
  const poll = async () => {
    try {
      const response = await fetch(url);
      if (!response.ok) return;
      const payload = await response.json();
      applyPayload(payload);
    } catch (_error) {
      // keep polling to support transient network failures/offline mode
    }
  };
  poll();
  const timer = setInterval(poll, REALTIME_POLL_INTERVAL_MS);
  realtimePollers.push(timer);
}

function clearRealtimeConnections() {
  if (realtimeSocket) {
    realtimeSocket.disconnect();
    realtimeSocket = null;
  }
  realtimeSubscriptions.forEach(unsub => {
    if (typeof unsub === 'function') unsub();
  });
  realtimeSubscriptions = [];
  realtimePollers.forEach(timer => clearInterval(timer));
  realtimePollers = [];
}

function startSocketRealtimeSync() {
  if (!accessToken) return false;
  if (typeof window.io === 'undefined') {
    setRealtimeStatus('Realtime websocket client unavailable. Falling back to cached sync.', 'warning');
    return false;
  }
  try {
    realtimeSocket = window.io({
      auth: { token: accessToken }
    });
  } catch (_error) {
    setRealtimeStatus('Realtime websocket failed to initialize. Falling back to cached sync.', 'warning');
    return false;
  }
  realtimeSocket.on('connect', () => {
    realtimeSocket.emit('dispatch:subscribe');
    setRealtimeStatus('Realtime dispatch connected.', 'success');
  });
  realtimeSocket.on('dispatch:rides', payload => {
    applyRealtimeRides(payload?.items ?? payload);
  });
  realtimeSocket.on('dispatch:earnings', payload => {
    applyRealtimeEarnings(payload);
  });
  realtimeSocket.on('dispatch:location', payload => {
    applyRealtimeLocation(payload);
  });
  realtimeSocket.on('connect_error', () => {
    setRealtimeStatus('Realtime dispatch connection failed. Using cached sync fallback.', 'warning');
  });
  realtimeSocket.on('disconnect', () => {
    setRealtimeStatus(
      navigator.onLine
        ? 'Realtime dispatch disconnected. Using cached sync fallback.'
        : 'Offline mode: realtime dispatch paused while your device is offline.',
      'warning'
    );
  });
  return true;
}

function startRealtimeSync() {
  clearRealtimeConnections();
  const socketEnabled = startSocketRealtimeSync();
  const driverBasePath = getDriverRealtimeBasePath();
  const databaseUrl = getFirebaseDatabaseUrl();
  if (!driverBasePath || !databaseUrl) return socketEnabled;

  const ridesPath = `${driverBasePath}/rides`;
  const earningsPath = `${driverBasePath}/earnings`;
  const locationPath = `${driverBasePath}/location`;

  const ridesSub = subscribeFirebaseStream(ridesPath, applyRealtimeRides);
  const earningsSub = subscribeFirebaseStream(earningsPath, applyRealtimeEarnings);
  const locationSub = subscribeFirebaseStream(locationPath, applyRealtimeLocation);
  if (ridesSub) realtimeSubscriptions.push(ridesSub);
  if (earningsSub) realtimeSubscriptions.push(earningsSub);
  if (locationSub) realtimeSubscriptions.push(locationSub);

  addRealtimePoller(ridesPath, applyRealtimeRides);
  addRealtimePoller(earningsPath, applyRealtimeEarnings);
  addRealtimePoller(locationPath, applyRealtimeLocation);
  return true;
}

async function publishRealtimeSnapshot(section, payload) {
  const driverBasePath = getDriverRealtimeBasePath();
  if (!driverBasePath) return;
  if (!getFirebaseDatabaseUrl()) return;
  await pushFirebaseValue(`${driverBasePath}/${section}`, payload, 'PUT').catch(() => {});
}

async function syncDriverLocationToBackends(location, { allowQueue = true } = {}) {
  const payload = {
    lat: Number(location.lat),
    lng: Number(location.lng),
    updatedAt: location.updatedAt || new Date().toISOString()
  };
  if (!Number.isFinite(payload.lat) || !Number.isFinite(payload.lng)) return false;
  currentProfile = { ...(currentProfile || {}), lat: payload.lat, lng: payload.lng };
  cacheRealtimeSection('location', payload);
  renderMap();

  let ok = true;
  try {
    const { data } = await fetchJson(`${API_BASE_URL}/api/drivers/location`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + accessToken
      },
      body: JSON.stringify({ lat: payload.lat, lng: payload.lng })
    });
    if (!data?.ok) ok = false;
  } catch (_error) {
    ok = false;
  }

  try {
    await publishRealtimeSnapshot('location', payload);
  } catch (_error) {
    ok = false;
  }

  if (!ok && allowQueue) queueOfflineLocation(payload);
  return ok;
}

async function flushOfflineLocationQueue() {
  if (!navigator.onLine) return;
  const queue = getOfflineLocationQueue();
  if (!queue.length) return;
  const remaining = [];
  for (const location of queue) {
    const synced = await syncDriverLocationToBackends(location, { allowQueue: false });
    if (!synced) remaining.push(location);
  }
  setOfflineLocationQueue(remaining);
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

function getRideAlertMuteUntil() {
  return Number(localStorage.getItem(RIDE_ALERT_MUTE_UNTIL_KEY) || 0);
}

function isRideAlertMuted() {
  return getRideAlertMuteUntil() > Date.now();
}

function setRideAlertMuteUntil(timestamp) {
  if (timestamp > Date.now()) {
    localStorage.setItem(RIDE_ALERT_MUTE_UNTIL_KEY, String(timestamp));
  } else {
    localStorage.removeItem(RIDE_ALERT_MUTE_UNTIL_KEY);
  }
}

function appendStoredEntry(storageKey, entry, limit) {
  const entries = getStoredList(storageKey);
  entries.unshift(entry);
  if (entries.length > limit) entries.length = limit;
  setStoredList(storageKey, entries);
}

function emitRideRequestAction(action, ride, extra = {}) {
  if (!ride?.id) return;
  const detail = {
    action,
    rideId: ride.id,
    phase: rideRequestPopupState.phase,
    passengerName: ride.passengerName || 'Passenger',
    fareEstimate: Number(ride.fareEstimate || 0),
    estimatedEarnings: Number(ride.estimatedEarnings || 0),
    pickupDistanceKm: getRidePickupDistanceKm(ride),
    tripDistanceKm: calculateDistance(ride.pickupLat, ride.pickupLng, ride.dropoffLat, ride.dropoffLng),
    recordedAt: new Date().toISOString(),
    ...extra
  };
  appendStoredEntry(RIDE_REQUEST_HISTORY_KEY, detail, RIDE_REQUEST_HISTORY_LIMIT);
  appendStoredEntry(RIDE_REQUEST_ANALYTICS_KEY, {
    rideId: detail.rideId,
    action: detail.action,
    fareEstimate: detail.fareEstimate,
    estimatedEarnings: detail.estimatedEarnings,
    pickupDistanceKm: detail.pickupDistanceKm,
    tripDistanceKm: detail.tripDistanceKm,
    remainingMs: detail.remainingMs ?? null,
    recordedAt: detail.recordedAt
  }, RIDE_REQUEST_ANALYTICS_LIMIT);
  window.dispatchEvent(new CustomEvent('driver:ride-request-action', { detail }));
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

function getPassengerInitials(name) {
  const parts = String(name || 'Passenger')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  if (!parts.length) return 'P';
  return parts.map(part => part.charAt(0).toUpperCase()).join('');
}

function createPassengerAvatarDataUrl(name) {
  const initials = getPassengerInitials(name);
  const safeInitials = escapeHtml(initials);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96" role="img" aria-label="${safeInitials}">
      <defs>
        <linearGradient id="avatarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#26d07c" />
          <stop offset="100%" stop-color="#1b80ff" />
        </linearGradient>
      </defs>
      <rect width="96" height="96" rx="28" fill="url(#avatarGradient)" />
      <text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" font-family="Inter, Arial, sans-serif" font-size="34" font-weight="700" fill="#071018">${safeInitials}</text>
    </svg>
  `.trim();
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function getPassengerPhotoUrl(ride) {
  const candidate = String(
    ride.passengerPhotoUrl ||
    ride.passengerAvatarUrl ||
    ride.avatarUrl ||
    ride.photoUrl ||
    ''
  ).trim();
  return candidate || createPassengerAvatarDataUrl(ride.passengerName);
}

function formatCoordinate(lat, lng) {
  if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) return 'Unknown location';
  return `${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)}`;
}

function formatRideStatus(status) {
  return String(status || 'requested')
    .split('_')
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatLifecycleLabel(state, fallbackStatus) {
  const label = String(state || fallbackStatus || 'requested')
    .replaceAll('-', '_')
    .split('_')
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
  return label === 'Canceled' ? 'Cancelled' : label;
}

function formatTimestamp(value) {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleString();
}

function formatMinutes(minutes) {
  const totalMinutes = Number(minutes || 0);
  if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) return '0 min';
  if (totalMinutes < 60) return `${Math.round(totalMinutes)} min`;
  const hours = Math.floor(totalMinutes / 60);
  const remainingMinutes = Math.round(totalMinutes % 60);
  return remainingMinutes ? `${hours} hr ${remainingMinutes} min` : `${hours} hr`;
}

function roundToTwoDecimals(amount) {
  return Math.round(Number(amount || 0) * 100) / 100;
}

function calculateFareBreakdown(ride) {
  if (ride?.fareDetails) {
    return {
      baseFare: Number(ride.fareDetails.baseFare || BASE_FARE),
      distanceFare: Number(ride.fareDetails.distanceFare || 0),
      timeFare: Number(ride.fareDetails.timeFare || 0),
      calculatedFare: Number(ride.fareDetails.meterFare || 0),
      fare: Number(ride.fareDetails.total || ride.fareEstimate || 0),
      surgeFare: Number(ride.fareDetails.surgeFare || 0),
      surgeMultiplier: Number(ride.fareDetails.surgeMultiplier || 1),
      serviceFee: Number(ride.fareDetails.serviceFee || 0),
      taxes: Number(ride.fareDetails.taxes || 0),
      tolls: Number(ride.fareDetails.tolls || 0),
      discounts: Number(ride.fareDetails.discounts || 0),
      tips: Number(ride.fareDetails.tips || 0),
      driverEarnings: Number(ride.fareDetails.driverEarnings || 0)
    };
  }

  const miles = Number(ride?.miles || 0);
  const minutes = Number(ride?.minutes || 0);
  const baseFare = BASE_FARE;
  const distanceFare = roundToTwoDecimals(miles * DISTANCE_RATE);
  const timeFare = roundToTwoDecimals(minutes * TIME_RATE);
  const calculatedFare = roundToTwoDecimals(Math.max(baseFare, distanceFare + timeFare));
  const surgeMultiplier = Number(ride?.surgeMultiplier || 1);
  const surgeFare = roundToTwoDecimals(calculatedFare * surgeMultiplier);
  const serviceFee = roundToTwoDecimals(surgeFare * 0.12);
  const discounts = roundToTwoDecimals(Number(ride?.discountCents || 0) / 100);
  const fare = roundToTwoDecimals(Math.max(0, surgeFare + serviceFee - discounts));
  return { baseFare, distanceFare, timeFare, calculatedFare, fare, surgeFare, surgeMultiplier, serviceFee, taxes: 0, tolls: 0, discounts, tips: 0, driverEarnings: roundToTwoDecimals(Math.max(0, surgeFare - serviceFee)) };
}

function hasPassengerRating(ride) {
  return ride?.passengerRating != null && Number.isFinite(Number(ride.passengerRating));
}

function getRefreshedRideOrFallback(previousRide, apiRide, fallbackPatch) {
  if (!previousRide?.id && !apiRide) return null;
  if (!previousRide?.id) return normalizeRide(apiRide || fallbackPatch || {}, 0);
  return getRideById(previousRide.id) || normalizeRide(apiRide || { ...previousRide, ...(fallbackPatch || {}) }, 0);
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
  const passengerRating = Number(ride.passengerRating);
  return {
    id: ride.id || `ride_mock_${index + 1}`,
    status: ride.status || 'requested',
    lifecycleState: ride.lifecycleState || ride.status || 'requested',
    pickupLat: Number.isFinite(pickupLat) ? pickupLat : DEFAULT_FALLBACK_LAT,
    pickupLng: Number.isFinite(pickupLng) ? pickupLng : DEFAULT_FALLBACK_LNG,
    dropoffLat: Number.isFinite(dropoffLat) ? dropoffLat : DEFAULT_FALLBACK_LAT + 0.01,
    dropoffLng: Number.isFinite(dropoffLng) ? dropoffLng : DEFAULT_FALLBACK_LNG + 0.01,
    miles: Number(ride.miles || 0),
    fareEstimate: Number(ride.fareEstimate || 0),
    estimatedEarnings: Number(ride.driverEarningsEstimate ?? ride.earningsEstimate ?? ride.fareEstimate ?? 0),
    minutes: Number(ride.minutes || 18),
    passengerRating: Number.isFinite(passengerRating) ? passengerRating : null,
    passengerReview: ride.passengerReview || '',
    passengerName: ride.passengerName || `Passenger ${index + 1}`,
    passengerPhotoUrl: ride.passengerPhotoUrl || ride.passengerAvatarUrl || ride.avatarUrl || ride.photoUrl || '',
    arrivedAt: ride.arrivedAt || null,
    waitingSince: ride.waitingSince || null,
    waitTimeoutAt: ride.waitTimeoutAt || null,
    startedAt: ride.startedAt || null,
    completedAt: ride.completedAt || ride.updatedAt || null,
    canceledAt: ride.canceledAt || null,
    cancellationReason: ride.cancellationReason || '',
    cancellationFeeCents: Number(ride.cancellationFeeCents || ride.noShowFeeCents || 0),
    fareDetails: ride.fareDetails || null,
    events: Array.isArray(ride.events) ? ride.events : [],
    requestExpiresAt: ride.requestExpiresAt || ride.expiresAt || null,
    updatedAt: ride.updatedAt || new Date().toISOString()
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

function normalizeHeading(degrees) {
  return ((Number(degrees) % 360) + 360) % 360;
}

function shortestHeadingDelta(from, to) {
  return ((normalizeHeading(to) - normalizeHeading(from) + 540) % 360) - 180;
}

function interpolateHeading(from, to, progress) {
  return normalizeHeading(normalizeHeading(from) + shortestHeadingDelta(from, to) * progress);
}

function easeInOutCubic(t) {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return t < 0.5
    ? 4 * t * t * t
    : 1 - ((-2 * t + 2) ** 3) / 2;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getMapDisplayPosition() {
  return mapState.motion.displayPosition || mapState.lastPosition || null;
}

function calculateAnimationDuration(distanceKm, speedKmh) {
  const speed = Math.max(speedKmh || 0, MIN_ANIMATION_SPEED_KMH);
  const estimatedMs = (distanceKm / speed) * 60 * 60 * 1000;
  const updateFrequencyMs = Number.isFinite(mapState.updateFrequencyMs) && mapState.updateFrequencyMs > 0
    ? mapState.updateFrequencyMs
    : 3000;
  const maxDurationMs = Math.max(
    MARKER_ANIMATION_MIN_MS,
    Math.min(MARKER_ANIMATION_MAX_MS, updateFrequencyMs * 1.1)
  );
  return clamp(
    Number.isFinite(estimatedMs) && estimatedMs > 0 ? estimatedMs : updateFrequencyMs * 0.92,
    MARKER_ANIMATION_MIN_MS,
    maxDurationMs
  );
}

function calculateForwardOffsetPosition(lat, lng, heading, distanceKm) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (!Number.isFinite(heading) || distanceKm <= 0) return { lat, lng };
  const earthRadiusKm = 6371;
  const bearing = normalizeHeading(heading) * Math.PI / 180;
  const latRad = lat * Math.PI / 180;
  const lngRad = lng * Math.PI / 180;
  const distanceRatio = distanceKm / earthRadiusKm;
  const nextLat = Math.asin(
    Math.sin(latRad) * Math.cos(distanceRatio) +
    Math.cos(latRad) * Math.sin(distanceRatio) * Math.cos(bearing)
  );
  const nextLng = lngRad + Math.atan2(
    Math.sin(bearing) * Math.sin(distanceRatio) * Math.cos(latRad),
    Math.cos(distanceRatio) - Math.sin(latRad) * Math.sin(nextLat)
  );
  return {
    lat: nextLat * 180 / Math.PI,
    lng: nextLng * 180 / Math.PI
  };
}

function updateMotionTrail(position) {
  if (!position) return;
  const trail = mapState.motion.trail;
  const previous = trail[trail.length - 1];
  if (previous) {
    const distanceKm = calculateDistance(previous[1], previous[0], position.lat, position.lng);
    if (distanceKm < TRAIL_POINT_DISTANCE_KM) return;
  }
  trail.push([position.lng, position.lat]);
  if (trail.length > TRAIL_HISTORY_LIMIT) trail.splice(0, trail.length - TRAIL_HISTORY_LIMIT);
}

function cancelMarkerAnimation() {
  if (mapState.motion.animationFrameId !== null) {
    cancelAnimationFrame(mapState.motion.animationFrameId);
    mapState.motion.animationFrameId = null;
  }
}

function sampleAnimatedPosition(now) {
  const { animationFrom, animationTo, animationStartedAt, animationDurationMs } = mapState.motion;
  if (!animationFrom || !animationTo || animationDurationMs <= 0) return animationTo || animationFrom || mapState.motion.displayPosition;
  const progress = clamp((now - animationStartedAt) / animationDurationMs, 0, 1);
  const eased = easeInOutCubic(progress);
  const targetHeading = animationTo.heading ?? animationFrom.heading ?? 0;
  return {
    lat: animationFrom.lat + (animationTo.lat - animationFrom.lat) * eased,
    lng: animationFrom.lng + (animationTo.lng - animationFrom.lng) * eased,
    accuracy: animationFrom.accuracy + ((animationTo.accuracy ?? animationFrom.accuracy) - animationFrom.accuracy) * eased,
    speed: animationFrom.speed + ((animationTo.speed ?? animationFrom.speed) - animationFrom.speed) * eased,
    heading: interpolateHeading(animationFrom.heading ?? 0, targetHeading, eased),
    timestamp: animationTo.timestamp
  };
}

function applyAnimatedPosition(position) {
  if (!position) return;
  mapState.motion.displayPosition = {
    ...position,
    heading: normalizeHeading(position.heading ?? 0),
    speed: Math.max(0, Number(position.speed) || 0)
  };
  queueMapRender();
  updateMapUiReadouts();
}

function animateDriverMarkerTo(nextPosition) {
  if (!nextPosition) return;
  const now = performance.now();
  const currentDisplay = mapState.motion.animationFrameId !== null
    ? sampleAnimatedPosition(now)
    : (mapState.motion.displayPosition || mapState.lastPosition || nextPosition);

  cancelMarkerAnimation();
  mapState.motion.queuedPosition = null;

  const distanceKm = calculateDistance(currentDisplay.lat, currentDisplay.lng, nextPosition.lat, nextPosition.lng);
  if (!Number.isFinite(distanceKm) || distanceKm <= MIN_ANIMATION_DISTANCE_KM) {
    applyAnimatedPosition(nextPosition);
    updateMotionTrail(nextPosition);
    return;
  }

  mapState.motion.animationFrom = currentDisplay;
  mapState.motion.animationTo = nextPosition;
  mapState.motion.animationStartedAt = now;
  mapState.motion.animationDurationMs = calculateAnimationDuration(distanceKm, nextPosition.speed);

  const step = frameTime => {
    const progress = clamp((frameTime - mapState.motion.animationStartedAt) / mapState.motion.animationDurationMs, 0, 1);
    applyAnimatedPosition(sampleAnimatedPosition(frameTime));
    if (progress < 1) {
      mapState.motion.animationFrameId = requestAnimationFrame(step);
      return;
    }
    mapState.motion.animationFrameId = null;
    mapState.motion.animationFrom = nextPosition;
    mapState.motion.animationTo = nextPosition;
    applyAnimatedPosition(nextPosition);
    updateMotionTrail(nextPosition);
    if (mapState.motion.queuedPosition) {
      const queued = mapState.motion.queuedPosition;
      mapState.motion.queuedPosition = null;
      animateDriverMarkerTo(queued);
    }
  };

  mapState.motion.animationFrameId = requestAnimationFrame(step);
}

function queueDriverMarkerAnimation(position) {
  if (!position) return;
  if (!mapState.motion.displayPosition) {
    applyAnimatedPosition(position);
    updateMotionTrail(position);
    return;
  }
  if (mapState.motion.animationFrameId !== null) {
    mapState.motion.queuedPosition = position;
    applyAnimatedPosition(sampleAnimatedPosition(performance.now()));
    return;
  }
  animateDriverMarkerTo(position);
}

function updateMotionStats(position, previousPosition, distanceKm, elapsedMs) {
  mapState.motion.maxSpeedKmh = Math.max(mapState.motion.maxSpeedKmh, position.speed || 0);
  if (Number.isFinite(distanceKm) && distanceKm > 0) {
    mapState.motion.totalDistanceKm += distanceKm;
  }
  mapState.motion.samples += 1;
  mapState.motion.averageSpeedKmh = mapState.motion.samples > 0
    ? ((mapState.motion.averageSpeedKmh * (mapState.motion.samples - 1)) + (position.speed || 0)) / mapState.motion.samples
    : 0;

  const previousSpeed = previousPosition?.speed ?? 0;
  const speedDelta = (position.speed || 0) - previousSpeed;
  if (isVehicleStopped(position, distanceKm, elapsedMs)) {
    mapState.motion.status = 'Stopped';
  } else if (speedDelta >= ACCELERATION_THRESHOLD_KMH) {
    mapState.motion.status = 'Accelerating';
  } else if (speedDelta <= -ACCELERATION_THRESHOLD_KMH) {
    mapState.motion.status = 'Decelerating';
  } else {
    mapState.motion.status = 'Moving';
  }
}

function isVehicleStopped(position, distanceKm, elapsedMs) {
  return (position?.speed || 0) < STOPPED_SPEED_THRESHOLD_KMH
    || (Number.isFinite(elapsedMs) && elapsedMs > 0 && distanceKm < MIN_MOVEMENT_DISTANCE_KM);
}

function isLikelyGpsJump(previousPosition, nextPosition, distanceKm, elapsedMs) {
  if (!previousPosition || !Number.isFinite(distanceKm) || !Number.isFinite(elapsedMs) || elapsedMs <= 0) return false;
  if (nextPosition.accuracy > MAX_ACCEPTABLE_ACCURACY_M && distanceKm > 0.1) return true;
  const elapsedHours = elapsedMs / (60 * 60 * 1000);
  const inferredSpeed = elapsedHours > 0 ? distanceKm / elapsedHours : 0;
  if (inferredSpeed > MAX_REASONABLE_SPEED_KMH) return true;
  const expectedDistanceKm = ((previousPosition.speed || DEFAULT_LOCATION_SPEED_KMH) * elapsedHours)
    + (nextPosition.accuracy / 1000)
    + GPS_JITTER_TOLERANCE_KM;
  return distanceKm > Math.max(expectedDistanceKm * 2.5, 0.3);
}

function calculateSpeedKmh(rawSpeed, distanceKm, elapsedMs, previousSpeedKmh) {
  if (Number.isFinite(rawSpeed) && rawSpeed >= 0) {
    return rawSpeed * 3.6;
  }
  if (Number.isFinite(distanceKm) && Number.isFinite(elapsedMs) && elapsedMs > 0) {
    return distanceKm / (elapsedMs / (60 * 60 * 1000));
  }
  return previousSpeedKmh ?? 0;
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

function getTrackedRide() {
  return syncSelectedRideFromState() || nearbyRideRequests[0] || null;
}

function buildRouteCacheKey(driverLat, driverLng, ride) {
  if (!ride) return '';
  return [
    ride.id || 'ride',
    roundCoord(driverLat),
    roundCoord(driverLng),
    roundCoord(ride.pickupLat),
    roundCoord(ride.pickupLng),
    roundCoord(ride.dropoffLat),
    roundCoord(ride.dropoffLng),
  ].join(':');
}

function buildRouteFallback(originLat, originLng, destLat, destLng, warning) {
  const distKm = calculateDistance(originLat, originLng, destLat, destLng);
  const speedKmh = mapState.lastPosition?.speed > 2 ? mapState.lastPosition.speed : DEFAULT_LOCATION_SPEED_KMH;
  return {
    distKm,
    etaMin: calculateETA(distKm, speedKmh),
    geometry: null,
    source: 'fallback',
    warning,
  };
}

function getRouteWarningMessage(status, payload) {
  if (status === 429) return 'Mapbox route rate limit reached. Showing an estimated route.';
  if (status === 401 || status === 403) return 'Mapbox directions are unavailable for this token. Showing an estimated route.';
  if (status === 422) return payload?.message || 'Route coordinates were invalid. Showing an estimated route.';
  return payload?.message || 'Live route data is unavailable right now. Showing an estimated route.';
}

function formatDistance(km) {
  if (!Number.isFinite(km)) return '--';
  const miles = km * 0.621371;
  if (km < 1) return `${Math.round(km * 1000)} m / ${(miles * 5280).toFixed(0)} ft`;
  return `${km.toFixed(2)} km / ${miles.toFixed(2)} mi`;
}

function formatRideRequestCountdown(msRemaining) {
  const totalSeconds = Math.max(0, Math.ceil(msRemaining / 1000));
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function getDriverReferenceLocation() {
  if (Number.isFinite(mapState.lastPosition?.lat) && Number.isFinite(mapState.lastPosition?.lng)) {
    return mapState.lastPosition;
  }
  if (Number.isFinite(Number(currentProfile?.lat)) && Number.isFinite(Number(currentProfile?.lng))) {
    return { lat: Number(currentProfile.lat), lng: Number(currentProfile.lng) };
  }
  return getLastKnownLocation();
}

function getRidePickupDistanceKm(ride) {
  const reference = getDriverReferenceLocation();
  if (!reference) return NaN;
  return calculateDistance(reference.lat, reference.lng, Number(ride.pickupLat), Number(ride.pickupLng));
}

function getRideRequestExpiryTimestamp(ride) {
  const explicitExpiry = Date.parse(String(ride.requestExpiresAt || ''));
  if (Number.isFinite(explicitExpiry) && explicitExpiry > Date.now()) {
    return explicitExpiry;
  }
  if (!rideRequestExpirations.has(ride.id)) {
    rideRequestExpirations.set(ride.id, Date.now() + RIDE_REQUEST_ALERT_WINDOW_MS);
  }
  return rideRequestExpirations.get(ride.id);
}

function pruneRideRequestState(rides) {
  const activeIds = new Set(rides.map(ride => ride.id));
  Array.from(rideRequestExpirations.keys()).forEach(rideId => {
    if (!activeIds.has(rideId)) rideRequestExpirations.delete(rideId);
  });
  knownRideRequestIds = new Set(Array.from(knownRideRequestIds).filter(rideId => activeIds.has(rideId)));
}

async function primeIncomingRideAudio() {
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextCtor) return;
  if (!incomingRideAudioContext) incomingRideAudioContext = new AudioContextCtor();
  if (incomingRideAudioContext.state === 'suspended') {
    await incomingRideAudioContext.resume();
  }
}

async function playIncomingRideAlert(options = {}) {
  if (isRideAlertMuted()) return;
  const lowTimeCue = Boolean(options.lowTimeCue);
  try {
    await primeIncomingRideAudio();
  } catch (_error) {
    return;
  }
  if (!incomingRideAudioContext) return;
  const now = incomingRideAudioContext.currentTime;
  const tones = lowTimeCue
    ? [{ offset: 0, frequency: 698, end: 0.12, gain: 0.045 }]
    : [
      { offset: 0, frequency: 880, end: 0.18, gain: 0.08 },
      { offset: 0.2, frequency: 1174, end: 0.18, gain: 0.08 }
    ];
  tones.forEach(({ offset, frequency, end, gain: peakGain }) => {
    const oscillator = incomingRideAudioContext.createOscillator();
    const gain = incomingRideAudioContext.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, now + offset);
    gain.gain.setValueAtTime(0.0001, now + offset);
    gain.gain.exponentialRampToValueAtTime(peakGain, now + offset + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + end - 0.02);
    oscillator.connect(gain);
    gain.connect(incomingRideAudioContext.destination);
    oscillator.start(now + offset);
    oscillator.stop(now + offset + end);
  });
}

function updateRideRequestCountdowns() {
  document.querySelectorAll('[data-request-countdown]').forEach(element => {
    const expiresAt = Number(element.getAttribute('data-expires-at'));
    const remainingMs = expiresAt - Date.now();
    element.textContent = formatRideRequestCountdown(remainingMs);
    const isExpiring = remainingMs <= RIDE_REQUEST_EXPIRING_THRESHOLD_MS;
    element.classList.toggle('is-expiring', isExpiring);
    element.closest('[data-ride-request-card]')?.classList.toggle('is-expiring', isExpiring);
  });
  updateIncomingRidePopupCountdown();
}

function startRideRequestCountdowns() {
  if (rideRequestCountdownIntervalId !== null) return;
  updateRideRequestCountdowns();
  rideRequestCountdownIntervalId = window.setInterval(updateRideRequestCountdowns, RIDE_REQUEST_COUNTDOWN_TICK_MS);
}

function clearRideRequestPopupAutoHide() {
  if (rideRequestPopupState.autoHideTimerId !== null) {
    window.clearTimeout(rideRequestPopupState.autoHideTimerId);
    rideRequestPopupState.autoHideTimerId = null;
  }
}

function getPopupRideSnapshot() {
  if (rideRequestPopupState.rideId) {
    return getRideById(rideRequestPopupState.rideId) || rideRequestPopupState.rideSnapshot;
  }
  return rideRequestPopupState.rideSnapshot;
}

function getActiveIncomingRide() {
  const rejected = new Set(getRejectedRideIds());
  return nearbyRideRequests.find(ride => ride.status === 'requested' && !rejected.has(ride.id)) || null;
}

function getRideTripDistanceKm(ride) {
  if (!ride) return NaN;
  return calculateDistance(ride.pickupLat, ride.pickupLng, ride.dropoffLat, ride.dropoffLng);
}

function getRidePickupEtaMinutes(ride) {
  const pickupDistanceKm = getRidePickupDistanceKm(ride);
  return calculateETA(pickupDistanceKm, mapState.lastPosition?.speed);
}

function getRidePopupStateMessage(phase, passengerName) {
  switch (phase) {
    case 'accepting':
      return `Accepting ${passengerName}'s trip…`;
    case 'accepted':
      return `Ride accepted for ${passengerName}.`;
    case 'declined':
      return `Request declined for ${passengerName}.`;
    case 'expired':
      return `Request expired for ${passengerName}.`;
    default:
      return `${passengerName} is waiting for pickup.`;
  }
}

function hideRideRequestPopup() {
  clearRideRequestPopupAutoHide();
  rideRequestPopupState = {
    rideId: null,
    rideSnapshot: null,
    phase: 'hidden',
    expiresAt: null,
    autoHideTimerId: null,
    lowTimeCuePlayed: false
  };
  const host = document.getElementById('ride-request-popup-layer');
  if (host) host.innerHTML = '';
}

function setRideRequestPopupPhase(phase, ride, options = {}) {
  clearRideRequestPopupAutoHide();
  rideRequestPopupState.rideId = ride?.id || rideRequestPopupState.rideId;
  rideRequestPopupState.rideSnapshot = ride ? { ...ride } : rideRequestPopupState.rideSnapshot;
  rideRequestPopupState.phase = phase;
  if (typeof options.expiresAt === 'number') {
    rideRequestPopupState.expiresAt = options.expiresAt;
  } else if (ride && phase === 'requesting') {
    rideRequestPopupState.expiresAt = getRideRequestExpiryTimestamp(ride);
  } else if (phase !== 'requesting') {
    rideRequestPopupState.expiresAt = null;
  }
  if (typeof options.lowTimeCuePlayed === 'boolean') {
    rideRequestPopupState.lowTimeCuePlayed = options.lowTimeCuePlayed;
  } else if (phase !== 'requesting') {
    rideRequestPopupState.lowTimeCuePlayed = false;
  }
  renderIncomingRideRequestPopup();
  if (['accepted', 'declined', 'expired'].includes(phase)) {
    rideRequestPopupState.autoHideTimerId = window.setTimeout(() => {
      hideRideRequestPopup();
      syncIncomingRideRequestPopup();
    }, RIDE_POPUP_TERMINAL_STATE_MS);
  }
}

function setRideAlertMute(enabled) {
  setRideAlertMuteUntil(enabled ? Date.now() + RIDE_ALERT_MUTE_WINDOW_MS : 0);
  renderIncomingRideRequestPopup();
  showAlert('info', enabled ? 'Ride alerts muted for 5 minutes.' : 'Ride alerts restored.');
}

function declineRideRequest(ride, reason = 'declined') {
  if (!ride?.id) return;
  const ids = getRejectedRideIds();
  if (!ids.includes(ride.id)) ids.push(ride.id);
  setRejectedRideIds(ids);
  emitRideRequestAction(reason, ride, {
    remainingMs: rideRequestPopupState.expiresAt ? Math.max(rideRequestPopupState.expiresAt - Date.now(), 0) : null
  });
  setRideRequestPopupPhase(reason === 'expired' ? 'expired' : 'declined', ride);
  renderAvailableRideRequests();
  showAlert(reason === 'expired' ? 'warning' : 'info', reason === 'expired'
    ? `Ride ${ride.id} expired.`
    : `Ride ${ride.id} rejected from your local queue.`);
}

function updateIncomingRidePopupCountdown() {
  if (rideRequestPopupState.phase !== 'requesting' || !rideRequestPopupState.expiresAt) return;
  const ride = getPopupRideSnapshot();
  if (!ride) {
    hideRideRequestPopup();
    return;
  }
  const remainingMs = rideRequestPopupState.expiresAt - Date.now();
  if (remainingMs <= 0) {
    declineRideRequest(ride, 'expired');
    return;
  }
  const remainingPercent = `${Math.max(6, Math.min((remainingMs / RIDE_REQUEST_ALERT_WINDOW_MS) * 100, 100)).toFixed(1)}%`;
  const isUrgent = remainingMs <= RIDE_REQUEST_EXPIRING_THRESHOLD_MS;
  document.querySelectorAll('[data-popup-countdown]').forEach(element => {
    element.textContent = formatRideRequestCountdown(remainingMs);
  });
  document.querySelectorAll('[data-popup-progress]').forEach(element => {
    element.style.setProperty('--progress', remainingPercent);
  });
  const card = document.getElementById('ride-request-popup-card');
  const timer = document.getElementById('ride-request-popup-timer');
  if (card) card.setAttribute('data-urgent', String(isUrgent));
  if (timer) timer.classList.toggle('is-urgent', isUrgent);
  if (isUrgent && !rideRequestPopupState.lowTimeCuePlayed) {
    rideRequestPopupState.lowTimeCuePlayed = true;
    playIncomingRideAlert({ lowTimeCue: true }).catch(() => {});
  }
}

function attachIncomingRidePopupSwipeControls(ride) {
  const popup = document.querySelector('[data-popup-swipe]');
  const track = popup?.querySelector('.ride-popup-swipe-track');
  const thumb = popup?.querySelector('[data-popup-swipe-thumb]');
  if (!popup || !track || !thumb || !ride?.id) return;

  let pointerId = null;
  let currentOffset = 0;
  let startX = 0;
  const getMaxOffset = () => Math.max((track.clientWidth - thumb.clientWidth) / 2 - 12, 0);
  const setSwipeProgress = offset => {
    currentOffset = Math.max(-getMaxOffset(), Math.min(getMaxOffset(), offset));
    thumb.style.transform = `translateX(${currentOffset}px)`;
    const progress = getMaxOffset() > 0 ? Math.abs(currentOffset) / getMaxOffset() : 0;
    track.style.setProperty('--swipe-progress', `${(progress * 50).toFixed(1)}%`);
    popup.dataset.direction = currentOffset > 0 ? 'accept' : currentOffset < 0 ? 'decline' : '';
  };
  const resetSwipe = () => {
    track.style.setProperty('--swipe-progress', '0%');
    popup.dataset.direction = '';
    setSwipeProgress(0);
  };
  const commitSwipe = async direction => {
    if (direction === 'accept') {
      setRideRequestPopupPhase('accepting', ride);
      const accepted = await acceptRideById(ride.id, { source: 'popup-swipe' });
      if (accepted) {
        setRideRequestPopupPhase('accepted', ride);
      } else {
        setRideRequestPopupPhase('requesting', ride, { expiresAt: getRideRequestExpiryTimestamp(ride) });
      }
      return;
    }
    declineRideRequest(ride, 'declined');
  };
  const finalizeSwipe = async event => {
    if (pointerId !== event.pointerId) return;
    const maxOffset = getMaxOffset();
    const progress = maxOffset > 0 ? Math.abs(currentOffset) / maxOffset : 0;
    const direction = currentOffset > 0 ? 'accept' : currentOffset < 0 ? 'decline' : '';
    pointerId = null;
    thumb.releasePointerCapture?.(event.pointerId);
    resetSwipe();
    if (progress >= SWIPE_ACCEPT_THRESHOLD && direction) {
      await commitSwipe(direction);
    }
  };

  resetSwipe();
  track.tabIndex = 0;
  track.setAttribute('role', 'slider');
  track.setAttribute('aria-valuemin', '-100');
  track.setAttribute('aria-valuemax', '100');
  track.setAttribute('aria-valuenow', '0');
  track.setAttribute('aria-label', `Swipe right to accept or left to decline ride request from ${ride.passengerName || 'Passenger'}`);

  thumb.addEventListener('pointerdown', event => {
    if (rideRequestPopupState.phase !== 'requesting') return;
    pointerId = event.pointerId;
    startX = event.clientX - currentOffset;
    thumb.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  });
  thumb.addEventListener('pointermove', event => {
    if (pointerId !== event.pointerId) return;
    setSwipeProgress(event.clientX - startX);
    const maxOffset = getMaxOffset();
    track.setAttribute('aria-valuenow', String(maxOffset > 0 ? Math.round((currentOffset / maxOffset) * 100) : 0));
  });
  thumb.addEventListener('pointerup', event => {
    finalizeSwipe(event).catch(() => {});
  });
  thumb.addEventListener('pointercancel', event => {
    finalizeSwipe(event).catch(() => {});
  });
  track.addEventListener('keydown', event => {
    if (rideRequestPopupState.phase !== 'requesting') return;
    if (event.key === 'Enter') {
      event.preventDefault();
      commitSwipe('accept').catch(() => {});
    } else if (event.key === 'Escape') {
      event.preventDefault();
      commitSwipe('decline').catch(() => {});
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      setSwipeProgress(currentOffset + getMaxOffset() * 0.28);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      setSwipeProgress(currentOffset - getMaxOffset() * 0.28);
    } else if (event.key === ' ') {
      event.preventDefault();
      const direction = currentOffset >= 0 ? 'accept' : 'decline';
      commitSwipe(direction).catch(() => {});
    }
  });
  document.getElementById('ride-request-popup-decline')?.addEventListener('click', () => {
    if (rideRequestPopupState.phase !== 'requesting') return;
    declineRideRequest(ride, 'declined');
  });
  document.getElementById('ride-request-popup-mute')?.addEventListener('click', () => {
    setRideAlertMute(!isRideAlertMuted());
  });
}

function renderIncomingRideRequestPopup() {
  const host = document.getElementById('ride-request-popup-layer');
  if (!host) return;
  const ride = getPopupRideSnapshot();
  if (!ride || rideRequestPopupState.phase === 'hidden') {
    host.innerHTML = '';
    return;
  }

  const pickupDistanceKm = getRidePickupDistanceKm(ride);
  const tripDistanceKm = getRideTripDistanceKm(ride);
  const pickupEta = getRidePickupEtaMinutes(ride);
  const countdown = rideRequestPopupState.expiresAt
    ? formatRideRequestCountdown(rideRequestPopupState.expiresAt - Date.now())
    : '00:00';
  const isUrgent = rideRequestPopupState.phase === 'requesting'
    && rideRequestPopupState.expiresAt
    && rideRequestPopupState.expiresAt - Date.now() <= RIDE_REQUEST_EXPIRING_THRESHOLD_MS;
  const progressPercent = rideRequestPopupState.expiresAt
    ? `${Math.max(6, Math.min(((rideRequestPopupState.expiresAt - Date.now()) / RIDE_REQUEST_ALERT_WINDOW_MS) * 100, 100)).toFixed(1)}%`
    : '100%';
  const passengerName = ride.passengerName || 'Passenger';
  const stateMessage = getRidePopupStateMessage(rideRequestPopupState.phase, passengerName);

  host.innerHTML = `
    <section id="ride-request-popup" class="ride-request-popup is-visible" aria-label="Incoming ride request">
      <div id="ride-request-popup-card" class="ride-request-popup-card glass-panel" data-state="${escapeHtml(rideRequestPopupState.phase)}" data-urgent="${String(isUrgent)}" role="dialog" aria-modal="false" aria-describedby="ride-request-popup-state">
        <div class="ride-popup-progress-bar" data-popup-progress style="--progress:${escapeHtml(progressPercent)}"><span></span></div>
        <div class="ride-popup-body">
          <div class="ride-popup-top">
            <div class="ride-popup-passenger">
              <img class="ride-popup-photo" src="${escapeHtml(getPassengerPhotoUrl(ride))}" alt="${escapeHtml(`${passengerName} profile photo`)}">
              <div>
                <div class="eyebrow">Incoming ride request</div>
                <div class="ride-popup-name">${escapeHtml(passengerName)}</div>
                <div class="ride-popup-subtitle">${escapeHtml(ride.id)} • ${escapeHtml(formatCoordinate(ride.pickupLat, ride.pickupLng))}</div>
                <div class="ride-popup-rating"><i class="bi bi-star-fill"></i> ${Number(ride.passengerRating || 0).toFixed(1)} passenger rating</div>
              </div>
            </div>
            <div id="ride-request-popup-timer" class="ride-popup-timer${isUrgent ? ' is-urgent' : ''}">
              <span>Time left</span>
              <strong data-popup-countdown>${escapeHtml(countdown)}</strong>
            </div>
          </div>

          <div class="ride-popup-grid">
            <div class="ride-popup-metric">
              <span>Fare estimate</span>
              <strong>$${Number(ride.fareEstimate || 0).toFixed(2)}</strong>
            </div>
            <div class="ride-popup-metric">
              <span>Estimated earnings</span>
              <strong>$${Number(ride.estimatedEarnings || 0).toFixed(2)}</strong>
            </div>
            <div class="ride-popup-metric">
              <span>Pickup ETA</span>
              <strong>${escapeHtml(formatEta(pickupEta))}</strong>
            </div>
            <div class="ride-popup-metric">
              <span>Trip distance</span>
              <strong>${escapeHtml(formatDistance(tripDistanceKm))}</strong>
            </div>
          </div>

          <div class="ride-popup-route">
            <div class="ride-popup-location pickup">
              <i class="bi bi-geo-alt-fill"></i>
              <div>
                <small>Pickup • ${escapeHtml(formatDistance(pickupDistanceKm))} away</small>
                <strong>${escapeHtml(formatCoordinate(ride.pickupLat, ride.pickupLng))}</strong>
              </div>
            </div>
            <div class="ride-popup-location dropoff">
              <i class="bi bi-pin-map-fill"></i>
              <div>
                <small>Dropoff • ${escapeHtml(formatEta(Number(ride.minutes || 0)))} trip</small>
                <strong>${escapeHtml(formatCoordinate(ride.dropoffLat, ride.dropoffLng))}</strong>
              </div>
            </div>
          </div>

          <div class="ride-popup-actions">
            <button id="ride-request-popup-mute" class="ride-popup-mute" type="button">${isRideAlertMuted() ? '<i class="bi bi-volume-mute"></i> Unmute' : '<i class="bi bi-volume-up"></i> Mute 5 min'}</button>
            <div class="ride-popup-swipe" data-popup-swipe data-direction="">
              <div class="ride-popup-swipe-track" data-accept-label="Swipe right to accept" data-decline-label="Swipe left to decline">
                <span class="ride-popup-swipe-fill"></span>
                <span class="ride-popup-swipe-fill accept"></span>
                <button class="ride-popup-swipe-thumb" data-popup-swipe-thumb type="button" aria-label="Swipe ride request action">
                  <i class="bi bi-arrow-left-right"></i>
                </button>
              </div>
            </div>
            <button id="ride-request-popup-decline" class="ride-popup-ghost danger" type="button">Decline</button>
          </div>

          <div class="ride-popup-footer">
            <div id="ride-request-popup-state" class="ride-popup-state"><strong>${escapeHtml(stateMessage)}</strong></div>
            <span class="ride-request-pill"><i class="bi bi-broadcast-pin"></i> Keyboard: Enter accept • Esc decline</span>
          </div>
        </div>
      </div>
    </section>
  `;

  const swipeTrack = host.querySelector('.ride-popup-swipe-track');
  if (rideRequestPopupState.phase !== 'requesting') {
    swipeTrack?.setAttribute('aria-disabled', 'true');
    host.querySelector('[data-popup-swipe-thumb]')?.setAttribute('disabled', 'disabled');
    host.querySelector('#ride-request-popup-decline')?.setAttribute('disabled', 'disabled');
  }
  attachIncomingRidePopupSwipeControls(ride);
  updateIncomingRidePopupCountdown();
}

function syncIncomingRideRequestPopup() {
  if (['accepted', 'declined', 'expired'].includes(rideRequestPopupState.phase)) return;
  const activeRide = getActiveIncomingRide();
  if (!activeRide) {
    if (rideRequestPopupState.phase === 'requesting') hideRideRequestPopup();
    return;
  }
  const nextExpiresAt = getRideRequestExpiryTimestamp(activeRide);
  if (rideRequestPopupState.rideId !== activeRide.id || rideRequestPopupState.phase === 'hidden') {
    rideRequestPopupState.lowTimeCuePlayed = false;
    setRideRequestPopupPhase('requesting', activeRide, { expiresAt: nextExpiresAt, lowTimeCuePlayed: false });
    return;
  }
  rideRequestPopupState.rideSnapshot = { ...activeRide };
  if (rideRequestPopupState.phase === 'requesting') {
    rideRequestPopupState.expiresAt = nextExpiresAt;
    updateIncomingRidePopupCountdown();
  }
}

function headingToCardinal(degrees) {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW', 'N'];
  return dirs[Math.round(degrees / 45) % 8];
}

function getGeolocationOptions() {
  return { enableHighAccuracy: true, timeout: GPS_ACQUISITION_TIMEOUT_MS, maximumAge: 1000 };
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

function readMapboxToken() {
  // Public Mapbox token (pk.*) — safe to embed in client-side code.
  // Restrict usage by domain in the Mapbox dashboard if needed.
  const HARDCODED_FALLBACK = 'pk.eyJ1IjoiZmx1cGZsYXAiLCJhIjoiY21wMjI3M3dpMDN5eTJycHMyeG8yaDZ3OCJ9.VUXlzIoU5Gxfj6-BVjnxag';
  try {
    const params = new URLSearchParams(window.location.search);
    const queryToken = String(params.get('mapboxToken') || '').trim();
    const savedToken = String(localStorage.getItem(MAPBOX_TOKEN_STORAGE_KEY) || '').trim();
    const metaToken = String(document.querySelector('meta[name="mapbox-token"]')?.content || '').trim();
    const windowToken = String(window.MAPBOX_TOKEN || '').trim();
    const resolved = queryToken || savedToken || metaToken || windowToken || HARDCODED_FALLBACK;
    console.debug('[Mapbox] readMapboxToken:', {
      queryToken: Boolean(queryToken),
      savedToken: Boolean(savedToken),
      metaToken: Boolean(metaToken),
      windowToken: Boolean(windowToken),
      resolved: Boolean(resolved),
    });
    return resolved;
  } catch (_error) {
    console.error('[Mapbox] readMapboxToken error:', _error);
    return HARDCODED_FALLBACK;
  }
}

function getGpsAccuracyDetails(accuracy) {
  if (!Number.isFinite(accuracy)) return { label: 'Unknown', className: '' };
  if (accuracy < 10) return { label: 'Good', className: 'gps-good' };
  if (accuracy < 50) return { label: 'Fair', className: 'gps-medium' };
  return { label: 'Poor', className: 'gps-poor' };
}

function showMapTokenOverlay(show) {
  const overlay = document.getElementById('map-token-overlay');
  if (!overlay) return;
  overlay.classList.toggle('show', Boolean(show));
}

function createPassengerMarkerElement() {
  const el = document.createElement('div');
  el.style.width = '12px';
  el.style.height = '12px';
  el.style.borderRadius = '50%';
  el.style.background = '#1b80ff';
  el.style.boxShadow = '0 0 0 8px rgba(27, 128, 255, 0.16)';
  return el;
}

function createDriverMarkerElement() {
  const el = document.createElement('div');
  el.className = 'driver-marker';
  const speedBadge = document.createElement('div');
  speedBadge.className = 'driver-marker-speed';
  speedBadge.textContent = '0 km/h';

  const markerBody = document.createElement('div');
  markerBody.className = 'driver-marker-body';

  const arrow = document.createElement('span');
  arrow.className = 'driver-marker-arrow';
  arrow.textContent = '▲';

  markerBody.appendChild(arrow);
  el.append(speedBadge, markerBody);
  return el;
}

function updateDriverMarkerVisuals(position) {
  const markerElement = mapState.markers.driver?.getElement?.();
  if (!markerElement || !position) return;
  const arrow = markerElement.querySelector('.driver-marker-arrow');
  const speedBadge = markerElement.querySelector('.driver-marker-speed');
  if (arrow) {
    arrow.style.transform = `rotate(${normalizeHeading(position.heading ?? 0)}deg)`;
  }
  if (speedBadge) {
    const speedKmh = Math.max(0, Number(position.speed) || 0);
    const speedMph = speedKmh * KMH_TO_MPH_FACTOR;
    speedBadge.textContent = speedKmh < STOPPED_SPEED_THRESHOLD_KMH
      ? 'Stopped'
      : `${Math.round(speedKmh)} km/h · ${Math.round(speedMph)} mph`;
  }
  markerElement.dataset.status = mapState.motion.status || 'Moving';
}

function createRouteMarkerElement(kind) {
  const isPickup = kind === 'pickup';
  const el = document.createElement('div');
  el.style.width = '28px';
  el.style.height = '28px';
  el.style.borderRadius = '50%';
  el.style.display = 'flex';
  el.style.alignItems = 'center';
  el.style.justifyContent = 'center';
  el.style.fontSize = '0.72rem';
  el.style.fontWeight = '700';
  el.style.color = '#071018';
  el.style.background = isPickup ? '#5b8cff' : '#26d07c';
  el.style.boxShadow = isPickup
    ? '0 0 0 8px rgba(91, 140, 255, 0.16)'
    : '0 0 0 8px rgba(38, 208, 124, 0.16)';
  el.textContent = isPickup ? 'P' : 'D';
  el.setAttribute('aria-label', isPickup ? 'Pickup marker' : 'Destination marker');
  return el;
}

function syncRouteLayerStyles() {
  const map = mapState.mapboxInstance;
  if (!map || !mapState.mapboxReady) return;
  [
    ['driver-live-route-to-pickup', 'pickup', '#5b8cff', 5],
    ['driver-live-route-to-dropoff', 'dropoff', '#26d07c', 4],
  ].forEach(([layerId, segment, color, baseWidth]) => {
    if (!map.getLayer(layerId)) return;
    const isHighlighted = mapState.routeHoveredSegment === segment;
    map.setLayoutProperty(layerId, 'visibility', mapState.routeVisible ? 'visible' : 'none');
    map.setPaintProperty(layerId, 'line-color', color);
    map.setPaintProperty(layerId, 'line-width', isHighlighted ? baseWidth + 2 : baseWidth);
    map.setPaintProperty(layerId, 'line-opacity', isHighlighted ? 1 : 0.9);
  });
}

function ensureTrafficLayer() {
  const map = mapState.mapboxInstance;
  if (!map || !mapState.mapboxReady) return;
  if (map.getSource('mapbox-traffic')) return;
  try {
    map.addSource('mapbox-traffic', {
      type: 'vector',
      url: 'mapbox://mapbox.mapbox-traffic-v1',
    });
    map.addLayer({
      id: 'mapbox-traffic-layer',
      type: 'line',
      source: 'mapbox-traffic',
      'source-layer': 'traffic',
      paint: {
        'line-color': [
          'match',
          ['get', 'congestion'],
          'low', '#35d07f',
          'moderate', '#f9d65c',
          'heavy', '#ff8a3c',
          'severe', '#ff5f62',
          '#5f738f',
        ],
        'line-width': ['interpolate', ['linear'], ['zoom'], 9, 1.2, 16, 3],
        'line-opacity': 0.78,
      },
    });
  } catch (error) {
    console.warn('Traffic layer unavailable:', error);
  }
}

function ensureRouteLayer() {
  const map = mapState.mapboxInstance;
  if (!map || !mapState.mapboxReady) return;
  if (!map.getSource('driver-live-route')) {
    map.addSource('driver-live-route', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    });
  }
  if (!map.getLayer('driver-live-route-to-pickup')) {
    map.addLayer({
      id: 'driver-live-route-to-pickup',
      type: 'line',
      source: 'driver-live-route',
      filter: ['==', ['get', 'segment'], 'pickup'],
      paint: { 'line-color': '#5b8cff', 'line-width': 5, 'line-opacity': 0.9 },
    });
  }
  if (!map.getLayer('driver-live-route-to-dropoff')) {
    map.addLayer({
      id: 'driver-live-route-to-dropoff',
      type: 'line',
      source: 'driver-live-route',
      filter: ['==', ['get', 'segment'], 'dropoff'],
      paint: { 'line-color': '#26d07c', 'line-width': 4, 'line-dasharray': [1, 1.2], 'line-opacity': 0.9 },
    });
  }
  if (!mapState.routeLayerEventsBound) {
    [
      ['driver-live-route-to-pickup', 'pickup'],
      ['driver-live-route-to-dropoff', 'dropoff'],
    ].forEach(([layerId, segment]) => {
      map.on('mouseenter', layerId, () => {
        mapState.routeHoveredSegment = segment;
        map.getCanvas().style.cursor = 'pointer';
        syncRouteLayerStyles();
      });
      map.on('mouseleave', layerId, () => {
        if (mapState.routeHoveredSegment === segment) mapState.routeHoveredSegment = null;
        map.getCanvas().style.cursor = '';
        syncRouteLayerStyles();
      });
      map.on('click', layerId, () => {
        mapState.routeFitPending = true;
        fitMapToTrackedRoute();
      });
    });
    mapState.routeLayerEventsBound = true;
  }
  syncRouteLayerStyles();
}

function fitMapToTrackedRoute() {
  const map = mapState.mapboxInstance;
  if (!map || !mapState.mapboxReady || !window.mapboxgl?.LngLatBounds || !mapState.routeVisible) return;
  const trackedRide = getTrackedRide();
  const driverPos = mapState.lastPosition;
  if (!trackedRide || !driverPos) return;
  const allCoordinates = [];
  const pickupCoords = Array.isArray(routeCache.pickupGeometry) && routeCache.pickupGeometry.length > 1
    ? routeCache.pickupGeometry
    : [[driverPos.lng, driverPos.lat], [trackedRide.pickupLng, trackedRide.pickupLat]];
  const dropoffCoords = Array.isArray(routeCache.dropoffGeometry) && routeCache.dropoffGeometry.length > 1
    ? routeCache.dropoffGeometry
    : [[trackedRide.pickupLng, trackedRide.pickupLat], [trackedRide.dropoffLng, trackedRide.dropoffLat]];
  allCoordinates.push(...pickupCoords, ...dropoffCoords);
  if (allCoordinates.length < 2) return;
  const bounds = new window.mapboxgl.LngLatBounds(allCoordinates[0], allCoordinates[0]);
  allCoordinates.forEach(coord => bounds.extend(coord));
  map.fitBounds(bounds, {
    padding: { top: 90, right: 42, bottom: 260, left: 42 },
    duration: 700,
    maxZoom: 15.5,
  });
  mapState.routeFitPending = false;
}

function ensureTrailLayer() {
  const map = mapState.mapboxInstance;
  if (!map || !mapState.mapboxReady) return;
  if (!map.getSource('driver-marker-trail')) {
    map.addSource('driver-marker-trail', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    });
  }
  if (!map.getLayer('driver-marker-trail-line')) {
    map.addLayer({
      id: 'driver-marker-trail-line',
      type: 'line',
      source: 'driver-marker-trail',
      paint: {
        'line-color': '#8df3bc',
        'line-width': 3,
        'line-opacity': 0.45,
      },
    });
  }
}

function updateMarkerTrail() {
  const map = mapState.mapboxInstance;
  if (!map || !mapState.mapboxReady) return;
  ensureTrailLayer();
  const source = map.getSource('driver-marker-trail');
  if (!source) return;
  const coordinates = mapState.motion.trail;
  const features = coordinates.length > 1 ? [{
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates,
    },
    properties: {},
  }] : [];
  source.setData({ type: 'FeatureCollection', features });
}

function updateMapboxRoute() {
  const map = mapState.mapboxInstance;
  if (!map || !mapState.mapboxReady) return;
  ensureRouteLayer();

  const trackedRide = selectedRideForDetails || nearbyRideRequests[0] || null;
  const driverPos = getMapDisplayPosition();
  const features = [];

  const pickupGeometry = Array.isArray(routeCache.pickupGeometry) && routeCache.pickupGeometry.length > 1
    ? routeCache.pickupGeometry
    : (trackedRide && driverPos
      ? [[driverPos.lng, driverPos.lat], [trackedRide.pickupLng, trackedRide.pickupLat]]
      : null);
  const dropoffGeometry = Array.isArray(routeCache.dropoffGeometry) && routeCache.dropoffGeometry.length > 1
    ? routeCache.dropoffGeometry
    : (trackedRide
      ? [[trackedRide.pickupLng, trackedRide.pickupLat], [trackedRide.dropoffLng, trackedRide.dropoffLat]]
      : null);

  if (pickupGeometry) {
    features.push({
      type: 'Feature',
      properties: { segment: 'pickup' },
      geometry: { type: 'LineString', coordinates: pickupGeometry },
    });
  }
  if (dropoffGeometry) {
    features.push({
      type: 'Feature',
      properties: { segment: 'dropoff' },
      geometry: { type: 'LineString', coordinates: dropoffGeometry },
    });
  }

  const source = map.getSource('driver-live-route');
  if (source) source.setData({ type: 'FeatureCollection', features });
  syncRouteLayerStyles();
  if (mapState.routeFitPending && features.length) {
    fitMapToTrackedRoute();
  }
}

function updateMapboxMarkers() {
  const map = mapState.mapboxInstance;
  if (!map || !mapState.mapboxReady || !window.mapboxgl) return;

  if (!mapState.markers.driver) {
    mapState.markers.driver = new window.mapboxgl.Marker({ element: createDriverMarkerElement() });
  }

  const driverPos = getMapDisplayPosition();
  if (driverPos) {
    mapState.markers.driver
      .setLngLat([driverPos.lng, driverPos.lat])
      .addTo(map);
    updateDriverMarkerVisuals(driverPos);
  }
  updateMarkerTrail();

  const trackedRide = getTrackedRide();
  if (trackedRide && mapState.routeVisible) {
    if (!mapState.markers.pickup) {
      mapState.markers.pickup = new window.mapboxgl.Marker({ element: createRouteMarkerElement('pickup') });
    }
    if (!mapState.markers.destination) {
      mapState.markers.destination = new window.mapboxgl.Marker({ element: createRouteMarkerElement('destination') });
    }
    mapState.markers.pickup
      .setLngLat([trackedRide.pickupLng, trackedRide.pickupLat])
      .setPopup(new window.mapboxgl.Popup({ offset: 16 }).setText('Pickup'))
      .addTo(map);
    mapState.markers.destination
      .setLngLat([trackedRide.dropoffLng, trackedRide.dropoffLat])
      .setPopup(new window.mapboxgl.Popup({ offset: 16 }).setText('Destination'))
      .addTo(map);
  } else {
    mapState.markers.pickup?.remove();
    mapState.markers.destination?.remove();
  }

  const activePassengerIds = new Set();
  nearbyRideRequests.forEach((ride) => {
    activePassengerIds.add(ride.id);
    let marker = mapState.markers.passengers.get(ride.id);
    if (!marker) {
      marker = new window.mapboxgl.Marker({ element: createPassengerMarkerElement() });
      marker.setPopup(new window.mapboxgl.Popup({ offset: 14 }).setText(
        `${ride.passengerName || ride.id} • pickup ${ride.pickupLat.toFixed(4)}, ${ride.pickupLng.toFixed(4)}`
      ));
      mapState.markers.passengers.set(ride.id, marker);
    }
    marker.setLngLat([ride.pickupLng, ride.pickupLat]).addTo(map);
  });

  for (const [rideId, marker] of mapState.markers.passengers.entries()) {
    if (!activePassengerIds.has(rideId)) {
      marker.remove();
      mapState.markers.passengers.delete(rideId);
    }
  }
}

function applyMapboxStyle() {
  const map = mapState.mapboxInstance;
  if (!map) return;
  const style = mapState.satelliteView ? MAPBOX_STYLE_SATELLITE : MAPBOX_STYLE_STREETS;
  map.setStyle(style);
}

function loadMapboxSdk() {
  if (window.mapboxgl) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-mapbox-sdk="1"]');
    if (existing) {
      existing.addEventListener('load', resolve, { once: true });
      existing.addEventListener('error', () => reject(new Error('Mapbox SDK failed to load')), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://api.mapbox.com/mapbox-gl-js/v3.4.0/mapbox-gl.js';
    script.async = true;
    script.dataset.mapboxSdk = '1';
    script.onload = resolve;
    script.onerror = () => reject(new Error('Mapbox SDK failed to load'));
    document.head.appendChild(script);
  });
}

async function initializeMapbox() {
  if (mapState.mapboxInstance) return;
  if (mapState.mapboxInitPromise) return mapState.mapboxInitPromise;
  if (!mapState.mapboxToken) {
    showMapTokenOverlay(true);
    return;
  }

  mapState.mapboxInitPromise = (async () => {
    await loadMapboxSdk();
    window.mapboxgl.accessToken = mapState.mapboxToken;
    const container = document.getElementById('mapbox');
    if (!container) throw new Error('Mapbox container missing');

    mapState.mapboxInstance = new window.mapboxgl.Map({
      container,
      style: MAPBOX_STYLE_STREETS,
      center: [DEFAULT_FALLBACK_LNG, DEFAULT_FALLBACK_LAT],
      zoom: mapState.zoom,
      pitch: 45,
      bearing: 0,
      antialias: true,
    });
    mapState.mapboxInstance.addControl(new window.mapboxgl.NavigationControl({ showCompass: true }), 'top-right');

    mapState.mapboxInstance.on('load', () => {
      mapState.mapboxReady = true;
      showMapTokenOverlay(false);
      ensureTrafficLayer();
      ensureTrailLayer();
      updateMapboxMarkers();
      updateMapboxRoute();
      queueMapRender();
    });
    mapState.mapboxInstance.on('style.load', () => {
      ensureTrafficLayer();
      ensureTrailLayer();
      updateMapboxRoute();
      updateMapboxMarkers();
    });
    mapState.mapboxInstance.on('moveend', () => {
      mapState.zoom = Math.max(10, Math.min(20, mapState.mapboxInstance.getZoom()));
    });
  })().catch(error => {
    console.error('Failed to initialize Mapbox map:', error);
    showAlert('warning', 'Unable to load Mapbox map.');
    mapState.mapboxInitPromise = null;
  });

  return mapState.mapboxInitPromise;
}

// ─── Route Estimation ─────────────────────────────────────────────────────────
async function fetchRouteEstimate(originLat, originLng, destLat, destLng) {
  if (![originLat, originLng, destLat, destLng].every(Number.isFinite)) {
    return buildRouteFallback(originLat, originLng, destLat, destLng, 'Route coordinates are unavailable.');
  }
  if (mapState.mapboxToken) {
    try {
      const url = new URL(`https://api.mapbox.com/directions/v5/mapbox/driving/${originLng},${originLat};${destLng},${destLat}`);
      url.searchParams.set('geometries', 'geojson');
      url.searchParams.set('overview', 'full');
      url.searchParams.set('steps', 'false');
      url.searchParams.set('alternatives', 'false');
      url.searchParams.set('access_token', mapState.mapboxToken);
      const response = await fetch(url.toString());
      const payload = await response.json().catch(() => null);
      if (response.ok) {
        const route = payload?.routes?.[0];
        if (route) {
          return {
            distKm: Number(route.distance || 0) / 1000,
            etaMin: Number(route.duration || 0) / 60,
            geometry: Array.isArray(route.geometry?.coordinates) ? route.geometry.coordinates : null,
            source: 'mapbox',
            warning: '',
          };
        }
      }
      return buildRouteFallback(
        originLat,
        originLng,
        destLat,
        destLng,
        getRouteWarningMessage(response.status, payload)
      );
    } catch (_e) {
      return buildRouteFallback(originLat, originLng, destLat, destLng, 'Live route lookup failed. Showing an estimated route.');
    }
  }
  return buildRouteFallback(originLat, originLng, destLat, destLng, 'Mapbox token missing. Showing an estimated route.');
}

function scheduleRouteRefresh(options = {}) {
  const { force = false, fitRoute = false } = options;
  if (fitRoute) mapState.routeFitPending = true;
  if (routeRefreshTimeoutId !== null) window.clearTimeout(routeRefreshTimeoutId);
  routeRefreshTimeoutId = window.setTimeout(() => {
    routeRefreshTimeoutId = null;
    recalculateRouteData({ force }).catch(error => {
      console.warn('Unable to refresh route data:', error);
    });
  }, force ? 0 : ROUTE_RECALC_DEBOUNCE_MS);
}

async function recalculateRouteData(options = {}) {
  const { force = false } = options;
  const driverLat = mapState.lastPosition?.lat ?? Number(currentProfile?.lat);
  const driverLng = mapState.lastPosition?.lng ?? Number(currentProfile?.lng);
  if (!Number.isFinite(driverLat) || !Number.isFinite(driverLng)) return;

  const trackedRide = getTrackedRide();
  const nextCacheKey = buildRouteCacheKey(driverLat, driverLng, trackedRide);
  const now = Date.now();
  const driverMovedKm = Number.isFinite(routeCache.driverLat) && Number.isFinite(routeCache.driverLng)
    ? calculateDistance(routeCache.driverLat, routeCache.driverLng, driverLat, driverLng)
    : Number.POSITIVE_INFINITY;
  const shouldReuseCache = !force
    && trackedRide
    && routeCache.cacheKey === nextCacheKey
    && now - routeCache.cachedAt < ROUTE_CACHE_TTL_MS
    && driverMovedKm < ROUTE_MOVEMENT_REFRESH_KM;
  if (shouldReuseCache) {
    updateMapUiReadouts();
    return;
  }

  if (!trackedRide) {
    routeCache = { ...createEmptyRouteCache(), cachedAt: now, statusMessage: 'Waiting for route' };
    updateMapUiReadouts();
    updateMapboxRoute();
    updateMapboxMarkers();
    return;
  }

  routeCache.loading = true;
  routeCache.statusMessage = 'Loading live route';
  routeCache.warning = '';
  updateMapUiReadouts();
  const [pickupResult, dropoffResult] = await Promise.all([
    fetchRouteEstimate(driverLat, driverLng, trackedRide.pickupLat, trackedRide.pickupLng),
    fetchRouteEstimate(trackedRide.pickupLat, trackedRide.pickupLng, trackedRide.dropoffLat, trackedRide.dropoffLng),
  ]);
  routeCache.pickupDistKm = pickupResult.distKm;
  routeCache.pickupEta = pickupResult.etaMin;
  routeCache.pickupDurationMin = pickupResult.etaMin;
  routeCache.pickupGeometry = pickupResult.geometry;
  routeCache.dropoffDistKm = dropoffResult.distKm;
  routeCache.dropoffDurationMin = dropoffResult.etaMin;
  routeCache.dropoffEta = [pickupResult.etaMin, dropoffResult.etaMin].reduce((total, value) => total + (Number.isFinite(value) ? value : 0), 0);
  routeCache.dropoffGeometry = dropoffResult.geometry;
  routeCache.totalDistKm = [pickupResult.distKm, dropoffResult.distKm].reduce((total, value) => total + (Number.isFinite(value) ? value : 0), 0);
  routeCache.totalDurationMin = routeCache.dropoffEta;
  routeCache.cacheKey = nextCacheKey;
  routeCache.driverLat = driverLat;
  routeCache.driverLng = driverLng;
  routeCache.cachedAt = Date.now();
  routeCache.loading = false;
  routeCache.warning = [pickupResult.warning, dropoffResult.warning].filter(Boolean).join(' ');
  routeCache.statusMessage = routeCache.warning ? 'Estimated route ready' : 'Live route ready';
  updateMapUiReadouts();
  updateMapboxRoute();
  updateMapboxMarkers();
}

// ─── Map UI Readouts ──────────────────────────────────────────────────────────
function updateMapUiReadouts() {
  const pos = getMapDisplayPosition();

  // Speed
  const speedEl = document.getElementById('gps-speed');
  if (speedEl) {
    const kmh = pos?.speed ?? 0;
    const mph = kmh * KMH_TO_MPH_FACTOR;
    speedEl.textContent = `${kmh.toFixed(1)} km/h · ${mph.toFixed(1)} mph`;
  }

  // Accuracy
  const accEl = document.getElementById('gps-accuracy');
  if (accEl) {
    const acc = pos?.accuracy;
    if (Number.isFinite(acc)) {
      const details = getGpsAccuracyDetails(acc);
      accEl.textContent = `±${Math.round(acc)} m (${details.label})`;
    } else if (mapState.gpsLoading) {
      accEl.textContent = 'Acquiring GPS...';
    } else {
      accEl.textContent = '--';
    }
  }

  // GPS Signal
  const sigEl = document.getElementById('gps-signal');
  if (sigEl) {
    let signalClassName = '';
    if (mapState.locationPermissionState === 'denied') {
      sigEl.textContent = 'Denied';
    } else if (mapState.gpsLoading) {
      sigEl.textContent = 'Acquiring GPS...';
    } else if (pos) {
      const details = getGpsAccuracyDetails(pos.accuracy || 999);
      sigEl.textContent = details.label;
      signalClassName = details.className;
    } else if (mapState.gpsRetryExhausted) {
      sigEl.textContent = 'Reconnecting';
    } else {
      sigEl.textContent = 'Waiting…';
    }
    sigEl.className = signalClassName;
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

  const avgSpeedEl = document.getElementById('avg-speed');
  if (avgSpeedEl) {
    const avgSpeed = mapState.motion.averageSpeedKmh || 0;
    avgSpeedEl.textContent = `${avgSpeed.toFixed(1)} km/h`;
  }

  const maxSpeedEl = document.getElementById('max-speed');
  if (maxSpeedEl) {
    const maxSpeed = mapState.motion.maxSpeedKmh || 0;
    maxSpeedEl.textContent = `${maxSpeed.toFixed(1)} km/h`;
  }

  const statusEl = document.getElementById('movement-status');
  if (statusEl) statusEl.textContent = mapState.motion.status || 'Waiting for GPS';

  const positionEl = document.getElementById('position-readout');
  if (positionEl) {
    positionEl.textContent = pos
      ? `${roundCoord(pos.lat)}, ${roundCoord(pos.lng)}`
      : '--';
  }

  const distTotalEl = document.getElementById('distance-total');
  if (distTotalEl) distTotalEl.textContent = formatDistance(routeCache.totalDistKm);

  const durationTotalEl = document.getElementById('duration-total');
  if (durationTotalEl) durationTotalEl.textContent = formatEta(routeCache.totalDurationMin);

  const pickupLegDistanceEl = document.getElementById('pickup-leg-distance');
  if (pickupLegDistanceEl) pickupLegDistanceEl.textContent = formatDistance(routeCache.pickupDistKm);

  const destinationLegDistanceEl = document.getElementById('destination-leg-distance');
  if (destinationLegDistanceEl) destinationLegDistanceEl.textContent = formatDistance(routeCache.dropoffDistKm);

  const pickupLegDurationEl = document.getElementById('pickup-leg-duration');
  if (pickupLegDurationEl) pickupLegDurationEl.textContent = formatEta(routeCache.pickupDurationMin);

  const destinationLegDurationEl = document.getElementById('destination-leg-duration');
  if (destinationLegDurationEl) destinationLegDurationEl.textContent = formatEta(routeCache.dropoffDurationMin);

  const totalTripDistanceEl = document.getElementById('total-trip-distance');
  if (totalTripDistanceEl) totalTripDistanceEl.textContent = formatDistance(routeCache.totalDistKm);

  const totalTripEtaEl = document.getElementById('total-trip-eta');
  if (totalTripEtaEl) totalTripEtaEl.textContent = formatEta(routeCache.dropoffEta);

  const routeStatusEl = document.getElementById('route-status');
  if (routeStatusEl) routeStatusEl.textContent = routeCache.statusMessage || 'Waiting for route';

  const routeLoadingEl = document.getElementById('route-loading-indicator');
  if (routeLoadingEl) routeLoadingEl.classList.toggle('d-none', !routeCache.loading);

  const routeVisibilityButton = document.getElementById('route-visibility-button');
  if (routeVisibilityButton) {
    routeVisibilityButton.textContent = mapState.routeVisible ? 'Hide Route' : 'Show Route';
    routeVisibilityButton.setAttribute('aria-pressed', String(mapState.routeVisible));
  }

  const routeNoteEl = document.getElementById('route-note');
  if (routeNoteEl) {
    const trackedRide = getTrackedRide();
    const defaultMessage = trackedRide
      ? 'Hover over a route line to highlight it, or use Refresh Route to fetch the latest navigation path.'
      : 'Enable location and select a ride request to visualize the route.';
    routeNoteEl.textContent = routeCache.warning || defaultMessage;
    routeNoteEl.classList.toggle('is-warning', Boolean(routeCache.warning));
  }

  const routeAnnouncer = document.getElementById('route-announcer');
  const routeAnnouncement = Number.isFinite(routeCache.totalDistKm) && Number.isFinite(routeCache.dropoffEta)
    ? `Route updated. Pickup in ${formatEta(routeCache.pickupEta)}. Destination ETA ${formatEta(routeCache.dropoffEta)}. Total trip distance ${formatDistance(routeCache.totalDistKm)}.`
    : '';
  if (routeAnnouncer && routeAnnouncement && routeAnnouncement !== routeCache.lastAnnouncement) {
    routeAnnouncer.textContent = routeAnnouncement;
    routeCache.lastAnnouncement = routeAnnouncement;
  }

  // Heading / Compass
  const heading = pos?.heading;
  const compassEl = document.getElementById('compass-indicator');
  const headingTextEl = document.getElementById('heading-text');
  if (compassEl && Number.isFinite(heading)) {
    compassEl.textContent = headingToCardinal(heading);
    compassEl.style.transform = `rotate(${heading}deg)`;
  }
  if (headingTextEl) {
    headingTextEl.textContent = Number.isFinite(heading)
      ? `Heading: ${Math.round(heading)}° ${headingToCardinal(heading)}`
      : 'Heading: --°';
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
  const map = mapState.mapboxInstance;
  if (!map || !mapState.mapboxReady) return;

  updateMapboxMarkers();
  updateMapboxRoute();

  const driverPos = getMapDisplayPosition();
  if (!driverPos) return;

  if (mapState.followMode && !mapState.routeFitPending) {
    const cameraTarget = calculateForwardOffsetPosition(
      driverPos.lat,
      driverPos.lng,
      driverPos.heading ?? 0,
      CAMERA_AHEAD_DISTANCE_KM
    ) || driverPos;
    const targetZoom = clamp(
      CAMERA_BASE_ZOOM - Math.min(driverPos.speed || 0, CAMERA_ZOOM_SPEED_CAP_KMH) / CAMERA_ZOOM_SPEED_DIVISOR,
      CAMERA_MIN_ZOOM,
      CAMERA_MAX_ZOOM
    );
    const now = performance.now();
    if ((now - mapState.motion.lastCameraSyncAt) >= CAMERA_UPDATE_THROTTLE_MS || mapState.motion.animationFrameId === null) {
      mapState.motion.lastCameraSyncAt = now;
      map.easeTo({
        center: [cameraTarget.lng, cameraTarget.lat],
        bearing: Number.isFinite(driverPos.heading) ? normalizeHeading(driverPos.heading) : 0,
        zoom: targetZoom,
        duration: 180,
        easing: easeInOutCubic,
        essential: true,
      });
    }
  }
}

// ─── GPS Tracking ─────────────────────────────────────────────────────────────
function commitPositionUpdate(nextPosition, { syncBackend = true, skipLog = false } = {}) {
  const previousPosition = mapState.lastPosition;
  const elapsedMs = previousPosition ? Math.max(0, nextPosition.timestamp - previousPosition.timestamp) : NaN;
  const distanceKm = previousPosition
    ? calculateDistance(previousPosition.lat, previousPosition.lng, nextPosition.lat, nextPosition.lng)
    : 0;

  mapState.prevPosition = previousPosition;
  mapState.lastPosition = nextPosition;
  mapState.lastUpdateAt = nextPosition.timestamp;
  mapState.locationPermissionState = 'granted';
  currentProfile = { ...(currentProfile || {}), lat: nextPosition.lat, lng: nextPosition.lng };
  saveLastKnownLocation(nextPosition.lat, nextPosition.lng, nextPosition.accuracy);
  updateMotionStats(nextPosition, previousPosition, distanceKm, elapsedMs);

  if (!skipLog) {
    appendGpsLogEntry(nextPosition.lat, nextPosition.lng, nextPosition.accuracy, nextPosition.heading ?? 0, nextPosition.speed ?? 0);
  }

  if (syncBackend) {
    syncDriverLocation(nextPosition.lat, nextPosition.lng, nextPosition.accuracy).catch(() => {});
  }
  recalculateRouteData().catch(() => {});
  queueDriverMarkerAnimation(nextPosition);
  updateMapUiReadouts();
}

async function handlePositionUpdate(positionLike, options = {}) {
  const lat = Number(positionLike.coords?.latitude ?? positionLike.lat);
  const lng = Number(positionLike.coords?.longitude ?? positionLike.lng);
  const accuracy = Number(positionLike.coords?.accuracy ?? positionLike.accuracy ?? DEFAULT_LOCATION_ACCURACY_M);
  const rawSpeed = positionLike.coords?.speed;  // m/s or null
  const rawHeading = positionLike.coords?.heading; // degrees or null
  const timestamp = Number(positionLike.timestamp ?? positionLike.updatedAt ?? Date.now());

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
  if (!Number.isFinite(timestamp)) return;

  const previousPosition = mapState.lastPosition;
  if (previousPosition && timestamp < previousPosition.timestamp - 1000) return;

  const distanceKm = previousPosition
    ? calculateDistance(previousPosition.lat, previousPosition.lng, lat, lng)
    : 0;
  const elapsedMs = previousPosition ? Math.max(0, timestamp - previousPosition.timestamp) : NaN;

  let speedKmh = calculateSpeedKmh(rawSpeed, distanceKm, elapsedMs, previousPosition?.speed ?? 0);

  let heading = (Number.isFinite(rawHeading) && rawHeading >= 0 && speedKmh > STOPPED_SPEED_THRESHOLD_KMH) ? rawHeading : null;
  if (heading === null && previousPosition) {
    if (distanceKm > MIN_MOVEMENT_DISTANCE_KM) {
      heading = calculateHeading(previousPosition.lat, previousPosition.lng, lat, lng);
    } else {
      heading = previousPosition.heading;
    }
  }

  const hadGpsIssue = mapState.gpsRetryCount > 0 || mapState.gpsRetryExhausted || mapState.gpsLoading;
  const nextPosition = {
    lat,
    lng,
    accuracy,
    heading: normalizeHeading(heading ?? 0),
    speed: Math.max(0, Math.min(speedKmh, MAX_REASONABLE_SPEED_KMH)),
    timestamp
  };
  if (isLikelyGpsJump(previousPosition, nextPosition, distanceKm, elapsedMs)) {
    console.warn('Discarding noisy GPS update', { previousPosition, nextPosition, distanceKm, elapsedMs });
    return;
  }
  mapState.gpsRetryCount = 0;
  mapState.gpsRetryExhausted = false;
  clearGpsRetryTimer();
  clearGpsAcquisitionTimeout();
  commitPositionUpdate(nextPosition, options);
  const accuracyDetails = getGpsAccuracyDetails(accuracy);
  setGpsStatus(`GPS connected • Accuracy ${accuracyDetails.label} (±${Math.round(accuracy)} m)`, { loading: false });
  if (hadGpsIssue) {
    logGpsEvent('info', 'GPS signal restored.', { lat, lng, accuracy });
  }
}

function handleGeoError(error) {
  logGpsEvent('warn', 'Geolocation error received.', error);
  if (error?.code === 1) {
    mapState.locationPermissionState = 'denied';
    clearGpsRetryTimer();
    clearGpsAcquisitionTimeout();
    mapState.motion.status = 'Location denied';
    updateMapUiReadouts();
    setGpsStatus('Location permission denied. Enable location access in your browser settings.', { loading: false });
    showAlert('warning', 'Location permission denied. Enable location access in your browser settings.');
    stopLocationTracking();
    return;
  }

  const isUnavailable = error?.code === 2;
  const errorLabel = isUnavailable ? 'GPS position unavailable.' : 'GPS signal lost.';
  mapState.motion.status = 'Signal lost';
  updateMapUiReadouts();
  setGpsStatus(`${errorLabel} Acquiring GPS...`, { loading: true });
  showAlert('warning', `${errorLabel} Retrying location updates…`);
  // Fall back to last known location for map display
  const fallback = getLastKnownLocation();
  if (fallback && !mapState.lastPosition) {
    commitPositionUpdate({
      lat: fallback.lat,
      lng: fallback.lng,
      accuracy: fallback.accuracy ?? DEFAULT_LOCATION_ACCURACY_M,
      heading: 0,
      speed: 0,
      timestamp: Date.now()
    }, { syncBackend: false, skipLog: true });
  }
  scheduleGpsRetry(error);
}

function scheduleGpsRetry(error) {
  clearGpsAcquisitionTimeout();
  if (gpsRetryTimeoutId !== null) return;

  const nextAttempt = mapState.gpsRetryCount + 1;
  if (nextAttempt > GPS_RETRY_MAX_ATTEMPTS) {
    mapState.gpsRetryExhausted = true;
    setGpsStatus('Waiting for GPS signal to return...', { loading: true });
    logGpsEvent('warn', 'GPS retry limit reached; keeping watch active for automatic recovery.', error);
    return;
  }

  mapState.gpsRetryCount = nextAttempt;
  const delay = GPS_RETRY_BASE_DELAY_MS * (2 ** (nextAttempt - 1)); // Retry delays before attempts 1-3: 2s, 4s, 8s
  setGpsStatus(`Acquiring GPS... retry ${nextAttempt}/${GPS_RETRY_MAX_ATTEMPTS} in ${Math.round(delay / 1000)}s`, { loading: true });
  logGpsEvent('info', `Scheduling GPS retry ${nextAttempt}/${GPS_RETRY_MAX_ATTEMPTS}.`, { delay, error });
  gpsRetryTimeoutId = window.setTimeout(() => {
    gpsRetryTimeoutId = null;
    restartLocationTracking({ reason: 'retry' }).catch(restartError => {
      logGpsEvent('error', 'GPS retry restart failed.', restartError);
    });
  }, delay);
}

function startGpsAcquisitionTimeout() {
  clearGpsAcquisitionTimeout();
  gpsAcquireTimeoutId = window.setTimeout(() => {
    logGpsEvent('warn', `GPS acquisition timed out after ${GPS_ACQUISITION_TIMEOUT_MS}ms.`);
    handleGeoError({ code: 3, message: 'GPS acquisition timed out.' });
  }, GPS_ACQUISITION_TIMEOUT_MS);
}

async function beginGeolocationWatch() {
  if (gpsWatchId !== null) return;
  startGpsAcquisitionTimeout();
  gpsWatchId = navigator.geolocation.watchPosition(handlePositionUpdate, handleGeoError, getGeolocationOptions());
  logGpsEvent('info', 'Started navigator.geolocation.watchPosition.', { watchId: gpsWatchId });
}

async function requestGeolocationPermission() {
  return new Promise(resolve => {
    navigator.geolocation.getCurrentPosition(
      async position => {
        logGpsEvent('info', 'Geolocation permission granted via prompt callback.');
        await handlePositionUpdate(position);
        resolve(true);
      },
      error => {
        logGpsEvent(error?.code === 1 ? 'warn' : 'error', 'Geolocation permission request failed.', error);
        handleGeoError(error);
        resolve(false);
      },
      getGeolocationOptions()
    );
  });
}

async function startLocationTracking({ reason = 'start' } = {}) {
  if (!navigator.geolocation) {
    logGpsEvent('error', 'Geolocation API is unavailable in this browser.');
    setGpsStatus('Geolocation is unavailable on this browser.', { loading: false });
    showAlert('warning', 'Geolocation is unavailable on this browser.');
    return;
  }
  if (gpsWatchId !== null) return; // already tracking

  // Check/request permission
  try {
    if (navigator.permissions?.query) {
      gpsPermissionStatus = await navigator.permissions.query({ name: 'geolocation' });
      mapState.locationPermissionState = gpsPermissionStatus.state;
      gpsPermissionStatus.onchange = () => {
        mapState.locationPermissionState = gpsPermissionStatus.state;
        logGpsEvent('info', `Geolocation permission changed to ${gpsPermissionStatus.state}.`);
        if (gpsPermissionStatus.state === 'denied') {
          handleGeoError({ code: 1, message: 'Geolocation permission denied.' });
        } else if (gpsPermissionStatus.state === 'granted' && gpsWatchId === null) {
          restartLocationTracking({ reason: 'permission-granted' }).catch(error => {
            logGpsEvent('error', 'Unable to restart GPS tracking after permission change.', error);
          });
        }
      };
      if (gpsPermissionStatus.state === 'denied') {
        handleGeoError({ code: 1, message: 'Geolocation permission denied.' });
        return;
      }
    }
  } catch (_e) {
    mapState.locationPermissionState = 'prompt';
  }

  logGpsEvent('info', `Starting GPS tracking (${reason}).`, { permission: mapState.locationPermissionState });
  setGpsStatus('Acquiring GPS...', { loading: true });
  if (mapState.locationPermissionState !== 'granted') {
    const permissionGranted = await requestGeolocationPermission();
    if (!permissionGranted && mapState.locationPermissionState === 'denied') return;
  }

  await beginGeolocationWatch();

  // Detect stale fixes and reconnect automatically when watchPosition stalls.
  gpsPollIntervalId = window.setInterval(() => {
    if (!mapState.lastUpdateAt || (Date.now() - mapState.lastUpdateAt) < GPS_STALE_POSITION_MS) return;
    logGpsEvent('warn', 'GPS updates are stale; restarting watchPosition.', { lastUpdateAt: mapState.lastUpdateAt });
    setGpsStatus('Acquiring GPS... stale fix detected.', { loading: true });
    stopLocationTracking();
    scheduleGpsRetry({ code: 3, message: 'GPS updates are stale.' });
  }, mapState.updateFrequencyMs);
}

function stopLocationTracking() {
  clearGpsAcquisitionTimeout();
  clearGpsRetryTimer();
  if (gpsWatchId !== null) {
    navigator.geolocation.clearWatch(gpsWatchId);
    gpsWatchId = null;
  }
  if (gpsPollIntervalId !== null) {
    window.clearInterval(gpsPollIntervalId);
    gpsPollIntervalId = null;
  }
  cancelMarkerAnimation();
}

async function restartLocationTracking({ reason = 'restart' } = {}) {
  stopLocationTracking();
  await startLocationTracking({ reason });
}

async function refreshTrackingFrequency() {
  if (gpsWatchId === null) return;
  await restartLocationTracking({ reason: 'frequency-change' });
}

async function ensureDriverLocation() {
  // If we already have a live position, nothing to do
  if (mapState.lastPosition) return;
  setGpsStatus('Acquiring GPS...', { loading: true });

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
            logGpsEvent('warn', 'Initial GPS acquisition failed.', err);
            reject(err);
          },
          { enableHighAccuracy: true, timeout: INITIAL_GPS_LOOKUP_TIMEOUT_MS, maximumAge: 1000 }
        );
      });
      await handlePositionUpdate({ coords: { latitude: coords.lat, longitude: coords.lng, accuracy: coords.accuracy, speed: null, heading: null } });
      return;
    } catch (_e) { /* fall through to fallback */ }
  }

  // Use fallback coords so map renders immediately
  mapState.centerLat = fallback.lat;
  mapState.centerLng = fallback.lng;
  commitPositionUpdate({
    lat: fallback.lat,
    lng: fallback.lng,
    accuracy: fallback.accuracy ?? DEFAULT_LOCATION_ACCURACY_M,
    heading: 0,
    speed: 0,
    timestamp: Date.now()
  }, { syncBackend: false, skipLog: true });
  setGpsStatus(stored ? 'Acquiring GPS... using last known location.' : 'Acquiring GPS... waiting for live location.', { loading: true });
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
  if (isProfileLoading) {
    profileDiv.innerHTML = '<div class="profile-card-item text-muted"><span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Loading driver profile...</div>';
    return;
  }
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

function setProfileLoading(nextLoading) {
  isProfileLoading = nextLoading;
  const button = document.getElementById('toggle-availability-button');
  if (button) button.disabled = nextLoading;
  renderProfile();
}

function buildFallbackDemoProfile() {
  return {
    userId: currentUser?.id || 'demo-driver',
    rating: 5,
    availabilityStatus: 'offline'
  };
}

async function validateAuthSession() {
  if (!accessToken) throw new Error('Missing access token');
  if (!currentUser?.id) throw new Error('Missing authenticated user');

  const { response, data } = await fetchJson(`${API_BASE_URL}/api/auth/sessions`, {
    headers: { Authorization: 'Bearer ' + accessToken }
  });

  if (!response.ok || !data?.ok) {
    throw new Error(data?.error || 'Authentication session is invalid');
  }
}

function getProfileError(data) {
  if (data?.error) return data.error;
  if (data?.ok === false) return 'driver not found';
  if (!data?.profile || typeof data.profile !== 'object') return 'driver profile missing';
  return null;
}

async function loadDriverProfile() {
  setProfileLoading(true);
  let lastError = null;

  try {
    for (let attempt = 1; attempt <= PROFILE_LOAD_MAX_RETRIES + 1; attempt += 1) {
      try {
        await validateAuthSession();

        const { response, data } = await fetchJson(`${API_BASE_URL}/api/drivers/me`, {
          headers: { Authorization: 'Bearer ' + accessToken }
        });
        const profileError = !response.ok ? (data?.error || `request failed (${response.status})`) : getProfileError(data);
        if (profileError) {
          throw new Error(profileError);
        }

        currentProfile = data.profile || {};
        renderAvailabilityControls();
        if (attempt > 1) {
          showAlert('success', 'Driver profile loaded after retry.');
        }
        return;
      } catch (error) {
        lastError = error;
        console.error('Driver profile load failed', {
          attempt,
          maxAttempts: PROFILE_LOAD_MAX_RETRIES + 1,
          userId: currentUser?.id,
          hasAccessToken: Boolean(accessToken),
          error
        });

        if (attempt <= PROFILE_LOAD_MAX_RETRIES) {
          showAlert('warning', `Retrying driver profile load (${attempt}/${PROFILE_LOAD_MAX_RETRIES})...`);
          await sleep(PROFILE_RETRY_DELAY_MS * attempt);
          continue;
        }
      }
    }

    const message = String(lastError?.message || '').toLowerCase();
    if (message.includes('authentication') || message.includes('access token') || message.includes('authenticated user')) {
      currentProfile = null;
      showAlert('danger', 'Session expired. Please sign in again.');
      window.setTimeout(() => handleLogout(), 1200);
    } else {
      currentProfile = buildFallbackDemoProfile();
      renderAvailabilityControls();
      showAlert('warning', 'Unable to load driver profile. Loaded fallback demo profile.');
    }
  } finally {
    setProfileLoading(false);
  }
}

// ─── Ride Rendering ───────────────────────────────────────────────────────────
function attachRideRequestSwipeControls(listDiv) {
  listDiv.querySelectorAll('[data-swipe-accept]').forEach(control => {
    const track = control.querySelector('.swipe-accept-track');
    const thumb = control.querySelector('[data-swipe-thumb]');
    const rideId = control.getAttribute('data-ride-id') || '';
    const passengerName = control.getAttribute('data-passenger-name') || 'passenger';
    if (!track || !thumb || !rideId) return;

    let pointerId = null;
    let currentOffset = 0;
    let startX = 0;
    const getMaxOffset = () => Math.max(track.clientWidth - thumb.clientWidth - SWIPE_ACCEPT_TRACK_PADDING, 0);
    const resetSwipe = () => {
      currentOffset = 0;
      thumb.style.transform = 'translateX(0px)';
      control.classList.remove('is-armed', 'is-decline-armed');
    };
    const updateSwipe = clientX => {
      const maxOffset = getMaxOffset();
      currentOffset = Math.max(-maxOffset, Math.min(maxOffset, clientX - startX));
      thumb.style.transform = `translateX(${currentOffset}px)`;
      const progress = maxOffset > 0 ? currentOffset / maxOffset : 0;
      control.classList.toggle('is-armed', progress >= SWIPE_ACCEPT_THRESHOLD);
      control.classList.toggle('is-decline-armed', progress <= -SWIPE_DECLINE_THRESHOLD);
    };
    const commitSwipe = async () => {
      const maxOffset = getMaxOffset();
      thumb.style.transform = `translateX(${maxOffset}px)`;
      control.classList.add('is-armed');
      await acceptRideById(rideId);
      resetSwipe();
    };
    const finalizeSwipe = async event => {
      if (pointerId !== event.pointerId) return;
      const maxOffset = getMaxOffset();
      const progress = maxOffset > 0 ? currentOffset / maxOffset : 0;
      const shouldAccept = progress >= SWIPE_ACCEPT_THRESHOLD;
      const shouldDecline = progress <= -SWIPE_DECLINE_THRESHOLD;
      pointerId = null;
      thumb.releasePointerCapture?.(event.pointerId);
      if (shouldAccept) {
        triggerHapticFeedback([18, 20, 18]);
        await commitSwipe();
      } else if (shouldDecline) {
        triggerHapticFeedback(35);
        const rejectedRideIds = new Set(getRejectedRideIds());
        rejectedRideIds.add(rideId);
        setRejectedRideIds(Array.from(rejectedRideIds));
        renderAvailableRideRequests();
        showAlert('warning', `Ride request from ${passengerName} declined.`);
      } else {
        resetSwipe();
      }
    };

    resetSwipe();
    track.tabIndex = 0;
    track.setAttribute('role', 'button');
    track.setAttribute('aria-label', `Swipe right to accept or left to decline ride request from ${passengerName}`);

    thumb.addEventListener('pointerdown', event => {
      if (acceptingRideIds.has(rideId)) return;
      pointerId = event.pointerId;
      startX = event.clientX - currentOffset;
      thumb.setPointerCapture?.(event.pointerId);
      event.preventDefault();
    });
    thumb.addEventListener('pointermove', event => {
      if (pointerId !== event.pointerId) return;
      updateSwipe(event.clientX);
    });
    thumb.addEventListener('pointerup', event => {
      finalizeSwipe(event).catch(() => {});
    });
    thumb.addEventListener('pointercancel', event => {
      finalizeSwipe(event).catch(() => {});
    });
    track.addEventListener('keydown', event => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      if (acceptingRideIds.has(rideId)) return;
      commitSwipe().catch(() => {});
    });
  });
}

function renderAvailableRideRequests() {
  const listDiv = document.getElementById('available-rides');
  const rejected = new Set(getRejectedRideIds());
  const rides = nearbyRideRequests.filter(ride => !rejected.has(ride.id));
  pruneRideRequestState(rides);

  if (!rides.length) {
    listDiv.innerHTML = '<div class="text-muted">No available ride requests right now.</div>';
    renderPassengerInfoPane();
    syncIncomingRideRequestPopup();
    renderDashboardSummary();
    queueMapRender();
    return;
  }

  listDiv.innerHTML = rides.map(ride => `
    <div class="ride-item incoming-request" data-ride-request-card data-ride-id="${escapeHtml(ride.id)}">
      <div class="ride-item-top">
        <div class="ride-request-passenger">
          <img class="passenger-photo" src="${escapeHtml(getPassengerPhotoUrl(ride))}" alt="${escapeHtml(`${ride.passengerName || 'Passenger'} photo`)}">
          <div>
            <div class="ride-passenger">${escapeHtml(ride.passengerName || 'Passenger')}</div>
            <div class="ride-id">${escapeHtml(ride.id)} &bull; ${Number(ride.passengerRating || 0).toFixed(1)} &star;</div>
          </div>
        </div>
        <div class="ride-request-status">
          <span class="countdown-pill" data-request-countdown data-expires-at="${getRideRequestExpiryTimestamp(ride)}"><i class="bi bi-stopwatch"></i> 00:00</span>
          <span class="ride-status">${escapeHtml(ride.status)}</span>
        </div>
      </div>
      <div class="ride-request-highlights">
        <div class="ride-meta ride-meta-highlight">
          <span>Estimated earnings</span>
          <strong>$${Number(ride.estimatedEarnings || 0).toFixed(2)}</strong>
        </div>
        <div class="ride-meta ride-meta-highlight">
          <span>Pickup distance</span>
          <strong>${escapeHtml(formatDistance(getRidePickupDistanceKm(ride)))}</strong>
        </div>
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
        <span class="ride-request-pill"><i class="bi bi-broadcast-pin"></i> Live incoming request</span>
      </div>
      <div class="swipe-accept" data-swipe-accept data-ride-id="${escapeHtml(ride.id)}" data-passenger-name="${escapeHtml(ride.passengerName || 'Passenger')}">
        <div class="swipe-accept-track">
          <span class="swipe-accept-label"><i class="bi bi-chevron-double-right"></i> Swipe accept</span>
          <button class="swipe-accept-thumb" data-swipe-thumb type="button" aria-label="Accept ride request"><i class="bi bi-arrow-right"></i></button>
        </div>
      </div>
      <div class="ride-footer mt-3">
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

  attachRideRequestSwipeControls(listDiv);
  updateRideRequestCountdowns();
  renderPassengerInfoPane();
  syncIncomingRideRequestPopup();
  queueMapRender();
}

async function loadAvailableRideRequests() {
  try {
    const { data } = await fetchJson(`${API_BASE_URL}/api/rides/history`, {
      headers: { Authorization: 'Bearer ' + accessToken }
    });
    if (data?.ok && Array.isArray(data.rides)) {
      nearbyRideRequests = data.rides
        .filter(ride => ['requested', 'accepted', 'arrived_at_pickup', 'started'].includes(ride.status))
        .map(normalizeRide);
      const nextRideIds = new Set(nearbyRideRequests.map(ride => ride.id));
      const newRideRequests = nearbyRideRequests.filter(ride => !knownRideRequestIds.has(ride.id));
      if (rideRequestFeedInitialized && newRideRequests.length) {
        newRideRequests.forEach(ride => {
          emitRideRequestAction('requesting', ride, { remainingMs: RIDE_REQUEST_ALERT_WINDOW_MS });
        });
        playIncomingRideAlert().catch(() => {});
        showAlert(
          'info',
          newRideRequests.length === 1
            ? `Incoming ride request from ${newRideRequests[0].passengerName || 'Passenger'}.`
            : `${newRideRequests.length} incoming ride requests are waiting.`
        );
      }
      knownRideRequestIds = nextRideIds;
      rideRequestFeedInitialized = true;
      cacheRealtimeSection('activeRides', nearbyRideRequests);
      publishRealtimeSnapshot('rides', data.rides).catch(() => {});
    } else {
      nearbyRideRequests = [];
    }
  } catch (_error) {
    const cache = getRealtimeCache();
    nearbyRideRequests = Array.isArray(cache.activeRides) ? cache.activeRides.map(normalizeRide) : [];
  }

  renderAvailableRideRequests();
  scheduleRouteRefresh();
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
  const accepted = allRides.filter(ride => ['accepted', 'arrived_at_pickup', 'started', 'completed'].includes(ride.status)).length;
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
      cacheRealtimeSection('completedRides', completedRideHistory);
      publishRealtimeSnapshot('rides', data.rides).catch(() => {});
    } else {
      completedRideHistory = [];
    }
  } catch (_error) {
    const cache = getRealtimeCache();
    completedRideHistory = Array.isArray(cache.completedRides) ? cache.completedRides.map(normalizeRide) : [];
  }
  renderRideHistory();
  renderPerformanceStats();
}

function getRideById(rideId) {
  return nearbyRideRequests.find(ride => ride.id === rideId) || completedRideHistory.find(ride => ride.id === rideId);
}

function syncSelectedRideFromState() {
  if (!selectedRideForDetails?.id) return selectedRideForDetails;
  const latestRide = getRideById(selectedRideForDetails.id);
  if (latestRide) selectedRideForDetails = latestRide;
  return selectedRideForDetails;
}

function renderRideFlowControls() {
  const ride = syncSelectedRideFromState();
  const arrivedButton = document.getElementById('arrived-button');
  const startTripButton = document.getElementById('start-trip-button');
  const endTripButton = document.getElementById('end-trip-button');
  const cancelTripButton = document.getElementById('cancel-trip-button');
  const noShowButton = document.getElementById('mark-no-show-button');
  const pickupDirectionsButton = document.getElementById('pickup-directions-button');
  const dropoffDirectionsButton = document.getElementById('dropoff-directions-button');
  const riderRatingControls = document.getElementById('rider-rating-controls');
  const fareBreakdownDiv = document.getElementById('ride-fare-breakdown');

  if (!ride) {
    [arrivedButton, startTripButton, endTripButton, cancelTripButton, noShowButton, pickupDirectionsButton, dropoffDirectionsButton].filter(Boolean).forEach(button => button.classList.add('d-none'));
    if (riderRatingControls) riderRatingControls.classList.add('d-none');
    if (fareBreakdownDiv) fareBreakdownDiv.textContent = '';
    return;
  }

  const fare = calculateFareBreakdown(ride);
  const fareLabel = ['completed', 'rated'].includes(ride.lifecycleState) ? 'Final Fare' : 'Estimated Fare';
  const waitMinutes = ride.waitingSince ? Math.max(0, Math.floor((Date.now() - new Date(ride.waitingSince).getTime()) / 60000)) : 0;
  fareBreakdownDiv.innerHTML = `
    <div><strong>${fareLabel}:</strong> $${fare.fare.toFixed(2)}</div>
    <div>Base $${fare.baseFare.toFixed(2)} + Distance $${fare.distanceFare.toFixed(2)} + Time $${fare.timeFare.toFixed(2)}</div>
    <div>Surge ${fare.surgeMultiplier.toFixed(2)}x • Service Fee $${fare.serviceFee.toFixed(2)} • Driver Earns $${fare.driverEarnings.toFixed(2)}</div>
    ${(fare.taxes || fare.tolls || fare.discounts || fare.tips)
      ? `<div>Taxes $${fare.taxes.toFixed(2)} • Tolls $${fare.tolls.toFixed(2)} • Discounts -$${fare.discounts.toFixed(2)} • Tips $${fare.tips.toFixed(2)}</div>`
      : ''}
    ${ride.waitingSince && ride.status === 'arrived_at_pickup' ? `<div>Waiting at pickup: ${waitMinutes} min</div>` : ''}
    ${ride.cancellationFeeCents ? `<div>Cancellation / No-show fee: $${(ride.cancellationFeeCents / 100).toFixed(2)}</div>` : ''}
  `;

  const isAccepted = ride.status === 'accepted';
  const isArrived = ride.status === 'arrived_at_pickup';
  const isStarted = ride.status === 'started';
  const isCompleted = ride.status === 'completed';
  const isCanceled = ride.status === 'canceled';

  arrivedButton.classList.toggle('d-none', !isAccepted);
  startTripButton.classList.toggle('d-none', !isArrived);
  endTripButton.classList.toggle('d-none', !isStarted);
  cancelTripButton.classList.toggle('d-none', !(isAccepted || isArrived));
  noShowButton.classList.toggle('d-none', !isArrived);
  pickupDirectionsButton.classList.toggle('d-none', isStarted || isCompleted);
  dropoffDirectionsButton.classList.toggle('d-none', !(isStarted || isCompleted || ride.lifecycleState === 'rated'));
  riderRatingControls.classList.toggle('d-none', !(isCompleted && !isCanceled && !hasPassengerRating(ride)));
}

function closeRideActionConfirmation() {
  pendingRideActionHandler = null;
  const container = document.getElementById('ride-action-confirmation');
  const fields = document.getElementById('ride-action-confirmation-fields');
  const input = document.getElementById('ride-action-confirmation-input');
  if (container) container.classList.add('d-none');
  if (fields) fields.classList.add('d-none');
  if (input) {
    input.value = '';
    input.placeholder = '';
    input.type = 'text';
  }
}

function openRideActionConfirmation(config) {
  const container = document.getElementById('ride-action-confirmation');
  const title = document.getElementById('ride-action-confirmation-title');
  const message = document.getElementById('ride-action-confirmation-message');
  const fields = document.getElementById('ride-action-confirmation-fields');
  const label = document.getElementById('ride-action-confirmation-label');
  const input = document.getElementById('ride-action-confirmation-input');
  const confirmButton = document.getElementById('ride-action-confirm-button');
  if (!container || !title || !message || !fields || !label || !input || !confirmButton) return;

  pendingRideActionHandler = config?.onConfirm || null;
  title.textContent = config?.title || 'Confirm Action';
  message.textContent = config?.message || '';
  const requiresInput = Boolean(config?.inputLabel);
  fields.classList.toggle('d-none', !requiresInput);
  label.textContent = config?.inputLabel || 'Details';
  input.type = config?.inputType || 'text';
  input.placeholder = config?.inputPlaceholder || '';
  input.value = config?.defaultValue || '';
  container.classList.remove('d-none');

  if (requiresInput) {
    input.focus();
    input.select();
  } else {
    confirmButton.focus();
  }
}

function confirmRideAction() {
  if (typeof pendingRideActionHandler !== 'function') {
    closeRideActionConfirmation();
    return;
  }
  const input = document.getElementById('ride-action-confirmation-input');
  const value = input ? input.value.trim() : '';
  const handler = pendingRideActionHandler;
  closeRideActionConfirmation();
  handler(value);
}

function renderRideDetailsModal(ride) {
  if (!ride) return;
  selectedRideForDetails = ride;
  const modal = document.getElementById('ride-details-modal');
  const content = document.getElementById('ride-details-content');
  const passengerRating = Number(ride.passengerRating);
  const passengerRatingText = Number.isFinite(passengerRating) ? `${passengerRating.toFixed(1)} ★` : 'N/A';
  const lifecycleLabel = formatLifecycleLabel(ride.lifecycleState, ride.status);
  const timeline = (Array.isArray(ride.events) ? ride.events : [])
    .slice()
    .reverse()
    .slice(0, 6)
    .map(event => `<div class="border rounded-3 p-2 mb-2"><div class="fw-semibold">${escapeHtml(event.title || formatRideStatus(event.type))}</div><div class="small text-muted">${escapeHtml(event.message || '')}</div><div class="small text-muted">${escapeHtml(formatTimestamp(event.createdAt))}</div></div>`)
    .join('');
  content.innerHTML = `
    <div class="ride-item mb-3">
      <div class="d-flex justify-content-between align-items-center gap-3">
        <div>
          <div class="text-muted small">Current Status</div>
          <div class="fw-semibold">${escapeHtml(lifecycleLabel)}</div>
        </div>
        <div class="text-end">
          <div class="text-muted small">Fare</div>
          <div class="fw-semibold">$${Number(calculateFareBreakdown(ride).fare || 0).toFixed(2)}</div>
        </div>
      </div>
    </div>
    <div><strong>Passenger:</strong> ${escapeHtml(ride.passengerName || 'Guest Rider')}</div>
    <div><strong>Passenger Rating:</strong> ${passengerRatingText}</div>
    <div><strong>Ride Status:</strong> ${escapeHtml(lifecycleLabel)}</div>
    <div><strong>Pickup:</strong> ${escapeHtml(formatCoordinate(ride.pickupLat, ride.pickupLng))}</div>
    <div><strong>Dropoff:</strong> ${escapeHtml(formatCoordinate(ride.dropoffLat, ride.dropoffLng))}</div>
    <div><strong>Trip Distance:</strong> ${Number(ride.miles || 0).toFixed(2)} mi</div>
    <div><strong>Duration:</strong> ${escapeHtml(formatMinutes(Number(ride.minutes || 0)))}</div>
    <div><strong>Arrived At:</strong> ${escapeHtml(formatTimestamp(ride.arrivedAt))}</div>
    <div><strong>Started At:</strong> ${escapeHtml(formatTimestamp(ride.startedAt))}</div>
    <div><strong>Completed At:</strong> ${escapeHtml(formatTimestamp(ride.completedAt))}</div>
    ${ride.cancellationReason ? `<div><strong>Cancellation Reason:</strong> ${escapeHtml(ride.cancellationReason)}</div>` : ''}
    <div class="mt-3">
      <div class="fw-semibold mb-2">Trip Timeline</div>
      ${timeline || '<div class="text-muted small">No trip updates yet.</div>'}
    </div>
  `;
  renderRideFlowControls();
  modal.classList.add('show');
  modal.setAttribute('aria-hidden', 'false');
  // Refresh route data for this ride
  routeCache.cachedAt = 0;
  scheduleRouteRefresh({ force: true, fitRoute: true });
  queueMapRender();
}

function closeRideDetailsModal() {
  const modal = document.getElementById('ride-details-modal');
  modal.classList.remove('show');
  modal.setAttribute('aria-hidden', 'true');
  document.getElementById('ride-fare-breakdown').textContent = '';
  document.getElementById('rider-rating-controls').classList.add('d-none');
  closeRideActionConfirmation();
  selectedRideForDetails = null;
  routeCache.cachedAt = 0;
  scheduleRouteRefresh({ force: true });
  queueMapRender();
}

async function performRideFlowAction(actionPath, successMessage, payload = {}) {
  const ride = syncSelectedRideFromState();
  if (!ride?.id) {
    showAlert('warning', 'Select an active ride to continue.');
    return;
  }

  try {
    const { data } = await fetchJson(`${API_BASE_URL}/api/rides/${actionPath}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + accessToken
      },
      body: JSON.stringify({ rideId: ride.id, ...payload })
    });
    if (!data?.ok) {
      showAlert('danger', data?.error || 'Unable to update ride status.');
      return;
    }
    await Promise.all([loadAvailableRideRequests(), loadRideHistory(), loadEarnings()]);
    const refreshedRide = getRefreshedRideOrFallback(ride, data.ride, { status: data?.ride?.status || ride.status });
    if (!refreshedRide) {
      showAlert('warning', 'Ride updated, but details are unavailable. Refreshing dashboard.');
      closeRideDetailsModal();
      return;
    }
    renderRideDetailsModal(refreshedRide);
    showAlert('success', successMessage);
  } catch (_error) {
    showAlert('danger', 'Unable to update ride status.');
  }
}

function handleArrivedAtPickup() {
  performRideFlowAction('arrive', 'Marked as arrived at pickup.');
}

function handleStartTrip() {
  openRideActionConfirmation({
    title: 'Start Trip',
    message: 'Confirm rider pickup and begin navigation to the destination.',
    onConfirm: () => performRideFlowAction('start', 'Trip started.', { riderConfirmed: true })
  });
}

function handleEndTrip() {
  openRideActionConfirmation({
    title: 'End Trip',
    message: 'Confirm trip completion at the destination and finalize payment.',
    onConfirm: () => performRideFlowAction('complete', 'Trip ended successfully.')
  });
}

function handleMarkNoShow() {
  openRideActionConfirmation({
    title: 'Mark Rider No-Show',
    message: 'Confirm that the rider did not arrive. You can optionally attach a photo evidence URL.',
    inputLabel: 'Photo evidence URL (optional)',
    inputPlaceholder: 'https://example.com/pickup-photo.jpg',
    inputType: 'url',
    onConfirm: photoEvidenceUrl => performRideFlowAction('no-show', 'Rider marked as no-show.', { manual: true, photoEvidenceUrl })
  });
}

function handleCancelTrip() {
  openRideActionConfirmation({
    title: 'Cancel Trip',
    message: 'Provide a short reason for the cancellation before ending the trip.',
    inputLabel: 'Cancellation reason',
    inputPlaceholder: 'traffic, wrong location, vehicle issue',
    defaultValue: 'driver_canceled_trip',
    onConfirm: reason => performRideFlowAction('driver-cancel', 'Trip canceled.', { reason: reason || 'driver_canceled_trip' })
  });
}

async function handleSubmitRiderRating() {
  const ride = syncSelectedRideFromState();
  if (!ride?.id || ride.status !== 'completed') {
    showAlert('warning', 'Complete a ride before submitting rider feedback.');
    return;
  }
  const rating = Number(document.getElementById('rider-rating-score').value);
  const comment = document.getElementById('rider-rating-comment').value.trim();
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    showAlert('warning', 'Rating must be between 1 and 5.');
    return;
  }

  try {
    const { data } = await fetchJson(`${API_BASE_URL}/api/rides/rate-passenger`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + accessToken
      },
      body: JSON.stringify({ rideId: ride.id, rating, comment })
    });
    if (!data?.ok) {
      showAlert('danger', data?.error || 'Unable to submit rider rating.');
      return;
    }
    await Promise.all([loadAvailableRideRequests(), loadRideHistory(), loadEarnings()]);
    const refreshedRide = getRefreshedRideOrFallback(ride, data.ride, { passengerRating: rating, passengerReview: comment });
    if (!refreshedRide) {
      showAlert('warning', 'Rating submitted, but details are unavailable. Refreshing dashboard.');
      closeRideDetailsModal();
      return;
    }
    renderRideDetailsModal(refreshedRide);
    showAlert('success', 'Rider rating submitted.');
  } catch (_error) {
    showAlert('danger', 'Unable to submit rider rating.');
  }
}

async function acceptRideById(rawRideId, options = {}) {
  const rideId = String(rawRideId || '').trim();
  if (!rideId) return false;
  if (acceptingRideIds.has(rideId)) {
    showAlert('info', `Ride ${rideId} is already being accepted.`);
    return false;
  }
  const existingRide = getRideById(rideId);
  if (rideRequestPopupState.rideId === rideId && rideRequestPopupState.phase === 'requesting') {
    setRideRequestPopupPhase('accepting', existingRide || normalizeRide({ id: rideId, status: 'requested' }, 0));
  }
  const rideIdInput = document.getElementById('ride-id-input');
  if (rideIdInput) rideIdInput.value = rideId;
  acceptingRideIds.add(rideId);
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
      return false;
    }
    showAlert('success', `Ride ${rideId} accepted.`);
    const acceptedRide = getRideById(rideId) || normalizeRide({ id: rideId, status: 'accepted' }, 0);
    emitRideRequestAction('accepted', acceptedRide, { source: options.source || 'manual' });
    if (rideRequestPopupState.rideId === rideId) {
      setRideRequestPopupPhase('accepted', acceptedRide);
    }
    renderRideDetailsModal(acceptedRide);
    await Promise.all([loadAvailableRideRequests(), loadRideHistory(), loadEarnings()]);
    document.getElementById('accept-ride-form')?.reset();
    return true;
  } catch (_error) {
    if (rideRequestPopupState.rideId === rideId) {
      setRideRequestPopupPhase('requesting', existingRide || normalizeRide({ id: rideId, status: 'requested' }, 0), {
        expiresAt: existingRide ? getRideRequestExpiryTimestamp(existingRide) : Date.now() + RIDE_REQUEST_ALERT_WINDOW_MS
      });
    }
    showAlert('danger', 'Unable to accept ride.');
    return false;
  } finally {
    acceptingRideIds.delete(rideId);
  }
}

async function handleAcceptRide(event) {
  event.preventDefault();
  const rideId = document.getElementById('ride-id-input').value.trim();
  if (!rideId) {
    showAlert('warning', 'Please enter a ride ID.');
    return;
  }
  await acceptRideById(rideId);
}

function handleRejectRide() {
  const rideId = document.getElementById('ride-id-input').value.trim();
  if (!rideId) {
    showAlert('warning', 'Enter a ride ID to reject.');
    return;
  }
  const ride = getRideById(rideId) || normalizeRide({ id: rideId, status: 'requested' }, 0);
  declineRideRequest(ride, 'declined');
}

function handleRidePopupKeyboardShortcuts(event) {
  if (rideRequestPopupState.phase !== 'requesting') return;
  if (event.defaultPrevented) return;
  const target = event.target;
  const tagName = target?.tagName;
  if (tagName === 'INPUT' || tagName === 'TEXTAREA' || target?.isContentEditable) return;
  const ride = getPopupRideSnapshot();
  if (!ride) return;
  if (event.key === 'Enter') {
    event.preventDefault();
    setRideRequestPopupPhase('accepting', ride);
    acceptRideById(ride.id, { source: 'keyboard' }).catch(() => {});
  } else if (event.key === 'Escape') {
    event.preventDefault();
    declineRideRequest(ride, 'declined');
  }
}

// ─── Earnings ─────────────────────────────────────────────────────────────────
function renderEarnings() {
  const earningsDiv = document.getElementById('earnings-info');
  const earningsCents = Number(earningsSnapshot.earningsCents);
  const rideCount = Number(earningsSnapshot.rideCount);
  if (!Number.isFinite(earningsCents) || !Number.isFinite(rideCount)) {
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
}
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
    earningsSnapshot = { earningsCents, rideCount };
    cacheRealtimeSection('earnings', earningsSnapshot);
    publishRealtimeSnapshot('earnings', earningsSnapshot).catch(() => {});
    renderEarnings();
  } catch (_error) {
    const cache = getRealtimeCache();
    if (cache.earnings && typeof cache.earnings === 'object') {
      earningsSnapshot = {
        earningsCents: Number(cache.earnings.earningsCents) || 0,
        rideCount: Number(cache.earnings.rideCount) || 0
      };
      renderEarnings();
      return;
    }
    earningsDiv.innerHTML = '<div class="text-danger">Unable to load earnings.</div>';
  }
}

function setActivePane(pane) {
  activePane = PANE_ORDER.includes(pane) ? pane : 'map';
  document.querySelectorAll('.dashboard-pane').forEach(section => {
    section.classList.toggle('is-active', section.dataset.pane === activePane);
  });
  document.querySelectorAll('.nav-tab').forEach(button => {
    button.classList.toggle('is-active', button.dataset.pane === activePane);
  });
}

function renderPassengerInfoPane() {
  const panel = document.getElementById('passenger-info-panel');
  if (!panel) return;
  const activeRide = nearbyRideRequests[0];
  if (!activeRide) {
    panel.textContent = 'No active passenger selected yet.';
    return;
  }

  panel.innerHTML = `
    <div class="ride-request-passenger">
      <img class="passenger-photo" src="${escapeHtml(getPassengerPhotoUrl(activeRide))}" alt="${escapeHtml(`${activeRide.passengerName || 'Passenger'} photo`)}">
      <div>
        <div class="ride-passenger">${escapeHtml(activeRide.passengerName || 'Passenger')}</div>
        <div class="ride-id">${escapeHtml(activeRide.id)} &bull; ${Number(activeRide.passengerRating || 0).toFixed(1)} &star;</div>
      </div>
    </div>
    <div class="ride-route mt-3">
      <span><i class="bi bi-geo-alt"></i> Pickup</span>
      <strong>${escapeHtml(formatCoordinate(activeRide.pickupLat, activeRide.pickupLng))}</strong>
    </div>
    <div class="ride-route">
      <span><i class="bi bi-pin-map"></i> Dropoff</span>
      <strong>${escapeHtml(formatCoordinate(activeRide.dropoffLat, activeRide.dropoffLng))}</strong>
    </div>
  `;
}

function setupBottomSheetControls() {
  const root = document.documentElement;
  const body = document.querySelector('.sheet-body');
  const handle = document.querySelector('.sheet-handle');
  const backdrop = document.getElementById('sheet-backdrop');
  if (!body || !handle) return;

  const updateSheetUiState = () => {
    const isExpanded = sheetState.currentHeight > sheetState.minHeight + 12;
    backdrop?.classList.toggle('is-visible', isExpanded);
  };

  const recalculateBounds = () => {
    const viewportHeight = window.innerHeight || 760;
    const collapsed = Math.max(108, Math.round(viewportHeight * 0.2));
    const half = Math.max(collapsed + 72, Math.round(viewportHeight * 0.5));
    const full = Math.max(half + 72, Math.min(Math.round(viewportHeight * 0.9), viewportHeight - 18));
    sheetState.minHeight = collapsed;
    sheetState.maxHeight = full;
    sheetState.snapPoints = [collapsed, half, full];
    sheetState.currentHeight = Math.max(sheetState.minHeight, Math.min(sheetState.currentHeight, sheetState.maxHeight));
    root.style.setProperty('--sheet-height', `${sheetState.currentHeight}px`);
    root.style.setProperty('--sheet-min-height', `${sheetState.minHeight}px`);
    updateSheetUiState();
  };

  const snapToNearest = ({ momentum = 0 } = {}) => {
    if (!sheetState.snapPoints.length) return;
    const projectedHeight = sheetState.currentHeight + momentum * 120;
    const nearest = sheetState.snapPoints.reduce((closest, value) =>
      Math.abs(value - projectedHeight) < Math.abs(closest - projectedHeight) ? value : closest, sheetState.snapPoints[0]);
    sheetState.currentHeight = nearest;
    root.style.setProperty('--sheet-height', `${nearest}px`);
    updateSheetUiState();
  };

  const onPointerDown = event => {
    sheetState.isDragging = true;
    sheetState.dragStartY = event.clientY;
    sheetState.dragStartHeight = sheetState.currentHeight;
    sheetState.lastDragY = event.clientY;
    sheetState.lastDragAt = performance.now();
    sheetState.velocity = 0;
    handle.style.cursor = 'grabbing';
    event.preventDefault();
  };

  const onPointerMove = event => {
    if (!sheetState.isDragging) return;
    const delta = sheetState.dragStartY - event.clientY;
    if (Math.abs(delta) < SHEET_DRAG_THRESHOLD) return;
    const resistance = Math.abs(delta) > 210 ? 0.84 : 1;
    sheetState.currentHeight = Math.max(sheetState.minHeight, Math.min(sheetState.maxHeight, sheetState.dragStartHeight + (delta * resistance)));
    const now = performance.now();
    const elapsed = Math.max(now - sheetState.lastDragAt, 1);
    sheetState.velocity = (sheetState.lastDragY - event.clientY) / elapsed;
    sheetState.lastDragY = event.clientY;
    sheetState.lastDragAt = now;
    root.style.setProperty('--sheet-height', `${sheetState.currentHeight}px`);
    updateSheetUiState();
  };

  const onPointerUp = () => {
    if (!sheetState.isDragging) return;
    sheetState.isDragging = false;
    handle.style.cursor = 'grab';
    snapToNearest({ momentum: sheetState.velocity });
  };

  recalculateBounds();
  window.addEventListener('resize', recalculateBounds);
  window.addEventListener('orientationchange', () => {
    window.setTimeout(() => {
      recalculateBounds();
      mapState.mapboxInstance?.resize?.();
    }, 80);
  });
  handle.addEventListener('pointerdown', onPointerDown);
  handle.addEventListener('dblclick', () => {
    const [collapsed, , expanded] = sheetState.snapPoints;
    sheetState.currentHeight = Math.abs(sheetState.currentHeight - collapsed) <= Math.abs(sheetState.currentHeight - expanded) ? expanded : collapsed;
    root.style.setProperty('--sheet-height', `${sheetState.currentHeight}px`);
    updateSheetUiState();
    triggerHapticFeedback(20);
  });
  backdrop?.addEventListener('click', () => {
    sheetState.currentHeight = sheetState.minHeight;
    root.style.setProperty('--sheet-height', `${sheetState.currentHeight}px`);
    updateSheetUiState();
  });
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerUp);
}

function setupPaneSwipeNavigation() {
  const panes = document.querySelector('.dashboard-panes');
  if (!panes) return;
  let touchStartX = 0;
  let touchStartY = 0;
  let tracking = false;

  panes.addEventListener('pointerdown', event => {
    if (event.pointerType !== 'touch') return;
    touchStartX = event.clientX;
    touchStartY = event.clientY;
    tracking = true;
  });

  panes.addEventListener('pointerup', event => {
    if (!tracking || event.pointerType !== 'touch') return;
    tracking = false;
    const deltaX = event.clientX - touchStartX;
    const deltaY = event.clientY - touchStartY;
    if (Math.abs(deltaY) > SWIPE_VERTICAL_THRESHOLD) return;
    if (Math.abs(deltaX) < SWIPE_HORIZONTAL_THRESHOLD) return;
    const index = PANE_ORDER.indexOf(activePane);
    if (index < 0) return;
    if (deltaX < 0 && index < PANE_ORDER.length - 1) setActivePane(PANE_ORDER[index + 1]);
    if (deltaX > 0 && index > 0) setActivePane(PANE_ORDER[index - 1]);
  });
}

function setupFloatingActions() {
  const stack = document.getElementById('fab-stack');
  const mainFab = document.getElementById('fab-main');
  const fabSettings = document.getElementById('fab-settings');
  const fabSupport = document.getElementById('fab-support');
  const fabNavigation = document.getElementById('fab-navigation');
  const fabStatus = document.getElementById('fab-status');
  if (!stack || !mainFab) return;

  const setExpanded = expanded => {
    stack.classList.toggle('is-expanded', expanded);
    mainFab.setAttribute('aria-expanded', expanded ? 'true' : 'false');
  };

  mainFab.addEventListener('click', () => {
    const next = !stack.classList.contains('is-expanded');
    setExpanded(next);
    triggerHapticFeedback(15);
  });
  fabSettings?.addEventListener('click', () => {
    window.location.href = '/driver-settings.html';
  });
  fabSupport?.addEventListener('click', () => {
    window.open('tel:+18005550123', '_self');
  });
  fabNavigation?.addEventListener('click', () => {
    openDirections('pickup');
  });
  fabStatus?.addEventListener('click', () => {
    toggleAvailability().catch(() => {});
  });
  document.addEventListener('click', event => {
    if (!stack.contains(event.target)) {
      setExpanded(false);
    }
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
  const disableFollowMode = () => {
    mapState.followMode = false;
    const btn = document.getElementById('follow-mode-button');
    if (!btn) return;
    btn.innerHTML = '<i class="bi bi-geo-alt"></i> Follow: OFF';
    btn.classList.replace('btn-primary', 'btn-outline-primary');
  };

  // Follow mode toggle
  document.getElementById('follow-mode-button').addEventListener('click', () => {
    mapState.followMode = !mapState.followMode;
    const btn = document.getElementById('follow-mode-button');
    if (mapState.followMode) {
      btn.innerHTML = '<i class="bi bi-geo-alt-fill"></i> Follow Driver: ON';
      btn.classList.replace('btn-outline-primary', 'btn-primary');
      mapState.panX = 0;
      mapState.panY = 0;
    } else {
      btn.innerHTML = '<i class="bi bi-geo-alt"></i> Follow Driver: OFF';
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
    applyMapboxStyle();
    queueMapRender();
  });

  // Zoom in
  document.getElementById('zoom-in-button').addEventListener('click', () => {
    if (mapState.mapboxInstance) {
      mapState.mapboxInstance.zoomIn({ duration: 250 });
      mapState.zoom = Math.min(20, mapState.mapboxInstance.getZoom() + 1);
    } else {
      mapState.zoom = Math.min(20, mapState.zoom + 1);
    }
    queueMapRender();
  });

  // Zoom out
  document.getElementById('zoom-out-button').addEventListener('click', () => {
    if (mapState.mapboxInstance) {
      mapState.mapboxInstance.zoomOut({ duration: 250 });
      mapState.zoom = Math.max(10, mapState.mapboxInstance.getZoom() - 1);
    } else {
      mapState.zoom = Math.max(10, mapState.zoom - 1);
    }
    queueMapRender();
  });

  // Mouse wheel zoom on map
  document.getElementById('map-shell').addEventListener('wheel', event => {
    if (mapState.mapboxInstance) return;
    event.preventDefault();
    mapState.zoom = Math.max(10, Math.min(20, mapState.zoom + (event.deltaY < 0 ? 1 : -1)));
    queueMapRender();
  }, { passive: false });

  // Pan by dragging
  const shell = document.getElementById('map-shell');
  const supportsPointerCapture = typeof shell.setPointerCapture === 'function'
    && typeof shell.releasePointerCapture === 'function'
    && typeof shell.hasPointerCapture === 'function';
  shell.addEventListener('pointerdown', event => {
    if (mapState.mapboxInstance) return;
    if (mapState.activePointerId !== null && mapState.activePointerId !== event.pointerId) return;
    mapState.isDragging = true;
    mapState.activePointerId = event.pointerId;
    mapState.dragStartX = event.clientX;
    mapState.dragStartY = event.clientY;
    shell.style.cursor = 'grabbing';
    disableFollowMode();
    if (supportsPointerCapture) {
      shell.setPointerCapture(event.pointerId);
    }
  });
  window.addEventListener('pointermove', event => {
    if (mapState.mapboxInstance) return;
    if (!mapState.isDragging) return;
    if (mapState.activePointerId !== event.pointerId) return;
    mapState.panX += event.clientX - mapState.dragStartX;
    mapState.panY += event.clientY - mapState.dragStartY;
    mapState.dragStartX = event.clientX;
    mapState.dragStartY = event.clientY;
    queueMapRender();
  });
  const stopDragging = event => {
    if (typeof event?.pointerId === 'number' && event.pointerId !== mapState.activePointerId) return;
    if (supportsPointerCapture && mapState.activePointerId !== null && shell.hasPointerCapture(mapState.activePointerId)) {
      shell.releasePointerCapture(mapState.activePointerId);
    }
    mapState.isDragging = false;
    mapState.activePointerId = null;
    shell.style.cursor = 'grab';
  };
  window.addEventListener('pointerup', stopDragging);
  window.addEventListener('pointercancel', stopDragging);

  // Update frequency
  document.getElementById('update-frequency-input').addEventListener('change', event => {
    mapState.updateFrequencyMs = Number(event.target.value) || 3000;
    routeCache.cachedAt = 0;
    refreshTrackingFrequency().catch(() => {});
    scheduleRouteRefresh({ force: true });
    showAlert('info', `GPS update interval set to ${mapState.updateFrequencyMs / 1000}s.`);
  });

  // GPS simulation
  document.getElementById('simulate-gps-button').addEventListener('click', toggleGpsSimulation);
  document.getElementById('refresh-route-button')?.addEventListener('click', () => {
    routeCache.cachedAt = 0;
    scheduleRouteRefresh({ force: true, fitRoute: true });
    showAlert('info', 'Refreshing live route…');
  });
  document.getElementById('route-visibility-button')?.addEventListener('click', () => {
    mapState.routeVisible = !mapState.routeVisible;
    if (mapState.routeVisible) {
      mapState.routeFitPending = true;
    }
    updateMapboxRoute();
    updateMapboxMarkers();
    updateMapUiReadouts();
  });
  document.getElementById('mapbox-token-save')?.addEventListener('click', () => {
    const input = document.getElementById('mapbox-token-input');
    const token = String(input?.value || '').trim();
    if (!token) return;
    mapState.mapboxToken = token;
    localStorage.setItem(MAPBOX_TOKEN_STORAGE_KEY, token);
    showMapTokenOverlay(false);
    initializeMapbox().then(() => {
      routeCache.cachedAt = 0;
      scheduleRouteRefresh({ force: true, fitRoute: true });
      queueMapRender();
    });
  });
}

// ─── Periodic UI Refresh ──────────────────────────────────────────────────────
function startUiRefreshLoop() {
  // Refresh "X seconds ago" timestamps every 5 s
  window.setInterval(() => {
    if (mapState.lastUpdateAt) updateMapUiReadouts();
  }, 5000);
  startRideRequestCountdowns();
}

// ─── Page Lifecycle ───────────────────────────────────────────────────────────
window.addEventListener('load', async () => {
  accessToken = localStorage.getItem('accessToken');
  const refreshToken = localStorage.getItem('refreshToken');
  const userStr = localStorage.getItem('user');
  if (!accessToken || !refreshToken || !userStr) {
    console.error('Driver dashboard auth session is incomplete', {
      hasAccessToken: Boolean(accessToken),
      hasRefreshToken: Boolean(refreshToken),
      hasUser: Boolean(userStr)
    });
    window.location.href = '/index.html';
    return;
  }

  try {
    currentUser = JSON.parse(userStr);
  } catch (error) {
    console.error('Unable to parse stored driver session', { error, userStr });
    handleLogout();
    return;
  }

  if (!currentUser?.id || currentUser.role !== 'driver') {
    console.error('Invalid driver session role payload', { user: currentUser });
    window.location.replace('/dashboard.html');
    return;
  }

  // Wire up static UI controls
  document.addEventListener('pointerdown', () => {
    primeIncomingRideAudio().catch(() => {});
  }, { once: true });
  document.addEventListener('keydown', handleRidePopupKeyboardShortcuts);
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
  document.getElementById('arrived-button').addEventListener('click', handleArrivedAtPickup);
  document.getElementById('start-trip-button').addEventListener('click', handleStartTrip);
  document.getElementById('end-trip-button').addEventListener('click', handleEndTrip);
  document.getElementById('mark-no-show-button').addEventListener('click', handleMarkNoShow);
  document.getElementById('cancel-trip-button').addEventListener('click', handleCancelTrip);
  document.getElementById('ride-action-confirm-button').addEventListener('click', confirmRideAction);
  document.getElementById('ride-action-dismiss-button').addEventListener('click', closeRideActionConfirmation);
  document.getElementById('submit-rider-rating-button').addEventListener('click', handleSubmitRiderRating);
  document.getElementById('pickup-directions-button').addEventListener('click', () => openDirections('pickup'));
  document.getElementById('dropoff-directions-button').addEventListener('click', () => openDirections('dropoff'));
  document.querySelectorAll('.nav-tab').forEach(button => {
    button.addEventListener('click', () => setActivePane(button.dataset.pane || 'map'));
  });
  setupBottomSheetControls();
  setupPaneSwipeNavigation();
  setupFloatingActions();

  // Map controls
  setupMapControls();
  window.addEventListener('resize', () => {
    mapState.mapboxInstance?.resize?.();
  });
  mapState.mapboxToken = readMapboxToken();
  const mapboxTokenInput = document.getElementById('mapbox-token-input');
  if (mapboxTokenInput && mapState.mapboxToken) {
    mapboxTokenInput.value = mapState.mapboxToken;
  }
  if (!mapState.mapboxToken) {
    showMapTokenOverlay(true);
  }

  document.getElementById('driver-role').textContent = `Role: ${String(currentUser.role || 'driver').toUpperCase()}`;
  setActivePane('map');
  renderDocumentList();
  renderSupportLog();
  hydrateDashboardFromCache();

  // Background tracking: resume when tab becomes visible
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      requestWakeLock();
      routeCache.cachedAt = 0;
      scheduleRouteRefresh({ force: true });
      navigator.geolocation?.getCurrentPosition(handlePositionUpdate, handleGeoError, getGeolocationOptions());
    }
  });

  // Cleanup on unload
  window.addEventListener('beforeunload', () => {
    stopLocationTracking();
    if (gpsSimulationIntervalId !== null) window.clearInterval(gpsSimulationIntervalId);
    if (rideRequestCountdownIntervalId !== null) window.clearInterval(rideRequestCountdownIntervalId);
    if (routeRefreshTimeoutId !== null) window.clearTimeout(routeRefreshTimeoutId);
    if (wakeLockSentinel && typeof wakeLockSentinel.release === 'function') wakeLockSentinel.release().catch(() => {});
  });

  // Load data
  await Promise.all([loadDriverProfile(), loadAvailableRideRequests(), loadRideHistory(), loadEarnings()]);
  await initializeMapbox();
  await ensureDriverLocation();
  await requestWakeLock();
  startUiRefreshLoop();
  startRealtimeSync();
  await startLocationTracking();
  flushOfflineLocationQueue().catch(() => {});
  window.addEventListener('online', () => {
    flushOfflineLocationQueue().catch(() => {});
    startRealtimeSync();
    requestWakeLock();
    setRealtimeStatus('Back online: syncing rides, location, and earnings.', 'success');
  });
  window.addEventListener('offline', () => {
    setRealtimeStatus('Offline mode: showing cached dashboard data.', 'warning');
  });
  window.addEventListener('beforeunload', () => {
    clearRealtimeConnections();
    stopLocationTracking();
  });
  renderMap();
});
