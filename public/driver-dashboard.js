const API_BASE_URL = '';
const REJECTED_RIDES_KEY = 'driverRejectedRideIds';
const DRIVER_DOCS_KEY = 'driverDashboardDocs';
const DRIVER_SUPPORT_KEY = 'driverDashboardSupportLog';
const DRIVER_REALTIME_CONFIG_KEY = 'driverRealtimeConfig';
const DRIVER_REALTIME_CACHE_KEY = 'driverRealtimeCache';
const DRIVER_OFFLINE_LOCATION_QUEUE_KEY = 'driverOfflineLocationQueue';
const MAX_OFFLINE_LOCATION_QUEUE = 50;
const REALTIME_POLL_INTERVAL_MS = 12_000;

const MOCK_COMPLETED_RIDES = [
  { id: 'ride_hist_101', pickupLat: 37.775, pickupLng: -122.418, dropoffLat: 37.789, dropoffLng: -122.401, fareEstimate: 24.5, minutes: 21, passengerRating: 4.9, completedAt: '2026-05-31T10:12:00.000Z' },
  { id: 'ride_hist_102', pickupLat: 37.764, pickupLng: -122.431, dropoffLat: 37.752, dropoffLng: -122.447, fareEstimate: 18.75, minutes: 16, passengerRating: 4.7, completedAt: '2026-05-30T18:42:00.000Z' },
  { id: 'ride_hist_103', pickupLat: 37.781, pickupLng: -122.406, dropoffLat: 37.794, dropoffLng: -122.392, fareEstimate: 31.2, minutes: 27, passengerRating: 5, completedAt: '2026-05-29T07:58:00.000Z' }
];
const MOCK_NEARBY_REQUESTS = [
  { id: 'ride_live_201', pickupLat: 37.776, pickupLng: -122.419, dropoffLat: 37.792, dropoffLng: -122.408, fareEstimate: 22.4, minutes: 19, status: 'requested', passengerName: 'Ava J.', passengerRating: 4.8 },
  { id: 'ride_live_202', pickupLat: 37.771, pickupLng: -122.414, dropoffLat: 37.759, dropoffLng: -122.436, fareEstimate: 17.35, minutes: 14, status: 'requested', passengerName: 'Liam R.', passengerRating: 4.6 }
];

let currentUser = null;
let accessToken = null;
let currentProfile = null;
let nearbyRideRequests = [];
let completedRideHistory = [];
let selectedRideForDetails = null;
let earningsSnapshot = { earningsCents: 0, rideCount: 0 };
let realtimeSubscriptions = [];
let realtimePollers = [];
let geolocationWatchId = null;

function showAlert(kind, message) {
  const alertDiv = document.getElementById('driver-alert');
  alertDiv.className = `alert alert-${kind}`;
  alertDiv.classList.remove('d-none');
  alertDiv.textContent = message;
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
  nearbyRideRequests = rides.filter(ride => ['requested', 'accepted', 'started'].includes(ride.status));
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
  currentProfile = { ...(currentProfile || {}), lat, lng };
  cacheRealtimeSection('location', { lat, lng, updatedAt: payload?.updatedAt || new Date().toISOString() });
  renderProfile();
  renderMap();
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
  realtimeSubscriptions.forEach(unsub => {
    if (typeof unsub === 'function') unsub();
  });
  realtimeSubscriptions = [];
  realtimePollers.forEach(timer => clearInterval(timer));
  realtimePollers = [];
}

function startRealtimeSync() {
  clearRealtimeConnections();
  const driverBasePath = getDriverRealtimeBasePath();
  const databaseUrl = getFirebaseDatabaseUrl();
  if (!driverBasePath || !databaseUrl) return;

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

function startLocationTracking() {
  if (!navigator.geolocation || geolocationWatchId !== null) return;
  geolocationWatchId = navigator.geolocation.watchPosition(
    position => {
      syncDriverLocationToBackends({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        updatedAt: new Date().toISOString()
      }).catch(() => {});
    },
    () => {},
    { enableHighAccuracy: true, timeout: 8_000, maximumAge: 2_000 }
  );
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

function formatCoordinate(lat, lng) {
  if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) return 'Unknown location';
  return `${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)}`;
}

function normalizeRide(ride, index) {
  const pickupLat = Number(ride.pickupLat ?? ride.startLat);
  const pickupLng = Number(ride.pickupLng ?? ride.startLng);
  const dropoffLat = Number(ride.dropoffLat ?? ride.endLat);
  const dropoffLng = Number(ride.dropoffLng ?? ride.endLng);
  return {
    id: ride.id || `ride_mock_${index + 1}`,
    status: ride.status || 'requested',
    pickupLat: Number.isFinite(pickupLat) ? pickupLat : 37.7749,
    pickupLng: Number.isFinite(pickupLng) ? pickupLng : -122.4194,
    dropoffLat: Number.isFinite(dropoffLat) ? dropoffLat : 37.7849,
    dropoffLng: Number.isFinite(dropoffLng) ? dropoffLng : -122.4094,
    fareEstimate: Number(ride.fareEstimate || 0),
    minutes: Number(ride.minutes || 18),
    passengerRating: Number(ride.passengerRating || 4.8),
    passengerName: ride.passengerName || `Passenger ${index + 1}`,
    completedAt: ride.completedAt || ride.updatedAt || new Date().toISOString()
  };
}

function getCurrentAvailability() {
  return currentProfile?.availabilityStatus || 'offline';
}

function renderAvailabilityControls() {
  const availability = getCurrentAvailability();
  const pill = document.getElementById('availability-pill');
  const button = document.getElementById('toggle-availability-button');
  const isOnline = availability === 'online';
  pill.textContent = `Availability: ${availability.toUpperCase()}`;
  pill.style.background = isOnline ? '#e8f5e9' : '#e3f2fd';
  pill.style.color = isOnline ? '#1b5e20' : '#0d47a1';
  button.className = `btn btn-sm ${isOnline ? 'btn-warning' : 'btn-success'}`;
  button.innerHTML = isOnline
    ? '<i class="bi bi-toggle-off"></i> Go Offline'
    : '<i class="bi bi-toggle-on"></i> Go Online';
}

function renderProfile() {
  const profileDiv = document.getElementById('profile-info');
  if (!currentProfile) {
    profileDiv.innerHTML = '<div class="text-danger">Unable to load driver profile.</div>';
    return;
  }

  profileDiv.innerHTML = `
    <div><strong>User ID:</strong> ${escapeHtml(currentProfile.userId || currentUser.id || 'N/A')}</div>
    <div><strong>Email:</strong> ${escapeHtml(currentUser.email || 'N/A')}</div>
    <div><strong>Role:</strong> ${escapeHtml(String(currentUser.role || 'driver').toUpperCase())}</div>
    <div><strong>Availability:</strong> ${escapeHtml(currentProfile.availabilityStatus || 'offline')}</div>
    <div><strong>Rating:</strong> ${escapeHtml(currentProfile.rating ?? 'N/A')}</div>
  `;
}

async function ensureDriverLocation() {
  if (Number.isFinite(Number(currentProfile?.lat)) && Number.isFinite(Number(currentProfile?.lng))) return;
  const fallback = { lat: 37.7749, lng: -122.4194 };
  let coords = fallback;

  if (navigator.geolocation) {
    try {
      coords = await new Promise(resolve => {
        navigator.geolocation.getCurrentPosition(
          position => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
          () => resolve(fallback),
          { enableHighAccuracy: true, timeout: 4000 }
        );
      });
    } catch (_error) {
      coords = fallback;
    }
  }

  await syncDriverLocationToBackends(coords).catch(() => {
    currentProfile = { ...(currentProfile || {}), ...coords };
  });
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

function renderMap() {
  const mapShell = document.getElementById('map-shell');
  const caption = document.getElementById('map-caption');
  const existingPoints = mapShell.querySelectorAll('.map-point');
  existingPoints.forEach(point => point.remove());

  const driverLat = Number(currentProfile?.lat);
  const driverLng = Number(currentProfile?.lng);
  const hasDriverLocation = Number.isFinite(driverLat) && Number.isFinite(driverLng);

  const driverPoint = document.createElement('span');
  driverPoint.className = 'map-point point-driver';
  driverPoint.style.left = '50%';
  driverPoint.style.top = '50%';
  mapShell.appendChild(driverPoint);

  nearbyRideRequests.slice(0, 10).forEach((ride, index) => {
    const point = document.createElement('span');
    point.className = 'map-point point-ride';
    const latDelta = (ride.pickupLat - (hasDriverLocation ? driverLat : 37.7749)) * 230;
    const lngDelta = (ride.pickupLng - (hasDriverLocation ? driverLng : -122.4194)) * 230;
    const left = Math.max(6, Math.min(94, 50 + lngDelta));
    const top = Math.max(8, Math.min(92, 50 - latDelta));
    point.style.left = `${left}%`;
    point.style.top = `${top}%`;
    point.title = `${ride.id} • ${formatCoordinate(ride.pickupLat, ride.pickupLng)}`;
    mapShell.appendChild(point);
    if (index === 0) point.style.boxShadow = '0 0 0 3px rgba(25, 135, 84, 0.15)';
  });

  caption.textContent = hasDriverLocation
    ? `Driver at ${formatCoordinate(driverLat, driverLng)} • ${nearbyRideRequests.length} nearby ride request(s)`
    : `Location pending • ${nearbyRideRequests.length} nearby ride request(s) shown from mock data`;
}

function renderAvailableRideRequests() {
  const listDiv = document.getElementById('available-rides');
  const rejected = new Set(getRejectedRideIds());
  const rides = nearbyRideRequests.filter(ride => !rejected.has(ride.id));

  if (!rides.length) {
    listDiv.innerHTML = '<div class="text-muted">No available ride requests right now.</div>';
    renderMap();
    return;
  }

  listDiv.innerHTML = rides.map(ride => `
    <div class="ride-item">
      <div class="d-flex justify-content-between align-items-center">
        <div><strong>${escapeHtml(ride.id)}</strong> <span class="badge bg-info text-dark">${escapeHtml(ride.status)}</span></div>
        <button class="btn btn-outline-primary btn-sm choose-ride-button" data-ride-id="${escapeHtml(ride.id)}">Use Ride ID</button>
      </div>
      <div>Pickup: ${escapeHtml(formatCoordinate(ride.pickupLat, ride.pickupLng))}</div>
      <div>Dropoff: ${escapeHtml(formatCoordinate(ride.dropoffLat, ride.dropoffLng))}</div>
      <div>Estimated Fare: $${Number(ride.fareEstimate || 0).toFixed(2)} • ETA: ${Number(ride.minutes || 0)} mins</div>
    </div>
  `).join('');

  listDiv.querySelectorAll('.choose-ride-button').forEach(button => {
    button.addEventListener('click', () => {
      const rideIdInput = document.getElementById('ride-id-input');
      rideIdInput.value = button.getAttribute('data-ride-id') || '';
      rideIdInput.focus();
    });
  });

  renderMap();
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
    <div class="col-md-3 col-sm-6">
      <div class="metric-card">
        <div class="metric-label">${escapeHtml(stat.label)}</div>
        <div class="metric-value">${escapeHtml(stat.value)}</div>
      </div>
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
}

function closeRideDetailsModal() {
  const modal = document.getElementById('ride-details-modal');
  modal.classList.remove('show');
  modal.setAttribute('aria-hidden', 'true');
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

function renderEarnings() {
  const earningsDiv = document.getElementById('earnings-info');
  const earningsCents = Number(earningsSnapshot.earningsCents);
  const rideCount = Number(earningsSnapshot.rideCount);
  if (!Number.isFinite(earningsCents) || !Number.isFinite(rideCount)) {
    earningsDiv.innerHTML = '<div class="text-danger">Unable to load earnings.</div>';
    return;
  }
  earningsDiv.innerHTML = `
    <div><strong>Total Earnings:</strong> $${(earningsCents / 100).toFixed(2)}</div>
    <div><strong>Completed Ride Payouts:</strong> ${rideCount}</div>
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

async function toggleAvailability() {
  const current = getCurrentAvailability();
  const next = current === 'online' ? 'offline' : 'online';

  try {
    if (next === 'online') await ensureDriverLocation();
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

function handleLogout() {
  ['accessToken', 'refreshToken', 'user', 'drive.accessToken', 'drive.refreshToken', 'drive.user'].forEach(key => {
    localStorage.removeItem(key);
  });
  window.location.href = '/index.html';
}

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

  document.getElementById('driver-role').textContent = `Role: ${String(currentUser.role || 'driver').toUpperCase()}`;
  renderDocumentList();
  renderSupportLog();
  hydrateDashboardFromCache();

  await Promise.all([loadDriverProfile(), loadAvailableRideRequests(), loadRideHistory(), loadEarnings()]);
  startRealtimeSync();
  startLocationTracking();
  flushOfflineLocationQueue().catch(() => {});
  window.addEventListener('online', () => {
    flushOfflineLocationQueue().catch(() => {});
    startRealtimeSync();
    setRealtimeStatus('Back online: syncing rides, location, and earnings.', 'success');
  });
  window.addEventListener('offline', () => {
    setRealtimeStatus('Offline mode: showing cached dashboard data.', 'warning');
  });
  window.addEventListener('beforeunload', () => {
    clearRealtimeConnections();
    if (geolocationWatchId !== null && navigator.geolocation) navigator.geolocation.clearWatch(geolocationWatchId);
    geolocationWatchId = null;
  });
  renderMap();
});
