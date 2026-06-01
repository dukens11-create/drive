const API_BASE_URL = '';
const REJECTED_RIDES_KEY = 'driverRejectedRideIds';
const DRIVER_DOCS_KEY = 'driverDashboardDocs';
const DRIVER_SUPPORT_KEY = 'driverDashboardSupportLog';
const GPS_LOG_KEY = 'driverGpsTraceLog';
const LAST_LOCATION_KEY = 'driverLastKnownLocation';
const ROUTE_CACHE_TTL_MS = 60_000;
const MAPBOX_TOKEN_KEY = 'mapboxAccessToken';
const MAX_GPS_LOG_ENTRIES = 500;
const MIN_LOCATION_UPDATE_INTERVAL_MS = 1600;
const UPDATE_INTERVAL_BUFFER_MS = 300;
const ROAD_DISTANCE_FACTOR = 1.35;
const BASE_SIM_SPEED_MPS = 11;
const SIM_SPEED_VARIATION_MPS = 4;
const SIM_SPEED_OSCILLATION_PERIOD = 4;
const BASE_PROJECTION_SCALE = 220;
const MIN_SCALE_MULTIPLIER = 0.75;
const MAX_SCALE_MULTIPLIER = 2.2;
const REFERENCE_ZOOM_LEVEL = 16;
const ACCURACY_SCALE_DIVISOR = 5;
const MIN_ACCURACY_RADIUS_PERCENT = 2;
const MAX_ACCURACY_RADIUS_PERCENT = 24;
const GEOLOCATION_TIMEOUT_BUFFER_MS = 1500;
const DEFAULT_FALLBACK_LAT = 37.7749;
const DEFAULT_FALLBACK_LNG = -122.4194;
const DEFAULT_LOCATION_ACCURACY_M = 150;
const SIM_PATH_FREQUENCY = 5;
const SIM_COORDINATE_OFFSET = 0.00055;

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
let routeCache = new Map();
let mapRenderFrame = null;
let telemetrySyncAt = 0;
let wakeLockSentinel = null;
let gpsWatchId = null;
let gpsPollIntervalId = null;
let gpsSimulationIntervalId = null;
let isSimulatingGps = false;
let mapState = {
  centerLat: null,
  centerLng: null,
  zoom: 16,
  followMode: true,
  satelliteView: false,
  panX: 0,
  panY: 0,
  lastPosition: null,
  lastUpdateAt: null,
  speedMps: 0,
  heading: 0,
  accuracy: null,
  routeToPickup: null,
  routeToDropoff: null,
  etaPickupMinutes: null,
  etaDropoffMinutes: null,
  distanceToPickupKm: null,
  distanceToDropoffKm: null,
  debugMode: false,
  updateFrequencyMs: 3000,
  locationPermissionState: 'prompt'
};

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

function formatDistance(distanceInKm) {
  if (!Number.isFinite(distanceInKm)) return '--';
  const miles = distanceInKm * 0.621371;
  return `${distanceInKm.toFixed(2)} km • ${miles.toFixed(2)} mi`;
}

function formatMinutes(minutes) {
  if (!Number.isFinite(minutes)) return '--';
  if (minutes < 1) return '<1 min';
  return `${Math.round(minutes)} min`;
}

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function distanceKmBetween(fromLat, fromLng, toLat, toLng) {
  const lat1 = Number(fromLat);
  const lon1 = Number(fromLng);
  const lat2 = Number(toLat);
  const lon2 = Number(toLng);
  if (![lat1, lon1, lat2, lon2].every(Number.isFinite)) return NaN;
  const earthRadiusKm = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

function calculateBearing(fromLat, fromLng, toLat, toLng) {
  const lat1 = toRadians(Number(fromLat));
  const lat2 = toRadians(Number(toLat));
  const dLon = toRadians(Number(toLng) - Number(fromLng));
  if (![lat1, lat2, dLon].every(Number.isFinite)) return mapState.heading;
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2)
    - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  const bearing = (Math.atan2(y, x) * 180) / Math.PI;
  return (bearing + 360) % 360;
}

function getSignalStrengthText(accuracyMeters) {
  if (!Number.isFinite(accuracyMeters)) return 'Unknown';
  if (accuracyMeters <= 8) return 'Strong';
  if (accuracyMeters <= 20) return 'Good';
  if (accuracyMeters <= 40) return 'Fair';
  return 'Weak';
}

function setLastKnownLocation(lat, lng) {
  if (![lat, lng].every(Number.isFinite)) return;
  localStorage.setItem(LAST_LOCATION_KEY, JSON.stringify({ lat, lng, updatedAt: Date.now() }));
}

function getLastKnownLocation() {
  try {
    const parsed = JSON.parse(localStorage.getItem(LAST_LOCATION_KEY) || '{}');
    const lat = Number(parsed.lat);
    const lng = Number(parsed.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng, updatedAt: Number(parsed.updatedAt) || Date.now() };
  } catch (_error) {
    return null;
  }
}

function getMapboxToken() {
  const fromWindow = typeof window !== 'undefined' ? window.MAPBOX_ACCESS_TOKEN : '';
  const fromStorage = localStorage.getItem(MAPBOX_TOKEN_KEY) || '';
  const token = String(fromWindow || fromStorage || '').trim();
  return token || '';
}

function getGeolocationTimeoutMs() {
  return Math.max(4000, mapState.updateFrequencyMs + GEOLOCATION_TIMEOUT_BUFFER_MS);
}

function getGeolocationOptions() {
  return { enableHighAccuracy: true, timeout: getGeolocationTimeoutMs(), maximumAge: 1000 };
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
  const fallback = getLastKnownLocation() || { lat: DEFAULT_FALLBACK_LAT, lng: DEFAULT_FALLBACK_LNG, accuracy: DEFAULT_LOCATION_ACCURACY_M };
  let coords = fallback;

  if (navigator.geolocation) {
    try {
      coords = await new Promise(resolve => {
        navigator.geolocation.getCurrentPosition(
          position => resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: Number(position.coords.accuracy)
          }),
          error => {
            if (error?.code === 1) {
              mapState.locationPermissionState = 'denied';
              showAlert('warning', 'Location permission denied. Enable permissions to use live tracking.');
            } else if (error?.code === 2) {
              showAlert('warning', 'GPS position unavailable. Falling back to last known location.');
            } else if (error?.code === 3) {
              showAlert('warning', 'GPS request timed out. Retrying with fallback location.');
            }
            resolve(fallback);
          },
          getGeolocationOptions()
        );
      });
    } catch (_error) {
      coords = fallback;
    }
  }

  setLastKnownLocation(Number(coords.lat), Number(coords.lng));

  try {
    const { data } = await fetchJson(`${API_BASE_URL}/api/drivers/location`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + accessToken
      },
      body: JSON.stringify(coords)
    });
    if (data?.ok && data?.profile) {
      currentProfile = data.profile;
    }
  } catch (_error) {
    currentProfile = { ...(currentProfile || {}), ...coords };
  }

  const nextAccuracy = Number(coords.accuracy);
  mapState.accuracy = Number.isFinite(nextAccuracy) ? nextAccuracy : Number(mapState.accuracy);
  mapState.lastUpdateAt = Date.now();
  mapState.centerLat = Number(coords.lat);
  mapState.centerLng = Number(coords.lng);
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

function updateMapUiReadouts() {
  const speedKmh = Number(mapState.speedMps) * 3.6;
  const heading = Number(mapState.heading);
  const currentSpeed = document.getElementById('current-speed');
  const locationAccuracy = document.getElementById('location-accuracy');
  const gpsSignal = document.getElementById('gps-signal');
  const lastUpdate = document.getElementById('last-update');
  const etaPickup = document.getElementById('eta-pickup');
  const etaDropoff = document.getElementById('eta-dropoff');
  const distancePickup = document.getElementById('distance-pickup');
  const distanceDropoff = document.getElementById('distance-dropoff');
  const headingReadout = document.getElementById('heading-readout');
  const compassIndicator = document.getElementById('compass-indicator');
  const debugCoordinates = document.getElementById('debug-coordinates');

  if (currentSpeed) currentSpeed.textContent = `${Number.isFinite(speedKmh) ? speedKmh.toFixed(1) : '0.0'} km/h`;
  if (locationAccuracy) locationAccuracy.textContent = Number.isFinite(Number(mapState.accuracy)) ? `${Math.round(Number(mapState.accuracy))} m` : 'Unknown';
  if (gpsSignal) gpsSignal.textContent = getSignalStrengthText(Number(mapState.accuracy));
  if (lastUpdate) lastUpdate.textContent = mapState.lastUpdateAt ? new Date(mapState.lastUpdateAt).toLocaleTimeString() : '--';
  if (etaPickup) etaPickup.textContent = formatMinutes(mapState.etaPickupMinutes);
  if (etaDropoff) etaDropoff.textContent = formatMinutes(mapState.etaDropoffMinutes);
  if (distancePickup) distancePickup.textContent = formatDistance(mapState.distanceToPickupKm);
  if (distanceDropoff) distanceDropoff.textContent = formatDistance(mapState.distanceToDropoffKm);
  if (headingReadout) headingReadout.textContent = `Heading: ${Number.isFinite(heading) ? `${Math.round(heading)}°` : '--'}`;

  const compassDirections = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const directionIndex = Number.isFinite(heading) ? Math.round(heading / 45) % 8 : 0;
  if (compassIndicator) compassIndicator.textContent = compassDirections[directionIndex];

  if (debugCoordinates) {
    debugCoordinates.classList.toggle('d-none', !mapState.debugMode);
    const currentLat = Number(currentProfile?.lat);
    const currentLng = Number(currentProfile?.lng);
    debugCoordinates.textContent = `lat=${Number.isFinite(currentLat) ? currentLat.toFixed(6) : '--'} lng=${Number.isFinite(currentLng) ? currentLng.toFixed(6) : '--'} speed=${Number.isFinite(speedKmh) ? speedKmh.toFixed(2) : '0.00'}km/h accuracy=${Number.isFinite(Number(mapState.accuracy)) ? Math.round(Number(mapState.accuracy)) : '--'}m updates=${Math.round(mapState.updateFrequencyMs / 1000)}s`;
  }
}

function queueMapRender() {
  if (mapRenderFrame) return;
  mapRenderFrame = requestAnimationFrame(() => {
    mapRenderFrame = null;
    renderMap();
    updateMapUiReadouts();
  });
}

function roundCoord(value) {
  return Number(value).toFixed(4);
}

async function fetchRouteEstimate(origin, destination) {
  if (!origin || !destination) return null;
  const cacheKey = `${roundCoord(origin.lat)}:${roundCoord(origin.lng)}->${roundCoord(destination.lat)}:${roundCoord(destination.lng)}`;
  const cached = routeCache.get(cacheKey);
  if (cached && Date.now() - cached.cachedAt < ROUTE_CACHE_TTL_MS) return cached;

  const directDistanceKm = distanceKmBetween(origin.lat, origin.lng, destination.lat, destination.lng);
  const speedMps = Number(mapState.speedMps) > 1 ? Number(mapState.speedMps) : 9;
  const fallbackDurationMinutes = Number.isFinite(directDistanceKm)
    ? ((directDistanceKm * ROAD_DISTANCE_FACTOR) * 1000) / speedMps / 60
    : NaN;
  const fallback = {
    distanceKm: directDistanceKm,
    durationMinutes: fallbackDurationMinutes,
    geometry: [origin, destination],
    cachedAt: Date.now()
  };

  const token = getMapboxToken();
  if (!token) {
    routeCache.set(cacheKey, fallback);
    return fallback;
  }

  try {
    const response = await fetch(`https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?geometries=geojson&overview=full&access_token=${encodeURIComponent(token)}`);
    if (!response.ok) throw new Error('Failed route request');
    const body = await response.json();
    const route = Array.isArray(body.routes) ? body.routes[0] : null;
    if (!route) throw new Error('No route');
    const estimated = {
      distanceKm: Number(route.distance) / 1000,
      durationMinutes: Number(route.duration) / 60,
      geometry: Array.isArray(route.geometry?.coordinates)
        ? route.geometry.coordinates.map(([lng, lat]) => ({ lat: Number(lat), lng: Number(lng) }))
        : [origin, destination],
      cachedAt: Date.now()
    };
    routeCache.set(cacheKey, estimated);
    return estimated;
  } catch (_error) {
    routeCache.set(cacheKey, fallback);
    return fallback;
  }
}

async function recalculateRouteData() {
  const driverLat = Number(currentProfile?.lat);
  const driverLng = Number(currentProfile?.lng);
  if (![driverLat, driverLng].every(Number.isFinite)) return;

  const ride = selectedRideForDetails || nearbyRideRequests[0] || null;
  if (!ride) {
    mapState.routeToPickup = null;
    mapState.routeToDropoff = null;
    mapState.etaPickupMinutes = null;
    mapState.etaDropoffMinutes = null;
    mapState.distanceToPickupKm = null;
    mapState.distanceToDropoffKm = null;
    queueMapRender();
    return;
  }

  const pickup = { lat: Number(ride.pickupLat), lng: Number(ride.pickupLng) };
  const dropoff = { lat: Number(ride.dropoffLat), lng: Number(ride.dropoffLng) };
  const toPickup = await fetchRouteEstimate({ lat: driverLat, lng: driverLng }, pickup);
  mapState.routeToPickup = toPickup?.geometry || null;
  mapState.etaPickupMinutes = Number(toPickup?.durationMinutes);
  mapState.distanceToPickupKm = Number(toPickup?.distanceKm);

  if (selectedRideForDetails) {
    const pickupToDropoff = await fetchRouteEstimate(pickup, dropoff);
    mapState.routeToDropoff = pickupToDropoff?.geometry || null;
    mapState.etaDropoffMinutes = Number(pickupToDropoff?.durationMinutes);
    mapState.distanceToDropoffKm = Number(pickupToDropoff?.distanceKm);
  } else {
    mapState.routeToDropoff = null;
    mapState.etaDropoffMinutes = null;
    mapState.distanceToDropoffKm = null;
  }

  const nextZoom = Number.isFinite(mapState.distanceToPickupKm) && mapState.followMode
    ? mapState.distanceToPickupKm < 1 ? 17 : mapState.distanceToPickupKm < 3 ? 16 : 15
    : mapState.zoom;
  mapState.zoom = Math.max(15, Math.min(17, nextZoom));
  queueMapRender();
}

function appendGpsLogEntry(lat, lng) {
  if (![lat, lng].every(Number.isFinite)) return;
  const speedKmh = Number(mapState.speedMps) * 3.6;
  const rideId = selectedRideForDetails?.id || 'idle';
  const existing = getStoredList(GPS_LOG_KEY);
  const next = [{ rideId, lat, lng, speedKmh: Number.isFinite(speedKmh) ? Number(speedKmh.toFixed(2)) : 0, timestamp: new Date().toISOString() }, ...existing].slice(0, MAX_GPS_LOG_ENTRIES);
  setStoredList(GPS_LOG_KEY, next);
}

async function syncDriverLocation(lat, lng, accuracy) {
  if (!accessToken) return;
  if (Date.now() - telemetrySyncAt < 4000) return;
  telemetrySyncAt = Date.now();
  try {
    const { data } = await fetchJson(`${API_BASE_URL}/api/drivers/location`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + accessToken
      },
      body: JSON.stringify({ lat, lng, accuracy })
    });
    if (data?.ok && data?.profile) currentProfile = data.profile;
  } catch (_error) {
    currentProfile = { ...(currentProfile || {}), lat, lng };
  }
}

async function handlePositionUpdate(positionLike) {
  const coords = positionLike?.coords || positionLike;
  const lat = Number(coords?.latitude ?? coords?.lat);
  const lng = Number(coords?.longitude ?? coords?.lng);
  if (![lat, lng].every(Number.isFinite)) {
    showAlert('warning', 'GPS location unavailable. Using last known location.');
    const fallback = getLastKnownLocation();
    if (fallback) {
      currentProfile = { ...(currentProfile || {}), lat: fallback.lat, lng: fallback.lng };
      mapState.lastUpdateAt = Date.now();
      queueMapRender();
    }
    return;
  }

  const now = Date.now();
  const throttleFloorMs = Math.max(MIN_LOCATION_UPDATE_INTERVAL_MS, mapState.updateFrequencyMs - UPDATE_INTERVAL_BUFFER_MS);
  if (mapState.lastUpdateAt && now - mapState.lastUpdateAt < throttleFloorMs) return;

  const previous = mapState.lastPosition;
  const reportedHeading = Number(coords?.heading);
  const reportedSpeed = Number(coords?.speed);
  mapState.heading = Number.isFinite(reportedHeading) ? reportedHeading : previous ? calculateBearing(previous.lat, previous.lng, lat, lng) : mapState.heading;
  mapState.speedMps = Number.isFinite(reportedSpeed) && reportedSpeed >= 0 ? reportedSpeed : mapState.speedMps;
  mapState.accuracy = Number(coords?.accuracy);
  mapState.lastPosition = { lat, lng };
  mapState.lastUpdateAt = now;
  currentProfile = { ...(currentProfile || {}), lat, lng };

  setLastKnownLocation(lat, lng);
  appendGpsLogEntry(lat, lng);
  if (mapState.followMode) {
    mapState.centerLat = lat;
    mapState.centerLng = lng;
  }
  queueMapRender();
  await syncDriverLocation(lat, lng, mapState.accuracy);
  await recalculateRouteData();
}

function handleGeoError(error) {
  if (error?.code === 1) {
    mapState.locationPermissionState = 'denied';
    showAlert('warning', 'Location permission denied. Enable GPS permissions to track rides.');
    return;
  }
  showAlert('warning', 'GPS signal lost. Retrying location updates...');
  const fallback = getLastKnownLocation();
  if (fallback) {
    currentProfile = { ...(currentProfile || {}), lat: fallback.lat, lng: fallback.lng };
    mapState.lastUpdateAt = Date.now();
    queueMapRender();
  }
}

async function startLocationTracking() {
  if (!navigator.geolocation) {
    showAlert('warning', 'Geolocation is unavailable on this browser.');
    return;
  }
  if (gpsWatchId !== null) return;

  try {
    if (navigator.permissions?.query) {
      const permission = await navigator.permissions.query({ name: 'geolocation' });
      mapState.locationPermissionState = permission.state;
      permission.onchange = () => {
        mapState.locationPermissionState = permission.state;
        if (permission.state === 'denied') showAlert('warning', 'Location access denied. Tracking paused.');
      };
    }
  } catch (_error) {
    mapState.locationPermissionState = 'prompt';
  }

  gpsWatchId = navigator.geolocation.watchPosition(handlePositionUpdate, handleGeoError, getGeolocationOptions());

  gpsPollIntervalId = window.setInterval(() => {
    navigator.geolocation.getCurrentPosition(handlePositionUpdate, handleGeoError, getGeolocationOptions());
  }, mapState.updateFrequencyMs);
}

function stopLocationTracking() {
  if (gpsWatchId !== null) navigator.geolocation.clearWatch(gpsWatchId);
  gpsWatchId = null;
  if (gpsPollIntervalId) window.clearInterval(gpsPollIntervalId);
  gpsPollIntervalId = null;
}

async function refreshTrackingFrequency() {
  stopLocationTracking();
  await startLocationTracking();
}

function toggleGpsSimulation() {
  const button = document.getElementById('simulate-gps-button');
  if (isSimulatingGps) {
    window.clearInterval(gpsSimulationIntervalId);
    gpsSimulationIntervalId = null;
    isSimulatingGps = false;
    if (button) button.innerHTML = '<i class="bi bi-cpu"></i> Simulate GPS';
    return;
  }
  isSimulatingGps = true;
  if (button) button.innerHTML = '<i class="bi bi-stop-circle"></i> Stop Simulation';
  let step = 0;
  gpsSimulationIntervalId = window.setInterval(() => {
    step += 1;
    const baseLat = Number(currentProfile?.lat) || DEFAULT_FALLBACK_LAT;
    const baseLng = Number(currentProfile?.lng) || DEFAULT_FALLBACK_LNG;
    const next = {
      lat: baseLat + Math.sin(step / SIM_PATH_FREQUENCY) * SIM_COORDINATE_OFFSET,
      lng: baseLng + Math.cos(step / SIM_PATH_FREQUENCY) * SIM_COORDINATE_OFFSET,
      speed: BASE_SIM_SPEED_MPS + Math.abs(Math.sin(step / SIM_SPEED_OSCILLATION_PERIOD)) * SIM_SPEED_VARIATION_MPS,
      heading: (mapState.heading + 14) % 360,
      accuracy: 6 + (step % 3) * 2
    };
    handlePositionUpdate(next);
  }, mapState.updateFrequencyMs);
}

async function requestWakeLock() {
  if (!('wakeLock' in navigator)) return;
  try {
    if (!wakeLockSentinel || wakeLockSentinel.released) wakeLockSentinel = await navigator.wakeLock.request('screen');
  } catch (_error) {
    if (mapState.debugMode) console.warn('Wake lock request failed.');
  }
}

function renderMap() {
  const mapShell = document.getElementById('map-shell');
  const caption = document.getElementById('map-caption');
  const routeLayer = document.getElementById('map-route-layer');
  if (!mapShell || !caption || !routeLayer) return;

  mapShell.classList.toggle('satellite-view', mapState.satelliteView);
  mapShell.querySelectorAll('.map-dynamic').forEach(node => node.remove());
  routeLayer.innerHTML = '';

  const driverLat = Number(currentProfile?.lat ?? mapState.lastPosition?.lat);
  const driverLng = Number(currentProfile?.lng ?? mapState.lastPosition?.lng);
  const hasDriverLocation = Number.isFinite(driverLat) && Number.isFinite(driverLng);
  const fallback = getLastKnownLocation() || { lat: DEFAULT_FALLBACK_LAT, lng: DEFAULT_FALLBACK_LNG };

  if (!Number.isFinite(mapState.centerLat) || !Number.isFinite(mapState.centerLng)) {
    mapState.centerLat = hasDriverLocation ? driverLat : fallback.lat;
    mapState.centerLng = hasDriverLocation ? driverLng : fallback.lng;
  }
  if (hasDriverLocation && mapState.followMode) {
    mapState.centerLat = driverLat;
    mapState.centerLng = driverLng;
    mapState.panX = 0;
    mapState.panY = 0;
  }

  const scale = BASE_PROJECTION_SCALE * Math.max(MIN_SCALE_MULTIPLIER, Math.min(MAX_SCALE_MULTIPLIER, 2 ** (mapState.zoom - REFERENCE_ZOOM_LEVEL)));
  const project = (lat, lng) => {
    const left = 50 + ((Number(lng) - mapState.centerLng) * scale) + mapState.panX;
    const top = 50 - ((Number(lat) - mapState.centerLat) * scale) + mapState.panY;
    return { left: Math.max(2, Math.min(98, left)), top: Math.max(2, Math.min(98, top)) };
  };

  const trackedRide = selectedRideForDetails || nearbyRideRequests[0] || null;
  const pickup = trackedRide ? { lat: Number(trackedRide.pickupLat), lng: Number(trackedRide.pickupLng) } : null;
  const dropoff = trackedRide ? { lat: Number(trackedRide.dropoffLat), lng: Number(trackedRide.dropoffLng) } : null;

  const drawRoute = (coords, className) => {
    if (!Array.isArray(coords) || coords.length < 2) return;
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    path.setAttribute('class', className);
    path.setAttribute('points', coords.map(point => {
      const projected = project(point.lat, point.lng);
      return `${projected.left},${projected.top}`;
    }).join(' '));
    routeLayer.appendChild(path);
  };

  drawRoute(mapState.routeToPickup, 'route-pickup');
  drawRoute(mapState.routeToDropoff, 'route-dropoff');

  const createPoint = (className, lat, lng, title, rotationDeg) => {
    if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) return;
    const point = document.createElement('span');
    const projected = project(lat, lng);
    point.className = `map-point map-dynamic ${className}`;
    point.style.left = `${projected.left}%`;
    point.style.top = `${projected.top}%`;
    if (Number.isFinite(rotationDeg)) point.style.transform = `translate(-50%, -50%) rotate(${rotationDeg}deg)`;
    point.title = title;
    mapShell.appendChild(point);
  };

  if (hasDriverLocation) {
    const accuracy = Number(mapState.accuracy);
    if (Number.isFinite(accuracy)) {
      const radiusPercent = Math.max(MIN_ACCURACY_RADIUS_PERCENT, Math.min(MAX_ACCURACY_RADIUS_PERCENT, accuracy / ACCURACY_SCALE_DIVISOR));
      const accuracyCircle = document.createElement('span');
      const projected = project(driverLat, driverLng);
      accuracyCircle.className = 'map-accuracy map-dynamic';
      accuracyCircle.style.left = `${projected.left}%`;
      accuracyCircle.style.top = `${projected.top}%`;
      accuracyCircle.style.width = `${radiusPercent}%`;
      accuracyCircle.style.height = `${radiusPercent}%`;
      mapShell.appendChild(accuracyCircle);
    }
    createPoint('point-driver', driverLat, driverLng, `Driver • ${formatCoordinate(driverLat, driverLng)}`, Number(mapState.heading) || 0);
  }

  if (pickup) createPoint('point-pickup', pickup.lat, pickup.lng, `Pickup • ${formatCoordinate(pickup.lat, pickup.lng)}`);
  if (dropoff && selectedRideForDetails) createPoint('point-dropoff', dropoff.lat, dropoff.lng, `Dropoff • ${formatCoordinate(dropoff.lat, dropoff.lng)}`);
  nearbyRideRequests.slice(0, 10).forEach(ride => {
    createPoint('point-ride', Number(ride.pickupLat), Number(ride.pickupLng), `${ride.id} • ${formatCoordinate(ride.pickupLat, ride.pickupLng)}`);
  });

  const locationSummary = hasDriverLocation ? `Driver at ${formatCoordinate(driverLat, driverLng)}` : 'Location unavailable';
  const etaSummary = `ETA pickup ${formatMinutes(mapState.etaPickupMinutes)} • ETA dropoff ${formatMinutes(mapState.etaDropoffMinutes)}`;
  caption.textContent = `${locationSummary} • ${etaSummary} • zoom ${mapState.zoom}`;
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
    } else {
      nearbyRideRequests = [];
    }
  } catch (_error) {
    nearbyRideRequests = [];
  }

  if (!nearbyRideRequests.length) nearbyRideRequests = MOCK_NEARBY_REQUESTS.map(normalizeRide);
  renderAvailableRideRequests();
  await recalculateRouteData();
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
  recalculateRouteData();
}

function closeRideDetailsModal() {
  const modal = document.getElementById('ride-details-modal');
  modal.classList.remove('show');
  modal.setAttribute('aria-hidden', 'true');
  selectedRideForDetails = null;
  recalculateRouteData();
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
    selectedRideForDetails = acceptedRide;
    await Promise.all([loadAvailableRideRequests(), loadRideHistory(), loadEarnings()]);
    await recalculateRouteData();
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
  if (selectedRideForDetails?.id === rideId) selectedRideForDetails = null;
  showAlert('info', `Ride ${rideId} rejected from your local queue.`);
  renderAvailableRideRequests();
  recalculateRouteData();
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
    earningsDiv.innerHTML = `
      <div><strong>Total Earnings:</strong> $${(earningsCents / 100).toFixed(2)}</div>
      <div><strong>Completed Ride Payouts:</strong> ${rideCount}</div>
    `;
  } catch (_error) {
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
    if (next === 'online') {
      await startLocationTracking();
      await requestWakeLock();
    } else {
      stopLocationTracking();
    }
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
  stopLocationTracking();
  if (gpsSimulationIntervalId) window.clearInterval(gpsSimulationIntervalId);
  if (wakeLockSentinel && typeof wakeLockSentinel.release === 'function') {
    wakeLockSentinel.release().catch(() => {});
  }
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
  document.getElementById('follow-mode-button').addEventListener('click', () => {
    mapState.followMode = !mapState.followMode;
    document.getElementById('follow-mode-button').innerHTML = `<i class="bi bi-crosshair"></i> Follow Driver: ${mapState.followMode ? 'ON' : 'OFF'}`;
    queueMapRender();
  });
  document.getElementById('map-style-button').addEventListener('click', () => {
    mapState.satelliteView = !mapState.satelliteView;
    document.getElementById('map-style-button').innerHTML = `<i class="bi bi-globe"></i> View: ${mapState.satelliteView ? 'Satellite' : 'Map'}`;
    queueMapRender();
  });
  document.getElementById('zoom-in-button').addEventListener('click', () => {
    mapState.zoom = Math.min(17, mapState.zoom + 1);
    mapState.followMode = false;
    queueMapRender();
  });
  document.getElementById('zoom-out-button').addEventListener('click', () => {
    mapState.zoom = Math.max(15, mapState.zoom - 1);
    mapState.followMode = false;
    queueMapRender();
  });
  document.getElementById('pan-left-button').addEventListener('click', () => {
    mapState.panX -= 4;
    mapState.followMode = false;
    queueMapRender();
  });
  document.getElementById('pan-right-button').addEventListener('click', () => {
    mapState.panX += 4;
    mapState.followMode = false;
    queueMapRender();
  });
  document.getElementById('pan-up-button').addEventListener('click', () => {
    mapState.panY -= 4;
    mapState.followMode = false;
    queueMapRender();
  });
  document.getElementById('pan-down-button').addEventListener('click', () => {
    mapState.panY += 4;
    mapState.followMode = false;
    queueMapRender();
  });
  document.getElementById('debug-mode-toggle').addEventListener('change', event => {
    mapState.debugMode = Boolean(event.target.checked);
    queueMapRender();
  });
  document.getElementById('location-frequency-select').addEventListener('change', async event => {
    const next = Number(event.target.value);
    if (!Number.isFinite(next)) return;
    mapState.updateFrequencyMs = Math.min(5000, Math.max(2000, next));
    if (gpsSimulationIntervalId) {
      window.clearInterval(gpsSimulationIntervalId);
      gpsSimulationIntervalId = null;
      isSimulatingGps = false;
      document.getElementById('simulate-gps-button').innerHTML = '<i class="bi bi-cpu"></i> Simulate GPS';
    }
    await refreshTrackingFrequency();
    showAlert('info', `GPS update frequency set to ${Math.round(mapState.updateFrequencyMs / 1000)} second(s).`);
  });
  document.getElementById('simulate-gps-button').addEventListener('click', toggleGpsSimulation);

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      requestWakeLock();
      recalculateRouteData();
      navigator.geolocation?.getCurrentPosition(handlePositionUpdate, handleGeoError, getGeolocationOptions());
    }
  });
  window.addEventListener('beforeunload', () => {
    stopLocationTracking();
    if (gpsSimulationIntervalId) window.clearInterval(gpsSimulationIntervalId);
    if (wakeLockSentinel && typeof wakeLockSentinel.release === 'function') wakeLockSentinel.release().catch(() => {});
  });

  document.getElementById('driver-role').textContent = `Role: ${String(currentUser.role || 'driver').toUpperCase()}`;
  renderDocumentList();
  renderSupportLog();

  await Promise.all([loadDriverProfile(), loadAvailableRideRequests(), loadRideHistory(), loadEarnings()]);
  await ensureDriverLocation();
  await recalculateRouteData();
  await startLocationTracking();
  await requestWakeLock();
  queueMapRender();
});
