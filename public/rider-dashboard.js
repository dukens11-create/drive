const API_BASE_URL = '';
const MAPBOX_TOKEN_STORAGE_KEY = 'drive.mapboxToken';
const SHARED_RIDE_STORAGE_KEY = 'drive.sharedRideRequests.v1';
const SHARED_RIDE_STORAGE_VERSION = 1;
const RIDE_POLL_INTERVAL_MS = 2500;
const MIN_LOCATION_PUSH_INTERVAL_MS = 8000;
const DEFAULT_PICKUP = { lat: 37.7749, lng: -122.4194 };
const DEFAULT_DROPOFF_OFFSET_DEGREES = 0.01;
const RIDE_TYPE_MULTIPLIER = { ECONOMY: 1, COMFORT: 1.25, PREMIUM: 1.6 };
const ACTIVE_RIDE_STATUSES = ['requested', 'accepted', 'arrived_at_pickup', 'started'];
const MIN_TRIP_MINUTES = 6;
const MINUTES_PER_KM = 3.4;
const BASE_FARE_USD = 2.5;
const RATE_PER_MILE_USD = 1.9;
const RATE_PER_MINUTE_USD = 0.25;
const POPUP_DISPLAY_DURATION_MS = 2600;
const MAP_BOUNDS_PADDING_PX = 70;
const MAP_MAX_ZOOM_LEVEL = 15;
const MAP_BOUNDS_ANIMATION_MS = 500;
const CURRENT_LOCATION_TIMEOUT_MS = 12000;
const WATCH_LOCATION_TIMEOUT_MS = 10000;

let currentUser = null;
let accessToken = '';
let refreshToken = '';
let selectedRideType = 'ECONOMY';
let rides = [];
let currentRide = null;
let riderLocationWatchId = null;
let lastLocationPushAt = 0;

const mapState = {
  map: null,
  token: '',
  markers: { pickup: null, destination: null, driver: null, rider: null }
};

function parseJson(value, fallback) {
  try {
    return JSON.parse(value);
  } catch (_error) {
    return fallback;
  }
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
  return {
    id: ride.id || `rider_local_${Date.now()}_${index}`,
    riderId: ride.riderId || ride.userId || currentUser?.id || 'rider',
    riderName: ride.riderName || currentUser?.email || 'Rider',
    riderEmail: ride.riderEmail || currentUser?.email || '',
    pickupLat: fallbackPickup,
    pickupLng: fallbackPickupLng,
    dropoffLat: fallbackDropoff,
    dropoffLng: fallbackDropoffLng,
    pickupLabel: ride.pickupLabel || `${fallbackPickup.toFixed(5)}, ${fallbackPickupLng.toFixed(5)}`,
    destinationLabel: ride.destinationLabel || `${fallbackDropoff.toFixed(5)}, ${fallbackDropoffLng.toFixed(5)}`,
    rideType: String(ride.rideType || 'ECONOMY').toUpperCase(),
    miles: Number(ride.miles || 0),
    minutes: Number(ride.minutes || 0),
    fareEstimate: Number(ride.fareEstimate || 0),
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

async function estimateRideFare(pickup, dropoff) {
  const localEstimate = calculateLocalEstimate(pickup, dropoff, selectedRideType);
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
        rideType: selectedRideType
      })
    });
    if (!response.ok || !data?.ok) return localEstimate;
    return {
      miles: Number(data.route?.distanceMiles || localEstimate.miles),
      minutes: Number(data.route?.etaMinutes || localEstimate.minutes),
      fare: Number(data.fareEstimate || localEstimate.fare)
    };
  } catch (_error) {
    return localEstimate;
  }
}

async function requestRide(pickup, destination) {
  const estimate = await estimateRideFare(pickup, destination);
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
        const backendRide = normalizeRide({ ...baseRide, ...data.ride });
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
  const baseFare = BASE_FARE_USD;
  const distanceFare = miles * RATE_PER_MILE_USD;
  const timeFare = minutes * RATE_PER_MINUTE_USD;
  const multiplier = RIDE_TYPE_MULTIPLIER[rideType] || 1;
  const fare = Math.max(baseFare, (distanceFare + timeFare) * multiplier);
  return { miles, minutes, fare };
}

function parseCoordinateInput(inputValue) {
  const matches = String(inputValue || '').match(/(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)/);
  if (!matches) return null;
  const lat = Number(matches[1]);
  const lng = Number(matches[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

function getPickupAndDestination() {
  const pickup = parseCoordinateInput(document.getElementById('pickup-input').value) || DEFAULT_PICKUP;
  const destination = parseCoordinateInput(document.getElementById('destination-input').value) || {
    lat: pickup.lat + 0.012,
    lng: pickup.lng + 0.008
  };
  return { pickup, destination };
}

function getStatusViewModel(ride) {
  const status = String(ride?.status || 'idle');
  if (status === 'requested') {
    return { pill: 'Searching', message: 'searching for driver', step: 'searching' };
  }
  if (status === 'accepted') {
    return { pill: 'Assigned', message: 'driver assigned', step: 'assigned' };
  }
  if (status === 'arrived_at_pickup') {
    return { pill: 'Arriving', message: 'driver arriving', step: 'arriving' };
  }
  if (status === 'started') {
    return { pill: 'In trip', message: 'ride started', step: 'started' };
  }
  if (status === 'completed') {
    return { pill: 'Completed', message: 'ride completed', step: 'completed' };
  }
  if (status === 'canceled') {
    return { pill: 'Canceled', message: 'ride canceled', step: null };
  }
  return { pill: 'Idle', message: 'waiting for a new request', step: null };
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

function renderRideState() {
  const state = getStatusViewModel(currentRide);
  document.getElementById('ride-status-pill').textContent = state.pill;
  document.getElementById('status-message').textContent = currentRide
    ? `Status: ${state.message}`
    : 'Enter pickup and destination to request a ride.';
  updateTimeline(state.step);

  const assignedCard = document.getElementById('driver-assigned-card');
  const canShowDriverCard = currentRide && ['accepted', 'arrived_at_pickup', 'started'].includes(currentRide.status);
  assignedCard.classList.toggle('d-none', !canShowDriverCard);
  if (canShowDriverCard) {
    document.getElementById('driver-name').textContent = `Driver: ${currentRide.driverName || currentRide.driverId || '--'}`;
    const driverLocation = currentRide.driverLocation
      ? `${Number(currentRide.driverLocation.lat).toFixed(5)}, ${Number(currentRide.driverLocation.lng).toFixed(5)}`
      : '--';
    document.getElementById('driver-location').textContent = `Location: ${driverLocation}`;
    document.getElementById('driver-eta').textContent = `ETA: ${Number(currentRide.etaMinutes || currentRide.minutes || 0)} min`;
  }

  const cancelButton = document.getElementById('cancel-ride-button');
  cancelButton.disabled = !currentRide || !['requested', 'accepted', 'arrived_at_pickup'].includes(currentRide.status);

  renderMapState();
}

function showPopup(message) {
  const popup = document.getElementById('ride-popup');
  popup.textContent = message;
  popup.classList.remove('d-none');
  window.setTimeout(() => {
    popup.classList.add('d-none');
  }, POPUP_DISPLAY_DURATION_MS);
}

function renderFareEstimate(estimate) {
  document.getElementById('fare-estimate').textContent = `Fare estimate: $${estimate.fare.toFixed(2)} • ${estimate.miles.toFixed(1)} mi • ${estimate.minutes} min`;
}

async function refreshFareEstimate() {
  const { pickup, destination } = getPickupAndDestination();
  const estimate = await estimateRideFare(pickup, destination);
  renderFareEstimate(estimate);
  renderMapState();
}

function readMapboxToken() {
  const queryToken = new URLSearchParams(window.location.search).get('mapbox_token') || '';
  const storedToken = localStorage.getItem(MAPBOX_TOKEN_STORAGE_KEY) || '';
  const metaToken = String(document.querySelector('meta[name="mapbox-token"]')?.content || '').trim();
  return String(queryToken || storedToken || metaToken || '').trim();
}

async function initializeMap() {
  mapState.token = readMapboxToken();
  if (!mapState.token || typeof window.mapboxgl === 'undefined') {
    document.getElementById('map-fallback').classList.remove('d-none');
    return;
  }

  try {
    mapboxgl.accessToken = mapState.token;
    mapState.map = new mapboxgl.Map({
      container: 'mapbox',
      style: 'mapbox://styles/mapbox/navigation-night-v1',
      center: [DEFAULT_PICKUP.lng, DEFAULT_PICKUP.lat],
      zoom: 13
    });
    mapState.map.addControl(new mapboxgl.NavigationControl({ showCompass: true }), 'top-right');
    mapState.map.on('load', () => renderMapState());
  } catch (_error) {
    document.getElementById('map-fallback').classList.remove('d-none');
  }
}

function setMarker(name, lng, lat, color) {
  if (!mapState.map) return;
  const existing = mapState.markers[name];
  if (existing) {
    existing.setLngLat([lng, lat]);
    return;
  }
  mapState.markers[name] = new mapboxgl.Marker({ color }).setLngLat([lng, lat]).addTo(mapState.map);
}

function renderMapState() {
  if (!mapState.map) return;
  const { pickup, destination } = getPickupAndDestination();
  setMarker('pickup', pickup.lng, pickup.lat, '#26d07c');
  setMarker('destination', destination.lng, destination.lat, '#1b80ff');

  const driverLocation = currentRide?.driverLocation;
  if (driverLocation && Number.isFinite(Number(driverLocation.lat)) && Number.isFinite(Number(driverLocation.lng))) {
    setMarker('driver', Number(driverLocation.lng), Number(driverLocation.lat), '#ffbf47');
  }

  const riderLocation = currentRide?.riderLocation;
  if (riderLocation && Number.isFinite(Number(riderLocation.lat)) && Number.isFinite(Number(riderLocation.lng))) {
    setMarker('rider', Number(riderLocation.lng), Number(riderLocation.lat), '#ffffff');
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

  const sharedRides = readSharedRideStore().rides;
  rides = mergeRides(backendRides, sharedRides);
  writeSharedRideStore({ rides });
  selectCurrentRide();
  renderRideState();
}

async function handleRequestRide() {
  const { pickup, destination } = getPickupAndDestination();
  const ride = await requestRide(pickup, destination);
  currentRide = ride;
  rides = mergeRides([ride], readSharedRideStore().rides);
  renderRideState();
  showPopup('Ride request sent. Searching for driver...');
}

async function handleCancelRide() {
  if (!currentRide?.id) return;
  const canceledRide = await cancelRide(currentRide.id);
  if (canceledRide) {
    currentRide = normalizeRide(canceledRide);
    rides = mergeRides([currentRide], readSharedRideStore().rides);
    renderRideState();
    showPopup('Ride canceled.');
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

function setupSession() {
  accessToken = localStorage.getItem('accessToken') || '';
  refreshToken = localStorage.getItem('refreshToken') || '';
  currentUser = parseJson(localStorage.getItem('user') || '{}', {});

  if (!accessToken || !refreshToken || !currentUser?.id) {
    window.location.replace('/users.html');
    return false;
  }

  if (String(currentUser.role || '').toLowerCase() !== 'rider') {
    window.location.replace('/driver-dashboard.html');
    return false;
  }

  document.getElementById('rider-role').textContent = `Role: ${String(currentUser.role || 'rider').toUpperCase()}`;
  document.getElementById('profile-name').textContent = currentUser.email || 'Rider';
  document.getElementById('profile-meta').textContent = `Rider ID: ${currentUser.id}`;
  return true;
}

function setupHandlers() {
  document.getElementById('logout-button').addEventListener('click', handleLogout);
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
      refreshFareEstimate().catch(() => {});
    });
  });

  window.addEventListener('storage', event => {
    if (event.key === SHARED_RIDE_STORAGE_KEY) {
      syncRides().catch(() => {});
    }
  });
}

window.addEventListener('load', async () => {
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
