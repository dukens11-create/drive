const API_BASE_URL = '';
const MAPBOX_TOKEN_STORAGE_KEY = 'drive.mapboxToken';
const MAPBOX_GEOCODE_CACHE_STORAGE_KEY = 'drive.mapboxGeocodeCache.v1';
const SHARED_RIDE_STORAGE_KEY = 'drive.sharedRideRequests.v1';
const SHARED_RIDE_STORAGE_VERSION = 1;
const RIDE_POLL_INTERVAL_MS = 2500;
const MIN_LOCATION_PUSH_INTERVAL_MS = 8000;
const REQUEST_SUCCESS_ANIMATION_MS = 1200;
const DEFAULT_PICKUP = { lat: 37.7749, lng: -122.4194 };
const DEFAULT_DROPOFF_OFFSET_DEGREES = 0.01;
const POPUP_DISPLAY_DURATION_MS = 2600;
const MAP_BOUNDS_PADDING_PX = 80;
const MAP_MAX_ZOOM_LEVEL = 15;
const MAP_BOUNDS_ANIMATION_MS = 700;
const MAP_FLY_ANIMATION_MS = 800;
const MAP_FLY_MIN_ZOOM = 12;
const MAP_FLY_TARGET_ZOOM = 13;
const MAP_FLY_MAX_ZOOM = 14;
const CURRENT_LOCATION_TIMEOUT_MS = 12000;
const WATCH_LOCATION_TIMEOUT_MS = 10000;
const GEOCODE_DEBOUNCE_MS = 300;
const MIN_GEOCODE_QUERY_LENGTH = 3;
const MAX_GEOCODE_SUGGESTIONS = 5;
const GEOCODE_CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const SUGGESTION_HIDE_DELAY_MS = 200;
const DEFAULT_SERVICE_FEE_PERCENT = 0.12;
const MIN_TRIP_MINUTES = 4;
const MINUTES_PER_KM = 2.8;
const FARE_ESTIMATE_LOW_MULTIPLIER = 0.9;
const FARE_ESTIMATE_HIGH_MULTIPLIER = 1.15;
const MORNING_END_HOUR = 12;
const AFTERNOON_END_HOUR = 18;
const MAX_SURGE_MULTIPLIER = 2.5;
const SURGE_THRESHOLD_DOLLARS = 50;
const MAX_DISTANCE_MILES = 1000;
const MAX_DURATION_MINUTES = 1440;
const ESTIMATE_RETRY_INTERVAL_MS = 3000;
const ESTIMATE_MAX_RETRIES = 5;
const MIN_DRIVER_ETA_MINUTES = 3;
const MAX_DRIVER_ETA_MINUTES = 8;
const DRIVER_START_POSITION_OFFSET = 0.04; // ~2–3 miles in lat/lng degrees
const DRIVER_ASSIGN_DELAY_MIN_MS = 3000;
const DRIVER_ASSIGN_DELAY_MAX_MS = 5000;
const MIN_VALID_VEHICLE_YEAR = 1900;
const ACTIVE_RIDE_STATUSES = ['requested', 'accepted', 'arrived_at_pickup', 'started'];
const TOAST_MAX_VISIBLE = 3;
const LONG_DISTANCE_WARNING_MINUTES = 360;
const SUPPORTED_COUNTRY = 'United States';
const MINIMUM_STRIPE_AMOUNT_CENTS = 50;
const MAX_RIDE_DISTANCE_MILES = {
  ECONOMY: 80,
  COMFORT: 150,
  PREMIUM: 300
};
const MINIMUM_FARES = {
  ECONOMY: 6,
  COMFORT: 10,
  PREMIUM: 18
};
const ROUTE_DASH_FRAMES = [
  [0, 4, 3],
  [0.6, 4, 2.4],
  [1.2, 4, 1.8],
  [1.8, 4, 1.2],
  [2.4, 4, 0.6],
  [3, 4, 0]
];
const DRIVER_MARKER_LERP_MS = 650;
const VEHICLE_PRICING = {
  ECONOMY: { baseFare: 2.50, perMileFare: 1.25, perMinuteFare: 0.22 },
  COMFORT: { baseFare: 3.50, perMileFare: 1.69, perMinuteFare: 0.30 },
  PREMIUM: { baseFare: 5.00, perMileFare: 2.63, perMinuteFare: 0.46 }
};

const MOCK_DRIVER_POOL = [
  { name: 'Marcus J.', vehicle: 'Toyota Camry 2023', plate: 'TXR 2841', rating: 4.97, avatarInitial: 'M' },
  { name: 'Priya S.', vehicle: 'Honda Accord 2022', plate: 'AKX 5502', rating: 4.94, avatarInitial: 'P' },
  { name: 'Daniel W.', vehicle: 'Hyundai Sonata 2023', plate: 'GLF 1193', rating: 4.89, avatarInitial: 'D' },
  { name: 'Sofia R.', vehicle: 'Ford Fusion 2022', plate: 'MNT 7730', rating: 4.96, avatarInitial: 'S' },
  { name: 'Chris A.', vehicle: 'Chevrolet Malibu 2023', plate: 'BVP 4417', rating: 4.92, avatarInitial: 'C' }
];

let currentUser = null;
let accessToken = '';
let refreshToken = '';
let selectedRideType = 'ECONOMY';
let selectedPaymentMethod = localStorage.getItem('drive.paymentMethod') || 'card';
let stripe = null;
let stripeElements = null;
let paymentElement = null;
let stripeClientSecret = null;
let stripePublishableKeyPromise = null;
let savedCardLast4 = '';
let rides = [];
let currentRide = null;
let riderLocationWatchId = null;
let lastLocationPushAt = 0;
let latestEstimate = null;
let fareRequestSequence = 0;
let clockIntervalId = null;
let searchingDotsIntervalId = null;
let etaCountdownIntervalId = null;
let statusProgressionTimerId = null;
let assignedDriver = null;
let estimateRetryCount = 0;
let estimateRetryTimerId = null;
let latestKnownRiderPosition = null;
let isFareEstimateLoading = false;
const activeToasts = [];
const geocodeDebounceTimers = {};
const locationSuggestions = {
  'pickup-input': [],
  'destination-input': []
};
const resolvedLocations = {
  'pickup-input': null,
  'destination-input': null
};
const inputFeedbackState = {
  'pickup-input': { type: '', text: '' },
  'destination-input': { type: '', text: '' }
};
const rideValidationState = {
  routeCategory: 'Local',
  disabledReason: 'Enter a valid pickup and destination.',
  distanceMessage: '',
  longDistanceMessage: '',
  internationalMessage: '',
  selectedRideTypeAllowed: false,
  availableRideTypes: {
    ECONOMY: true,
    COMFORT: true,
    PREMIUM: true
  },
  isLongDistance: false
};

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
  routeTrafficLabel: 'Clear route',
  lastDriverPosition: null,
  driverHeading: 0,
  lastRideStatus: 'idle',
  hasFittedScene: false,
  lastFlyKey: '',
  pendingDriverAnimation: null
};

function parseJson(value, fallback) {
  try {
    return JSON.parse(value);
  } catch (_error) {
    return fallback;
  }
}

function getRandomDelay(minMs, maxMs) {
  return minMs + Math.random() * (maxMs - minMs);
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

function formatArrivalTimeFromMinutes(minutes) {
  const etaDate = new Date(Date.now() + Math.max(0, Number(minutes || 0)) * 60 * 1000);
  return etaDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function animateNumericText(id, nextText) {
  const node = document.getElementById(id);
  if (!node) return;
  if (node.textContent === nextText) return;
  node.classList.add('is-updating');
  window.setTimeout(() => {
    node.textContent = nextText;
    node.classList.remove('is-updating');
  }, 160);
}

function safeSetText(id, value) {
  const node = document.getElementById(id);
  if (node) node.textContent = value;
}

function sanitizePhoneForUri(value) {
  const normalized = String(value || '').trim();
  if (!normalized) return '';
  if (!/^[+0-9()\-\s]+$/.test(normalized)) return '';
  return normalized.replace(/\s+/g, '');
}

function normalizeRideTypeForApi(rideType = selectedRideType) {
  const normalized = String(rideType || '').trim().toLowerCase();
  if (normalized === 'economy' || normalized === 'comfort' || normalized === 'premium' || normalized === 'xl') {
    return normalized;
  }
  return 'economy';
}

function getDriverVehicleDisplay(vehicle = {}) {
  const label = String(vehicle.label || '').trim();
  const make = String(vehicle.make || '').trim();
  const model = String(vehicle.model || '').trim();
  const year = Number(vehicle.year);
  const color = String(vehicle.color || '').trim();
  const plateNumber = String(vehicle.plate || vehicle.plateNumber || vehicle.licensePlate || '').trim();
  const title = label || (make && model ? `${make} ${model}` : 'Vehicle details pending');
  const specs = [Number.isInteger(year) && year > MIN_VALID_VEHICLE_YEAR ? String(year) : '', color].filter(Boolean).join(' • ');
  return {
    title,
    specs,
    plate: plateNumber ? `Plate: ${plateNumber}` : 'Plate: ___',
    make,
    model,
    year: Number.isInteger(year) && year > MIN_VALID_VEHICLE_YEAR ? year : null,
    color,
    plateNumber
  };
}

function renderDriverCardDetails(driver = {}, etaMinutes = 0) {
  const assignedCard = document.getElementById('driver-assigned-card');
  if (!assignedCard) return;
  const fallbackVehicle = {
    make: driver.vehicleMake,
    model: driver.vehicleModel,
    color: driver.vehicleColor,
    plate: driver.licensePlate || driver.vehiclePlate || driver.plateNumber || driver.plate,
    photoUrl: driver.vehiclePhotoUrl || driver.vehicleImageUrl || driver.vehicleImage
  };
  const vehicle = driver.vehicle && typeof driver.vehicle === 'object'
    ? {
      ...driver.vehicle,
      plate: driver.vehicle.plate || driver.vehicle.plateNumber || driver.vehicle.licensePlate || fallbackVehicle.plate
    }
    : fallbackVehicle;
  const vehicleDisplay = getDriverVehicleDisplay(vehicle);
  safeSetText('driver-name', driver.name || currentRide?.driverName || currentRide?.driverId || '--');
  safeSetText('driver-vehicle', vehicleDisplay.title);
  safeSetText('driver-plate', vehicleDisplay.plate);
  safeSetText('driver-plate-vehicle', vehicleDisplay.plate);
  safeSetText('driver-vehicle-specs', vehicleDisplay.specs);
  safeSetText('driver-rating', `${Number(driver.rating || 4.9).toFixed(2)} ⭐`);

  const driverStatus = driver.driverStatus || (etaMinutes > 0 ? 'On the way' : 'Arrived');
  safeSetText('driver-status-text', driverStatus);

  const distanceAway = driver.distanceAway || currentRide?.distanceAway;
  const distanceText = distanceAway
    ? (typeof distanceAway === 'number' ? `${distanceAway.toFixed(1)} mi` : String(distanceAway))
    : '--';
  safeSetText('driver-distance-away', distanceText);

  if (!etaCountdownIntervalId) {
    animateNumericText('driver-eta', formatMinutes(etaMinutes || currentRide?.etaMinutes || currentRide?.minutes || 0));
    animateNumericText('driver-countdown', formatMinutes(etaMinutes || currentRide?.etaMinutes || currentRide?.minutes || 0));
  }

  const avatarImage = document.getElementById('driver-avatar');
  const avatarInitial = assignedCard.querySelector('.driver-avatar-initial');
  if (avatarImage) {
    const profilePhotoUrl = driver.profilePhotoUrl || driver.photoUrl || driver.photo || '';
    avatarImage.onerror = () => {
      avatarImage.classList.add('d-none');
      avatarInitial?.classList.remove('d-none');
    };
    if (profilePhotoUrl) {
      avatarImage.src = profilePhotoUrl;
      avatarImage.classList.remove('d-none');
      avatarInitial?.classList.add('d-none');
    } else {
      avatarImage.classList.add('d-none');
      avatarInitial?.classList.remove('d-none');
      if (avatarInitial) avatarInitial.textContent = driver.avatarInitial || driver.name?.[0] || '?';
    }
  }

  const vehiclePhoto = document.getElementById('driver-vehicle-photo');
  const vehicleIcon = document.getElementById('driver-vehicle-icon');
  if (vehiclePhoto) {
    vehiclePhoto.onerror = () => {
      vehiclePhoto.classList.add('d-none');
      vehicleIcon?.classList.remove('d-none');
    };
  }
  if (vehiclePhoto && vehicle.photoUrl) {
    vehiclePhoto.src = vehicle.photoUrl;
    vehiclePhoto.classList.remove('d-none');
    vehicleIcon?.classList.add('d-none');
  } else {
    vehiclePhoto?.classList.add('d-none');
    vehicleIcon?.classList.remove('d-none');
  }
}

function formatCoordinatePair(lat, lng) {
  return `${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`;
}

function getLocationFieldConfig(id) {
  return id === 'pickup-input'
    ? {
      suggestionsId: 'pickup-suggestions',
      coordinatesFieldId: 'pickup-coordinates',
      addressFieldId: 'pickup-address'
    }
    : {
      suggestionsId: 'destination-suggestions',
      coordinatesFieldId: 'destination-coordinates',
      addressFieldId: 'destination-address'
    };
}

function getLocationElements(id) {
  const config = getLocationFieldConfig(id);
  return {
    input: document.getElementById(id),
    suggestions: document.getElementById(config.suggestionsId),
    coordinatesField: document.getElementById(config.coordinatesFieldId),
    addressField: document.getElementById(config.addressFieldId)
  };
}

function buildGeocodeCacheKey(query, limit) {
  return JSON.stringify([String(query || '').trim().toLowerCase(), Number(limit) || 1]);
}

function normalizeQuery(value) {
  return String(value || '').trim().toLowerCase();
}

function getResolvedLocation(id) {
  const inputValue = String(document.getElementById(id)?.value || '').trim();
  const parsed = parseCoordinateInput(inputValue);
  if (parsed) {
    const existing = resolvedLocations[id];
    return existing && existing.coordinates
      ? { ...existing, coordinates: parsed }
      : { coordinates: parsed, label: formatCoordinatePair(parsed.lat, parsed.lng), query: normalizeQuery(inputValue), country: '' };
  }
  const stored = resolvedLocations[id];
  if (!stored) return null;
  return normalizeQuery(inputValue) === stored.query ? stored : null;
}

function setResolvedLocation(id, location, rawQuery) {
  if (!location?.coordinates) {
    resolvedLocations[id] = null;
    return;
  }
  const { input, coordinatesField, addressField } = getLocationElements(id);
  const label = location.label || String(rawQuery || '').trim() || formatCoordinatePair(location.coordinates.lat, location.coordinates.lng);
  if (input) {
    input.value = label;
    input.dataset.committedValue = label;
  }
  if (coordinatesField) {
    coordinatesField.value = formatCoordinatePair(location.coordinates.lat, location.coordinates.lng);
  }
  if (addressField) {
    addressField.value = label;
  }
  resolvedLocations[id] = {
    coordinates: {
      lat: Number(location.coordinates.lat),
      lng: Number(location.coordinates.lng)
    },
    label,
    feature: location.feature || null,
    country: location.country || extractCountry(location.feature) || '',
    query: normalizeQuery(label)
  };
}

function clearResolvedLocation(id) {
  resolvedLocations[id] = null;
}

function setInputFeedback(id, type = '', text = '') {
  inputFeedbackState[id] = { type, text };
  const node = document.getElementById(`${id}-message`);
  const textNode = document.getElementById(`${id}-message-text`);
  const iconNode = node?.querySelector('.input-message-icon');
  if (!node || !textNode || !iconNode) return;
  const normalizedType = text ? type || 'info' : '';
  node.className = `input-message${normalizedType ? ` input-message--${normalizedType}` : ''}${text ? '' : ' d-none'}`;
  textNode.textContent = text;
  iconNode.textContent = ({
    error: '✗',
    warning: '⚠',
    info: 'ⓘ',
    success: '✓'
  })[normalizedType] || 'ⓘ';
}

function setRideValidationMessage(type = '', text = '') {
  const node = document.getElementById('ride-validation-message');
  const textNode = document.getElementById('ride-validation-message-text');
  if (!node || !textNode) return;
  node.className = `ride-validation-message${type ? ` ride-validation-message--${type}` : ''}${text ? '' : ' d-none'}`;
  textNode.textContent = text;
}

function extractCountry(feature) {
  const placeName = String(feature?.place_name || '').trim();
  if (!placeName) return '';
  const parts = placeName.split(',').map(part => part.trim()).filter(Boolean);
  return parts[parts.length - 1] || '';
}

function categorizeRoute(distanceMiles, durationMinutes) {
  if (distanceMiles <= 10) return { label: 'Local', badge: 'Local Route', icon: '📍', theme: 'local' };
  if (distanceMiles <= 80) return { label: 'Regional', badge: 'Regional Route', icon: '🛣️', theme: 'regional' };
  return {
    label: 'Long-distance',
    badge: 'Long-distance Route',
    icon: '✈️',
    theme: 'long-distance'
  };
}

function getRideTypeDistanceLimit(rideType) {
  return MAX_RIDE_DISTANCE_MILES[String(rideType || 'ECONOMY').toUpperCase()] || MAX_RIDE_DISTANCE_MILES.ECONOMY;
}

function getDistanceValidationMessage(distanceMiles, rideType = selectedRideType) {
  const normalizedRideType = String(rideType || 'ECONOMY').toUpperCase();
  if (distanceMiles <= getRideTypeDistanceLimit(normalizedRideType)) return '';
  if (distanceMiles > MAX_RIDE_DISTANCE_MILES.PREMIUM) {
    return 'Trip exceeds maximum distance (max 300 mi). Not available.';
  }
  if (normalizedRideType === 'ECONOMY') {
    return 'Trip too far for Economy (max 80 mi). Try Comfort?';
  }
  if (normalizedRideType === 'COMFORT') {
    return 'Trip too far for Comfort (max 150 mi). Try Premium?';
  }
  return 'This trip exceeds the maximum distance for on-demand rides.';
}

function getMinimumFare(rideType) {
  return MINIMUM_FARES[String(rideType || 'ECONOMY').toUpperCase()] || MINIMUM_FARES.ECONOMY;
}

function toLocationResult(feature, fallbackLabel = '') {
  const center = Array.isArray(feature?.center) ? feature.center : null;
  const lng = Number(center?.[0]);
  const lat = Number(center?.[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return {
    coordinates: { lat, lng },
    label: String(feature.place_name || fallbackLabel || '').trim() || formatCoordinatePair(lat, lng),
    feature,
    country: extractCountry(feature)
  };
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
    driverName: ride.driverName || ride.driver?.name || (ride.driverId ? `Driver ${String(ride.driverId).slice(0, 6)}` : null),
    driver: ride.driver && typeof ride.driver === 'object' ? ride.driver : null,
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
    canceledAt: ride.canceledAt || null,
    distanceAway: ride.distanceAway != null ? Number(ride.distanceAway) : null
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

function easeInOutQuadratic(progress) {
  return progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
}

function clampZoom(zoom, minZoom, maxZoom, fallbackZoom) {
  const numericZoom = Number.isFinite(Number(zoom)) ? Number(zoom) : fallbackZoom;
  return Math.max(minZoom, Math.min(maxZoom, numericZoom));
}

function buildEstimateFromRoute(route, rideType = selectedRideType, overrides = {}) {
  const pricing = VEHICLE_PRICING[String(rideType || 'ECONOMY').toUpperCase()] || VEHICLE_PRICING.ECONOMY;
  const miles = Math.max(0, Math.min(MAX_DISTANCE_MILES, Number(route?.distanceMiles || 0)));
  const minutes = Math.max(0, Math.min(MAX_DURATION_MINUTES, Number(route?.etaMinutes || 0)));
  const taxes = roundToTwo(Number(overrides.taxes || 0));

  // Realistic pricing: baseFare + (distance * perMileFare) + (duration * perMinuteFare)
  const baseFare = roundToTwo(pricing.baseFare);
  const distanceFare = roundToTwo(miles * pricing.perMileFare);
  const timeFare = roundToTwo(minutes * pricing.perMinuteFare);
  const meterFare = roundToTwo(baseFare + distanceFare + timeFare);

  // Surge pricing: max 2.5x, only applied when the base trip exceeds the surge threshold.
  const rawSurge = Math.max(1, Number(overrides.surgeMultiplier || 1));
  const surgeMultiplier = meterFare > SURGE_THRESHOLD_DOLLARS ? Math.min(rawSurge, MAX_SURGE_MULTIPLIER) : 1;
  const surgedMeterFare = roundToTwo(meterFare * surgeMultiplier);
  const surgeFare = roundToTwo(Math.max(0, surgedMeterFare - meterFare));

  const serviceFee = roundToTwo((meterFare + surgeFare) * DEFAULT_SERVICE_FEE_PERCENT);
  const subtotal = roundToTwo(meterFare + surgeFare + serviceFee);
  const minimumFare = getMinimumFare(rideType);
  const total = roundToTwo(Math.max(subtotal + taxes, minimumFare));
  return {
   currency: 'USD',
   fareEstimate: total,
   fareEstimateRange: {
     low: roundToTwo(Math.max(minimumFare, total * FARE_ESTIMATE_LOW_MULTIPLIER)),
     high: roundToTwo(Math.max(minimumFare, total * FARE_ESTIMATE_HIGH_MULTIPLIER))
   },
   fareBreakdown: {
     currency: 'USD',
     baseFare,
     distanceFare,
     timeFare,
     meterFare,
     surgeMultiplier,
     minimumFare,
     surgeFare,
     serviceFeePercent: DEFAULT_SERVICE_FEE_PERCENT,
     serviceFee,
     taxes,
      tolls: 0,
      discounts: 0,
      tips: 0,
      subtotal,
      total,
      driverEarnings: roundToTwo(Math.max(0, meterFare + surgeFare - serviceFee)),
      fareEstimate: total,
      fareEstimateRange: {
        low: roundToTwo(Math.max(minimumFare, total * FARE_ESTIMATE_LOW_MULTIPLIER)),
        high: roundToTwo(Math.max(minimumFare, total * FARE_ESTIMATE_HIGH_MULTIPLIER))
      }
    }
  };
}

function buildLocalEstimate(pickup, destination, rideType = selectedRideType) {
  const distanceKm = calculateDistanceKm(pickup.lat, pickup.lng, destination.lat, destination.lng);
  const distanceMiles = Math.min(MAX_DISTANCE_MILES, roundToTwo(distanceKm * 0.621371));
  const etaMinutes = Math.min(MAX_DURATION_MINUTES, Math.max(MIN_TRIP_MINUTES, Math.round(distanceKm * MINUTES_PER_KM)));
  const route = { distanceMiles, etaMinutes };
  return {
    ok: true,
    route,
    _isFallback: true,
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
  const normalizedRideType = normalizeRideTypeForApi();
  try {
    const { response, data } = await fetchJson('/api/rides/estimate', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        pickupLat: pickup.lat,
        pickupLng: pickup.lng,
        dropoffLat: destination.lat,
        dropoffLng: destination.lng,
        rideType: normalizedRideType
      })
    });
    if (!response.ok || !data?.ok) {
      return { ...localEstimate, _isFallback: true, _fallbackReason: 'Using estimated pricing — live pricing unavailable.' };
    }
    estimateRetryCount = 0;
    return { ...normalizeEstimateResponse(data, localEstimate), _isFallback: false, _fallbackReason: '' };
  } catch (_error) {
    return { ...localEstimate, _isFallback: true, _fallbackReason: 'Using estimated pricing — reconnecting in the background.' };
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

function createCoordinateFeature(lat, lng, label = formatCoordinatePair(lat, lng)) {
  return {
    type: 'Feature',
    center: [Number(lng), Number(lat)],
    place_name: label,
    text: label,
    place_type: ['coordinate'],
    properties: { isCoordinate: true }
  };
}

function getFeatureCoordinates(feature) {
  const center = Array.isArray(feature?.center)
    ? feature.center
    : Array.isArray(feature?.geometry?.coordinates)
      ? feature.geometry.coordinates
      : null;
  const lng = Number(center?.[0]);
  const lat = Number(center?.[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

function parseSuggestion(feature) {
  const coordinates = getFeatureCoordinates(feature);
  if (!coordinates) return null;
  const displayText = String(feature?.place_name || feature?.text || formatCoordinatePair(coordinates.lat, coordinates.lng)).trim();
  const mainText = String(feature?.text || displayText).trim();
  const secondary = feature?.properties?.isCoordinate
    ? 'Coordinates'
    : displayText !== mainText
      ? displayText
      : Array.isArray(feature?.place_type) && feature.place_type.length
        ? feature.place_type.join(', ')
        : '';
  return {
    displayText,
    mainText,
    secondary,
    lat: coordinates.lat,
    lng: coordinates.lng,
    feature
  };
}

function hideSuggestions(id) {
  const { input, suggestions } = getLocationElements(id);
  if (suggestions) {
    suggestions.classList.add('d-none');
    suggestions.replaceChildren();
  }
  if (input) input.setAttribute('aria-expanded', 'false');
}

function setLocationError(message = '') {
  const errorNode = document.getElementById('location-error');
  if (!errorNode) return;
  const hasMessage = Boolean(String(message || '').trim());
  errorNode.textContent = hasMessage ? message : '';
  errorNode.classList.toggle('d-none', !hasMessage);
}

function clearStoredLocation(id, options = {}) {
  const { keepInputValue = false } = options;
  const { input, coordinatesField, addressField } = getLocationElements(id);
  if (coordinatesField) coordinatesField.value = '';
  if (addressField) addressField.value = '';
  if (input) {
    delete input.dataset.committedValue;
    if (!keepInputValue) input.value = '';
  }
}

async function geocodeAddress(query, options = {}) {
  const { limit = 1 } = options;
  const rawQuery = String(query || '').trim();
  const normalizedQuery = rawQuery.toLowerCase();
  if (!rawQuery) return [];

  const parsedCoordinates = parseCoordinateInput(rawQuery);
  if (parsedCoordinates) {
    return [createCoordinateFeature(parsedCoordinates.lat, parsedCoordinates.lng, rawQuery)];
  }

  if (rawQuery.length < MIN_GEOCODE_QUERY_LENGTH) return [];

  const now = Date.now();
  const cache = readGeocodeCache();
  const requestLimit = Math.max(1, Math.min(MAX_GEOCODE_SUGGESTIONS, Number(limit) || 1));
  const cacheKey = buildGeocodeCacheKey(normalizedQuery, requestLimit);
  const cached = cache[cacheKey] || cache[normalizedQuery];
  if (cached && now - Number(cached.cachedAt || 0) < GEOCODE_CACHE_TTL_MS) {
    if (Array.isArray(cached.features)) return cached.features;
    if (Number.isFinite(Number(cached.lat)) && Number.isFinite(Number(cached.lng))) {
      return [createCoordinateFeature(Number(cached.lat), Number(cached.lng), cached.label || cached.placeName || rawQuery)];
    }
  }

  const token = mapState.token || readMapboxToken();
  if (!token) return [];

  try {
    const encodedQuery = encodeURIComponent(rawQuery);
    const url = new URL(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedQuery}.json`);
    url.searchParams.set('access_token', token);
    url.searchParams.set('autocomplete', 'true');
    url.searchParams.set('limit', String(requestLimit));
    const response = await fetch(url.toString());
    const payload = await response.json().catch(() => null);
    if (!response.ok) return [];

    const features = (Array.isArray(payload?.features) ? payload.features : [])
      .filter(feature => getFeatureCoordinates(feature))
      .slice(0, requestLimit);

    cache[cacheKey] = { features, cachedAt: now };
    if (requestLimit === 1 && features[0]) {
      const coordinates = getFeatureCoordinates(features[0]);
      cache[normalizedQuery] = {
        lat: coordinates?.lat,
        lng: coordinates?.lng,
        placeName: String(features[0].place_name || rawQuery),
        cachedAt: now
      };
    }
    writeGeocodeCache(cache);
    return features;
  } catch (_error) {
    return [];
  }
}

async function reverseGeocodeCoordinates(lat, lng) {
  const numericLat = Number(lat);
  const numericLng = Number(lng);
  if (!Number.isFinite(numericLat) || !Number.isFinite(numericLng)) return formatCoordinatePair(lat, lng);

  const cache = readGeocodeCache();
  const cacheKey = buildGeocodeCacheKey(`reverse:${numericLat.toFixed(5)},${numericLng.toFixed(5)}`, 1);
  const cached = cache[cacheKey];
  if (cached && Date.now() - Number(cached.cachedAt || 0) < GEOCODE_CACHE_TTL_MS && cached.placeName) {
    return cached.placeName;
  }

  const token = mapState.token || readMapboxToken();
  if (!token) return formatCoordinatePair(numericLat, numericLng);

  try {
    const url = new URL(`https://api.mapbox.com/geocoding/v5/mapbox.places/${numericLng},${numericLat}.json`);
    url.searchParams.set('access_token', token);
    url.searchParams.set('limit', '1');
    const response = await fetch(url.toString());
    const payload = await response.json().catch(() => null);
    const placeName = String(payload?.features?.[0]?.place_name || '').trim() || formatCoordinatePair(numericLat, numericLng);
    if (response.ok) {
      cache[cacheKey] = { placeName, cachedAt: Date.now() };
      writeGeocodeCache(cache);
    }
    return placeName;
  } catch (_error) {
    return formatCoordinatePair(numericLat, numericLng);
  }
}

function showSuggestions(id, features) {
  const { input, suggestions } = getLocationElements(id);
  if (!input || !suggestions) return;

  suggestions.replaceChildren();
  if (!Array.isArray(features) || !features.length) {
    suggestions.classList.add('d-none');
    input.setAttribute('aria-expanded', 'false');
    return;
  }

  features.forEach((feature, index) => {
    const suggestion = parseSuggestion(feature);
    if (!suggestion) return;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'suggestion-item';
    button.setAttribute('role', 'option');
    button.dataset.index = String(index);

    const main = document.createElement('span');
    main.className = 'suggestion-item-main';
    main.textContent = suggestion.mainText;

    button.appendChild(main);

    if (suggestion.secondary) {
      const secondary = document.createElement('span');
      secondary.className = 'suggestion-item-secondary';
      secondary.textContent = suggestion.secondary;
      button.appendChild(secondary);
    }

    button.addEventListener('mousedown', event => {
      event.preventDefault();
    });
    button.addEventListener('click', () => {
      resolveCoordinateInput(id, { fitRoute: true, feature }).catch(() => {});
    });
    suggestions.appendChild(button);
  });

  suggestions.classList.remove('d-none');
  input.setAttribute('aria-expanded', 'true');
}

async function reverseGeocodeCoordinates(coordinates) {
  const lat = Number(coordinates?.lat);
  const lng = Number(coordinates?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const cacheKey = `reverse:${lat.toFixed(5)},${lng.toFixed(5)}`;
  const now = Date.now();
  const cache = readGeocodeCache();
  const cached = cache[cacheKey];
  if (cached && now - Number(cached.cachedAt || 0) < GEOCODE_CACHE_TTL_MS) {
    return {
      coordinates: { lat: Number(cached.lat), lng: Number(cached.lng) },
      label: cached.label || formatCoordinatePair(lat, lng),
      country: cached.country || '',
      feature: cached.feature || null
    };
  }

  const token = mapState.token || readMapboxToken();
  if (!token) return { coordinates: { lat, lng }, label: formatCoordinatePair(lat, lng), country: '', feature: null };

  try {
    const url = new URL(`https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json`);
    url.searchParams.set('access_token', token);
    url.searchParams.set('limit', '1');
    const response = await fetch(url.toString());
    const payload = await response.json().catch(() => null);
    const feature = payload?.features?.[0];
    const location = toLocationResult(feature, formatCoordinatePair(lat, lng)) || {
      coordinates: { lat, lng },
      label: formatCoordinatePair(lat, lng),
      country: '',
      feature: null
    };
    if (response.ok) {
      cache[cacheKey] = {
        lat: location.coordinates.lat,
        lng: location.coordinates.lng,
        label: location.label,
        country: location.country,
        feature: location.feature,
        cachedAt: now
      };
      writeGeocodeCache(cache);
    }
    return location;
  } catch (_error) {
    return { coordinates: { lat, lng }, label: formatCoordinatePair(lat, lng), country: '', feature: null };
  }
}

function queueGeocodeResolution(id, options = {}) {
  if (geocodeDebounceTimers[id]) window.clearTimeout(geocodeDebounceTimers[id]);
  const { input } = getLocationElements(id);
  const value = String(input?.value || '').trim();
  if (!value || value.length < MIN_GEOCODE_QUERY_LENGTH) {
    clearResolvedLocation(id);
    locationSuggestions[id] = [];
    hideSuggestions(id);
    return;
  }

  geocodeDebounceTimers[id] = window.setTimeout(async () => {
    const activeValue = String(getLocationElements(id).input?.value || '').trim();
    if (activeValue !== value) return;
    setInputLoading(id, true);
    try {
      const suggestions = await geocodeAddress(value, { limit: MAX_GEOCODE_SUGGESTIONS });
      if (String(getLocationElements(id).input?.value || '').trim() !== value) return;
      locationSuggestions[id] = suggestions;
      showSuggestions(id, suggestions);
      setLocationError(suggestions.length ? '' : 'Location not found');
    } finally {
      setInputLoading(id, false);
    }
  }, GEOCODE_DEBOUNCE_MS);
}

async function resolveCoordinateInput(id, options = {}) {
  const { fitRoute = true, showError = false, feature = null } = options;
  const { input, coordinatesField, addressField } = getLocationElements(id);
  const rawValue = String(input?.value || '').trim();
  if (!input || !coordinatesField || !addressField) return null;
  if (!rawValue) {
    clearStoredLocation(id);
    hideSuggestions(id);
    return null;
  }

  setInputLoading(id, true);
  try {
    const features = locationSuggestions[id]?.length
      ? locationSuggestions[id]
      : await geocodeAddress(rawValue, { limit: MAX_GEOCODE_SUGGESTIONS });
    locationSuggestions[id] = features;
    const preferredFeature = feature && getFeatureCoordinates(feature) ? feature : null;
    const selectedFeature = preferredFeature || features[0] || null;
    if (!selectedFeature) {
      clearResolvedLocation(id);
      setInputFeedback(id, 'error', 'Location not found.');
      if (showError) showPopup(`Location not found for "${rawValue}".`);
      return null;
    }
    const selectedCoords = getFeatureCoordinates(selectedFeature);
    if (!selectedCoords) {
      clearResolvedLocation(id);
      setInputFeedback(id, 'error', 'Location not found.');
      return null;
    }
    const selectedLabel = String(selectedFeature.place_name || rawValue).trim();
    setResolvedLocation(
      id,
      { coordinates: selectedCoords, label: selectedLabel, feature: selectedFeature, country: extractCountry(selectedFeature) },
      rawValue
    );
    setInputFeedback(id, 'success', id === 'pickup-input' ? 'Pickup location confirmed.' : 'Destination confirmed.');
    mapState.lastFetchedRouteKey = '';
    hideSuggestions(id);
    setLocationError('');
    await refreshFareEstimate({ fitRoute });
    const resolved = getResolvedLocation(id);
    return resolved?.coordinates || null;
  } finally {
    setInputLoading(id, false);
  }
}

function getPickupAndDestination(options = {}) {
  const { allowFallback = false } = options;
  const pickup = getResolvedLocation('pickup-input')?.coordinates || parseCoordinateInput(document.getElementById('pickup-input')?.value);
  const destination = getResolvedLocation('destination-input')?.coordinates || parseCoordinateInput(document.getElementById('destination-input')?.value);
  if (!allowFallback) {
    return { pickup, destination, hasValidCoordinates: Boolean(pickup && destination) };
  }
  const nextPickup = pickup || latestKnownRiderPosition || DEFAULT_PICKUP;
  const nextDestination = destination || {
    lat: nextPickup.lat + 0.012,
    lng: nextPickup.lng + 0.008
  };
  return { pickup: nextPickup, destination: nextDestination, hasValidCoordinates: Boolean(pickup && destination) };
}

async function requestRide(pickup, destination) {
  const estimate = latestEstimate || await estimateRideFare(pickup, destination);
  const pickupLocation = getResolvedLocation('pickup-input');
  const destinationLocation = getResolvedLocation('destination-input');
  const normalizedRideType = normalizeRideTypeForApi();
  const baseRide = {
    riderId: currentUser.id,
    riderName: currentUser.email,
    riderEmail: currentUser.email,
    pickupLat: pickup.lat,
    pickupLng: pickup.lng,
    dropoffLat: destination.lat,
    dropoffLng: destination.lng,
    pickupLabel: pickupLocation?.label || document.getElementById('pickup-input')?.value.trim() || `${pickup.lat.toFixed(5)}, ${pickup.lng.toFixed(5)}`,
    destinationLabel: destinationLocation?.label || document.getElementById('destination-input')?.value.trim() || `${destination.lat.toFixed(5)}, ${destination.lng.toFixed(5)}`,
    rideType: selectedRideType,
    miles: estimate.route.distanceMiles,
    minutes: estimate.route.etaMinutes,
    fareEstimate: estimate.fareEstimate,
    fareDetails: estimate.fareBreakdown,
    status: 'requested',
    lifecycleState: 'requested',
    etaMinutes: estimate.route.etaMinutes,
    paymentMethod: selectedPaymentMethod,
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
    const requestBody = {
      pickupLat: pickup.lat,
      pickupLng: pickup.lng,
      dropoffLat: destination.lat,
      dropoffLng: destination.lng,
      pickupAddress: pickupLocation?.label || document.getElementById('pickup-input')?.value.trim() || '',
      dropoffAddress: destinationLocation?.label || document.getElementById('destination-input')?.value.trim() || '',
      rideType: normalizedRideType,
      fareEstimate: estimate.fareEstimate,
      distance: estimate.route.distanceMiles,
      duration: estimate.route.etaMinutes,
      miles: estimate.route.distanceMiles,
      minutes: estimate.route.etaMinutes,
      riderId: currentUser.id,
      paymentMethod: selectedPaymentMethod
    };
    try {
      console.log('[Ride Booking] Payload:', requestBody);
      console.log('[Payment] Selected method:', selectedPaymentMethod);
      const { response, data } = await fetchJson('/api/rides', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(requestBody)
      });
      console.log('[Ride Booking] API response:', { status: response.status, data });
      if (response.ok && data?.ok && data.ride) {
        return upsertSharedRide({ ...baseRide, ...data.ride, fareDetails: data.ride.fareDetails || baseRide.fareDetails });
      }
      const fallback = await fetchJson('/api/rides/request', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(requestBody)
      });
      console.log('[Ride Booking] Fallback API response:', { status: fallback.response.status, data: fallback.data });
      if (fallback.response.ok && fallback.data?.ok && fallback.data.ride) {
        return upsertSharedRide({ ...baseRide, ...fallback.data.ride, fareDetails: fallback.data.ride.fareDetails || baseRide.fareDetails });
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
  const status = String(ride?.status || 'idle').toLowerCase();
  if (status === 'requested') return { pill: 'Searching', message: 'Searching for nearby drivers...', step: 'searching', headerStatus: 'Finding a driver' };
  if (status === 'accepted' || status === 'assigned') return { pill: 'Assigned', message: 'Your driver is on the way to pickup.', step: 'assigned', headerStatus: 'Driver assigned' };
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
  animateNumericText('status-message', state.message);
  safeSetText('header-status-text', state.headerStatus);
  updateTimeline(state.step);
  document.querySelector('.status-card')?.setAttribute('class', `card status-card status-${state.step || (currentRide?.status || 'idle')}`);
  document.getElementById('searching-status')?.classList.toggle('d-none', state.step !== 'searching');
  setPollingIndicator(Boolean(currentRide && ACTIVE_RIDE_STATUSES.includes(currentRide.status)));
  document.getElementById('ride-empty-state')?.classList.toggle('d-none', rides.some(ride => ride.riderId === currentUser?.id));

  const assignedCard = document.getElementById('driver-assigned-card');
  const rideStatus = String(currentRide?.status || '').toLowerCase();
  const showDriverCard = Boolean(currentRide && ['accepted', 'assigned', 'arrived_at_pickup', 'started'].includes(rideStatus));
  const wasHidden = assignedCard?.classList.contains('d-none');
  if (assignedCard) assignedCard.classList.toggle('d-none', !showDriverCard);
  if (showDriverCard) {
    if (wasHidden) {
      assignedCard.classList.remove('slide-up');
      void assignedCard.offsetWidth; // force reflow so the animation restarts from scratch
      assignedCard.classList.add('slide-up');
    }
    const activeDriver = currentRide.driver || assignedDriver || {};
    renderDriverCardDetails(activeDriver, currentRide.etaMinutes || currentRide.minutes || 0);
  }

  const cancelButton = document.getElementById('cancel-ride-button');
  const requestButton = document.getElementById('request-ride-button');
  const buttonGroup = document.querySelector('.button-group');
  const canCancelRide = Boolean(currentRide && ['requested', 'accepted', 'assigned', 'arrived_at_pickup'].includes(rideStatus));
  const showCancelButton = canCancelRide;
  if (requestButton) {
    requestButton.classList.toggle('d-none', showCancelButton);
  }
  if (cancelButton) {
    cancelButton.disabled = !canCancelRide;
    cancelButton.classList.toggle('d-none', !showCancelButton);
  }
  if (buttonGroup) {
    const visibleButtons = 1 + Number(showCancelButton);
    buttonGroup.classList.toggle('single-action', visibleButtons <= 1);
  }
  updateRequestRideButtonState();

  const previousStatus = mapState.lastRideStatus;
  mapState.lastRideStatus = currentRide?.status || 'idle';

  if (previousStatus !== mapState.lastRideStatus) {
    const driverName = currentRide?.driver?.name || currentRide?.driverName || assignedDriver?.name || 'Your driver';
    const driverRating = currentRide?.driver?.rating || assignedDriver?.rating || '';
    if (mapState.lastRideStatus === 'accepted') {
      const ratingText = driverRating ? ` (⭐ ${driverRating})` : '';
      showToast(`Driver found! ${driverName}${ratingText} is on the way`, 'success');
    } else if (mapState.lastRideStatus === 'arrived_at_pickup') {
      showToast(`${driverName} has arrived at your pickup location`, 'success');
    } else if (mapState.lastRideStatus === 'started') {
      showToast("You're on the way to your destination", 'info');
    } else if (mapState.lastRideStatus === 'completed') {
      showToast('Ride completed! Rate your experience', 'success', 6000);
    } else if (mapState.lastRideStatus === 'canceled') {
      showToast('Ride cancelled', 'info');
    }
  }

  renderMapState({ fitRoute: previousStatus !== mapState.lastRideStatus });
}

function showToast(message, type = 'info', duration = 4000) {
  console.log('[Toast] Showing:', message, type);
  const container = document.getElementById('toast-container');
  if (!container) return;

  while (activeToasts.length >= TOAST_MAX_VISIBLE) {
    const oldest = activeToasts.shift();
    oldest?.remove();
  }

  const iconMap = { info: 'ℹ️', success: '✅', error: '❌', warning: '⚠️' };
  const iconLabel = { info: 'Info', success: 'Success', error: 'Error', warning: 'Warning' };
  const toast = document.createElement('div');
  toast.className = `toast-item toast-item--${type}`;
  toast.setAttribute('role', 'status');
  toast.innerHTML =
    `<span class="toast-icon" role="img" aria-label="${iconLabel[type] || 'Info'}">${iconMap[type] || 'ℹ️'}</span>` +
    `<span class="toast-message">${message}</span>` +
    `<button class="toast-close" aria-label="Dismiss notification" type="button">×</button>`;

  const dismiss = () => {
    if (!toast.isConnected) return;
    toast.classList.add('toast-item--leaving');
    window.setTimeout(() => {
      toast.remove();
      const idx = activeToasts.indexOf(toast);
      if (idx !== -1) activeToasts.splice(idx, 1);
    }, 320);
  };

  toast.querySelector('.toast-close')?.addEventListener('click', dismiss);
  container.appendChild(toast);
  activeToasts.push(toast);

  if (duration > 0) window.setTimeout(dismiss, duration);
}

function showPopup(message) {
  showToast(message, 'info', POPUP_DISPLAY_DURATION_MS);
}

function setFareLoading(isLoading) {
  isFareEstimateLoading = Boolean(isLoading);
  document.querySelector('.fare-card')?.classList.toggle('is-loading', Boolean(isLoading));
  updateRequestRideButtonState();
}

function setFareError(message = '') {
  const errorNode = document.getElementById('fare-error');
  const textNode = document.getElementById('fare-error-text');
  if (!errorNode || !textNode) return;
  const hasMessage = Boolean(String(message || '').trim());
  errorNode.classList.toggle('d-none', !hasMessage);
  errorNode.classList.toggle('fare-warning', hasMessage);
  if (hasMessage) textNode.textContent = message;
}

function showSurgeWarning(baseFare, surgeMultiplier) {
  const node = document.getElementById('surge-warning');
  if (!node) return;
  const baseNode = document.getElementById('surge-base-fare');
  if (baseNode) baseNode.textContent = formatCurrency(baseFare);
  node.classList.remove('d-none');
  node.setAttribute('aria-live', 'polite');
}

function hideSurgeWarning() {
  document.getElementById('surge-warning')?.classList.add('d-none');
}

function renderRouteCategory(routeCategory) {
  const badge = document.getElementById('route-category-badge');
  const iconNode = document.getElementById('route-category-icon');
  const textNode = document.getElementById('route-category-text');
  if (!badge || !iconNode || !textNode) return;
  badge.className = `route-category-badge route-category-badge--${routeCategory.theme}`;
  iconNode.textContent = routeCategory.icon;
  textNode.textContent = routeCategory.badge;
}

function renderLongDistanceBanner(message = '') {
  const banner = document.getElementById('long-distance-banner');
  const textNode = document.getElementById('long-distance-banner-text');
  if (!banner || !textNode) return;
  const hasMessage = Boolean(String(message || '').trim());
  banner.classList.toggle('d-none', !hasMessage);
  if (hasMessage) textNode.textContent = message;
}

function updateRideTypeAvailability(distanceMiles = 0, blocked = false) {
  const rideTypes = ['ECONOMY', 'COMFORT', 'PREMIUM'];
  rideTypes.forEach(rideType => {
    const button = document.querySelector(`[data-ride-type="${rideType}"]`);
    if (!button) return;
    const allowed = !blocked && distanceMiles <= getRideTypeDistanceLimit(rideType);
    rideValidationState.availableRideTypes[rideType] = allowed;
    button.disabled = !allowed;
    button.classList.toggle('is-unavailable', !allowed);
    button.setAttribute('aria-disabled', String(!allowed));
    button.title = allowed ? '' : getDistanceValidationMessage(distanceMiles, rideType);
  });
}

function deriveRideValidation(estimate) {
  const { pickup, destination, hasValidCoordinates } = getPickupAndDestination();
  const pickupValue = String(document.getElementById('pickup-input')?.value || '').trim();
  const destinationValue = String(document.getElementById('destination-input')?.value || '').trim();
  const pickupLocation = getResolvedLocation('pickup-input');
  const destinationLocation = getResolvedLocation('destination-input');
  const distanceMiles = Number(estimate?.route?.distanceMiles || 0);
  const durationMinutes = Number(estimate?.route?.etaMinutes || 0);
  const routeCategory = categorizeRoute(distanceMiles, durationMinutes);
  const internationalBlocked = Boolean(
    pickupLocation?.country
    && destinationLocation?.country
    && (
      pickupLocation.country !== destinationLocation.country
      || pickupLocation.country !== SUPPORTED_COUNTRY
      || destinationLocation.country !== SUPPORTED_COUNTRY
    )
  );
  const selectedRideTypeAllowed = hasValidCoordinates && distanceMiles > 0 && distanceMiles <= getRideTypeDistanceLimit(selectedRideType);
  const distanceMessage = hasValidCoordinates ? getDistanceValidationMessage(distanceMiles, selectedRideType) : '';
  const longDistanceMessage = durationMinutes > LONG_DISTANCE_WARNING_MINUTES
    ? 'This is a long-distance trip. Consider scheduling in advance or using a rental service instead.'
    : '';

  let disabledReason = '';
  if (!selectedRideType) {
    disabledReason = 'Please select a ride type.';
  } else if (!pickupValue || !pickup) {
    disabledReason = pickupValue ? 'Please enter a valid pickup location.' : 'Enter a valid pickup location.';
  } else if (!destinationValue || !destination) {
    disabledReason = destinationValue ? 'Please enter a valid destination.' : 'Enter a valid destination.';
  } else if (inputFeedbackState['pickup-input']?.type === 'error') {
    disabledReason = inputFeedbackState['pickup-input'].text || 'Location not found.';
  } else if (inputFeedbackState['destination-input']?.type === 'error') {
    disabledReason = inputFeedbackState['destination-input'].text || 'Location not found.';
  } else if (internationalBlocked) {
    disabledReason = 'International ride requests are currently unavailable.';
  } else if (!selectedRideTypeAllowed) {
    disabledReason = distanceMessage || 'This trip exceeds the maximum distance for on-demand rides.';
  } else if (durationMinutes > LONG_DISTANCE_WARNING_MINUTES) {
    disabledReason = 'Long-distance trips over 6 hours are unavailable for on-demand booking.';
  } else if (isFareEstimateLoading) {
    disabledReason = 'Updating fare estimate...';
  }

  return {
    routeCategory,
    disabledReason,
    distanceMessage,
    longDistanceMessage,
    internationalMessage: internationalBlocked ? 'International ride requests are currently unavailable.' : '',
    selectedRideTypeAllowed,
    isLongDistance: durationMinutes > LONG_DISTANCE_WARNING_MINUTES,
    hasValidCoordinates,
    distanceMiles
  };
}

function renderInputMessages(validation) {
  const pickupValue = String(document.getElementById('pickup-input')?.value || '').trim();
  const destinationValue = String(document.getElementById('destination-input')?.value || '').trim();
  const pickupFeedback = inputFeedbackState['pickup-input'] || { type: '', text: '' };
  const destinationFeedback = inputFeedbackState['destination-input'] || { type: '', text: '' };

  if (!pickupValue) {
    setInputFeedback('pickup-input', '', '');
  } else if (pickupFeedback.type === 'error') {
    setInputFeedback('pickup-input', 'error', pickupFeedback.text || 'Location not found.');
  } else if (pickupFeedback.type === 'success') {
    setInputFeedback('pickup-input', 'success', pickupFeedback.text || 'Pickup location confirmed.');
  }

  if (!destinationValue) {
    setInputFeedback('destination-input', '', '');
  } else if (validation.internationalMessage) {
    setInputFeedback('destination-input', 'warning', validation.internationalMessage);
  } else if (validation.distanceMessage) {
    setInputFeedback('destination-input', 'warning', validation.distanceMessage);
  } else if (destinationFeedback.type === 'error') {
    setInputFeedback('destination-input', 'error', destinationFeedback.text || 'Location not found.');
  } else if (destinationFeedback.type === 'success') {
    setInputFeedback('destination-input', 'success', destinationFeedback.text || 'Destination confirmed.');
  }
}

function updateRequestRideButtonState() {
  const requestButton = document.getElementById('request-ride-button');
  if (!requestButton) return;
  const canCancelRide = Boolean(currentRide && ['requested', 'accepted', 'arrived_at_pickup'].includes(currentRide.status));
  const hasPaymentMethod = Boolean(selectedPaymentMethod);
  const disabledReason = canCancelRide
    ? 'You already have an active ride.'
    : (!hasPaymentMethod ? 'Select a payment method to continue.' : rideValidationState.disabledReason);
  requestButton.disabled = canCancelRide || Boolean(disabledReason);
  requestButton.title = disabledReason || 'Request your ride';
}

function updateRideValidation(estimate) {
  const validation = deriveRideValidation(estimate);
  Object.assign(rideValidationState, validation);
  renderRouteCategory(validation.routeCategory);
  renderLongDistanceBanner(validation.longDistanceMessage);
  renderInputMessages(validation);
  setRideValidationMessage(
    validation.internationalMessage ? 'warning' : validation.distanceMessage ? 'warning' : '',
    validation.internationalMessage || validation.distanceMessage
  );
  updateRideTypeAvailability(validation.distanceMiles, Boolean(validation.internationalMessage));
  updateRequestRideButtonState();
}

function setPollingIndicator(isLive) {
  const indicator = document.getElementById('polling-indicator');
  if (!indicator) return;
  indicator.classList.toggle('is-live', Boolean(isLive));
  indicator.classList.toggle('is-idle', !isLive);
}

function setCancelModalOpen(isOpen) {
  const modal = document.getElementById('cancel-modal');
  if (!modal) return;
  modal.classList.toggle('d-none', !isOpen);
}

const PAYMENT_METHOD_OPTIONS = [
  { id: 'card', label: 'Card', icon: '💳', requiresStripe: true },
  { id: 'apple_pay', label: 'Apple Pay', icon: '🍎', requiresStripe: true },
  { id: 'google_pay', label: 'Google Pay', icon: '🔵', requiresStripe: true },
  { id: 'cash', label: 'Cash', icon: '💵', requiresStripe: false }
];

function getSelectedPaymentConfig() {
  const selected = PAYMENT_METHOD_OPTIONS.find(m => m.id === selectedPaymentMethod);
  if (selected) return selected;
  console.warn('[Payment] Unknown payment method selected, defaulting to card', { selectedPaymentMethod });
  return PAYMENT_METHOD_OPTIONS[0];
}

function renderPaymentMethodPill() {
  const method = getSelectedPaymentConfig();
  const iconEl = document.getElementById('payment-method-icon');
  const textEl = document.getElementById('payment-method-text');
  if (iconEl) iconEl.textContent = method.icon;
  if (textEl) textEl.textContent = method.id === 'card' && savedCardLast4 ? `${method.label} •••• ${savedCardLast4}` : method.label;
}

function setPaymentMessage(message = '', type = '') {
  const messageEl = document.getElementById('payment-message');
  if (!messageEl) return;
  messageEl.textContent = message;
  messageEl.classList.toggle('d-none', !message);
  messageEl.dataset.type = type || '';
}

function setPaymentStatus(message = '', status = '') {
  const statusEl = document.getElementById('payment-status');
  const textEl = document.getElementById('payment-status-text');
  const iconEl = document.getElementById('payment-status-icon');
  if (!statusEl || !textEl || !iconEl) return;
  if (!message || !status) {
    statusEl.classList.add('d-none');
    statusEl.classList.remove('pending', 'authorized', 'failed', 'paid');
    textEl.textContent = '';
    iconEl.textContent = '';
    return;
  }
  const icons = { pending: '⏳', authorized: '✓', failed: '✗', paid: '✓✓' };
  statusEl.classList.remove('d-none', 'pending', 'authorized', 'failed', 'paid');
  statusEl.classList.add(status);
  textEl.textContent = message;
  iconEl.textContent = icons[status] || '';
}

async function getStripePublishableKey() {
  if (stripePublishableKeyPromise) return stripePublishableKeyPromise;
  stripePublishableKeyPromise = (async () => {
    const metaKey = (document.querySelector('meta[name="stripe-publishable-key"]')?.getAttribute('content') ?? '').trim();
    if (metaKey) return metaKey;
    try {
      const { response, data } = await fetchJson('/api/config');
      if (response.ok && data?.stripePublishableKey) return String(data.stripePublishableKey).trim();
    } catch (_error) {
      // Ignore; caller handles missing key.
    }
    return '';
  })();
  return stripePublishableKeyPromise;
}

function getPaymentAmountCents(ride) {
  const fare = Number(ride?.fareEstimate ?? latestEstimate?.fareEstimate);
  if (!Number.isFinite(fare) || fare <= 0) {
    throw new Error('Could not determine fare for payment. Please update pickup or destination to refresh the fare estimate.');
  }
  return Math.max(MINIMUM_STRIPE_AMOUNT_CENTS, Math.round(fare * 100));
}

async function initializeStripe() {
  if (stripe) return stripe;
  if (typeof window.Stripe !== 'function') {
    setPaymentMessage('Stripe.js is unavailable right now. Please choose Cash or try again later.', 'error');
    return null;
  }
  const publishableKey = await getStripePublishableKey();
  if (!publishableKey) {
    setPaymentMessage('Secure card payments are temporarily unavailable. Please choose Cash.', 'warning');
    return null;
  }
  stripe = window.Stripe(publishableKey);
  return stripe;
}

async function ensurePaymentElement() {
  if (!getSelectedPaymentConfig().requiresStripe) return true;
  const container = document.getElementById('payment-element-container');
  if (container) container.classList.remove('d-none');
  if (paymentElement && stripeElements) return true;
  const stripeClient = await initializeStripe();
  if (!stripeClient) return false;
  const appearance = {
    theme: 'stripe',
    variables: {
      colorPrimary: '#1b80ff',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }
  };
  const fallbackFare = Number(latestEstimate?.fareEstimate);
  const amountCents = Number.isFinite(fallbackFare) && fallbackFare > 0
    ? Math.max(MINIMUM_STRIPE_AMOUNT_CENTS, Math.round(fallbackFare * 100))
    : MINIMUM_STRIPE_AMOUNT_CENTS;
  stripeElements = stripeClient.elements({
    appearance,
    mode: 'payment',
    currency: 'usd',
    amount: amountCents
  });
  paymentElement = stripeElements.create('payment');
  paymentElement.mount('#payment-element');
  setPaymentMessage('');
  return true;
}

async function updatePaymentElementVisibility() {
  const container = document.getElementById('payment-element-container');
  if (!container) return;
  const requiresStripe = getSelectedPaymentConfig().requiresStripe;
  container.classList.toggle('d-none', !requiresStripe);
  if (requiresStripe) {
    await ensurePaymentElement();
  } else {
    setPaymentMessage('');
  }
}

async function loadSavedPaymentMethods() {
  if (!accessToken) return;
  try {
    const { response, data } = await fetchJson('/api/payments/list-methods', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ userId: currentUser?.id })
    });
    if (!response.ok || !data?.ok || !Array.isArray(data.methods)) return;
    const defaultCard = data.methods.find(method => method?.isDefault && method?.type === 'card' && method?.last4) ||
      data.methods.find(method => method?.type === 'card' && method?.last4);
    savedCardLast4 = defaultCard?.last4 ? String(defaultCard.last4) : '';
    renderPaymentMethodPill();
  } catch (_error) {
    // Ignore payment method lookup errors.
  }
}

function setPaymentMethod(methodId) {
  selectedPaymentMethod = methodId;
  localStorage.setItem('drive.paymentMethod', methodId);
  console.log('[Payment] Selected method:', selectedPaymentMethod);
  renderPaymentMethodPill();
  document.querySelectorAll('[data-payment-method]').forEach(btn => {
    const isSelected = btn.getAttribute('data-payment-method') === methodId;
    btn.classList.toggle('is-selected', isSelected);
    btn.setAttribute('aria-selected', String(isSelected));
  });
  updatePaymentElementVisibility().catch(() => {});
  updateRequestRideButtonState();
}

function togglePaymentDropdown() {
  const pill = document.getElementById('payment-method-pill');
  const dropdown = document.getElementById('payment-method-dropdown');
  if (!pill || !dropdown) return;
  const isOpen = !dropdown.classList.contains('d-none');
  dropdown.classList.toggle('d-none', isOpen);
  pill.setAttribute('aria-expanded', String(!isOpen));
}

function closePaymentDropdown() {
  const pill = document.getElementById('payment-method-pill');
  const dropdown = document.getElementById('payment-method-dropdown');
  if (!dropdown || dropdown.classList.contains('d-none')) return;
  dropdown.classList.add('d-none');
  if (pill) pill.setAttribute('aria-expanded', 'false');
}

async function initPaymentMethod() {
  const ua = navigator.userAgent;
  const applePayOpt = document.getElementById('payment-opt-apple-pay');
  const googlePayOpt = document.getElementById('payment-opt-google-pay');
  const isIOS = /iPhone|iPad/i.test(ua);
  const isAndroid = /Android/i.test(ua);
  if (applePayOpt) applePayOpt.style.display = isIOS ? '' : 'none';
  if (googlePayOpt) googlePayOpt.style.display = isAndroid ? '' : 'none';

  const validMethods = PAYMENT_METHOD_OPTIONS.filter(m => {
    if (m.id === 'apple_pay') return isIOS;
    if (m.id === 'google_pay') return isAndroid;
    return true;
  }).map(m => m.id);

  if (!validMethods.includes(selectedPaymentMethod)) {
    selectedPaymentMethod = 'card';
    localStorage.setItem('drive.paymentMethod', 'card');
  }

  renderPaymentMethodPill();
  setPaymentMethod(selectedPaymentMethod);
  await loadSavedPaymentMethods();
}

function startSearchingDotsAnimation() {
  const dots = document.querySelector('#searching-status .searching-dots');
  if (!dots) return;
  let count = 0;
  if (searchingDotsIntervalId) window.clearInterval(searchingDotsIntervalId);
  searchingDotsIntervalId = window.setInterval(() => {
    count = (count % 3) + 1;
    dots.textContent = '.'.repeat(count);
  }, 330);
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
  const isFallback = Boolean(estimate._isFallback);
  const fallbackPrefix = isFallback ? '~' : '';
  const surgeActive = Number(estimate.fareBreakdown?.surgeMultiplier || 1) > 1;
  const routeCategory = categorizeRoute(estimate.route.distanceMiles, estimate.route.etaMinutes);

  setFareError(estimate._fallbackReason || '');
  safeSetText('fare-distance', formatMiles(estimate.route.distanceMiles));
  safeSetText('fare-duration', formatMinutes(estimate.route.etaMinutes));
  safeSetText('fare-base', formatCurrency(estimate.fareBreakdown.baseFare));
  safeSetText('fare-distance-fare', formatCurrency(estimate.fareBreakdown.distanceFare));
  safeSetText('fare-time-fare', formatCurrency(estimate.fareBreakdown.timeFare));
  safeSetText('fare-surge', formatCurrency(estimate.fareBreakdown.surgeFare));
  safeSetText('fare-taxes', formatCurrency(estimate.fareBreakdown.taxes));
  safeSetText('fare-estimate', `${fallbackPrefix}${formatCurrency(estimate.fareEstimate)}`);
  safeSetText('fare-range', `${fallbackPrefix}${formatCurrency(estimate.fareEstimateRange.low)} - ${fallbackPrefix}${formatCurrency(estimate.fareEstimateRange.high)}`);
  safeSetText('map-route-distance', formatMiles(estimate.route.distanceMiles));
  animateNumericText('map-route-duration', formatMinutes(estimate.route.etaMinutes));
  safeSetText('map-route-overview', `Fastest route • ${formatMiles(estimate.route.distanceMiles)} • ${formatMinutes(estimate.route.etaMinutes)} • ${routeCategory.label}`);
  animateNumericText('map-route-arrival', formatArrivalTimeFromMinutes(estimate.route.etaMinutes));
  safeSetText('map-route-traffic', mapState.routeTrafficLabel || 'Clear route');
  document.getElementById('map-route-arrival')?.classList.toggle('is-nearby', Number(estimate.route.etaMinutes || 0) < 2);
  renderRouteCategory(routeCategory);

  if (surgeActive) {
    showSurgeWarning(estimate.fareBreakdown.meterFare, estimate.fareBreakdown.surgeMultiplier);
  } else {
    hideSurgeWarning();
  }

  updateRideTypePricing(estimate);
  updateRideValidation(estimate);
}

async function refreshFareEstimate(options = {}) {
  const { fitRoute = false } = options;
  const requestId = ++fareRequestSequence;
  const { pickup, destination, hasValidCoordinates } = getPickupAndDestination();
  if (!hasValidCoordinates || !pickup || !destination) {
    setFareError('');
    hideSurgeWarning();
    latestEstimate = null;
    updateRideValidation(null);
    renderMapState({ fitRoute, allowFallback: true });
    return;
  }
  setFareLoading(true);
  if (estimateRetryTimerId) {
    window.clearTimeout(estimateRetryTimerId);
    estimateRetryTimerId = null;
  }
  try {
    const estimate = await estimateRideFare(pickup, destination);
    if (requestId !== fareRequestSequence) return;
    renderFareEstimate(estimate);
    if (estimate._isFallback && estimateRetryCount < ESTIMATE_MAX_RETRIES) {
      estimateRetryCount++;
      estimateRetryTimerId = window.setTimeout(() => {
        refreshFareEstimate({ fitRoute: false }).catch(() => {});
      }, ESTIMATE_RETRY_INTERVAL_MS);
    } else if (!estimate._isFallback) {
      estimateRetryCount = 0;
    }
    renderMapState({ fitRoute });
  } finally {
    setFareLoading(false);
  }
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

function animateDriverMarkerTo(marker, from, to) {
  if (!marker || !from || !to) return;
  if (mapState.pendingDriverAnimation) window.cancelAnimationFrame(mapState.pendingDriverAnimation);
  const startAt = performance.now();
  const tick = now => {
    const progress = Math.min(1, (now - startAt) / DRIVER_MARKER_LERP_MS);
    const eased = easeInOutQuadratic(progress);
    const lat = from.lat + (to.lat - from.lat) * eased;
    const lng = from.lng + (to.lng - from.lng) * eased;
    marker.setLngLat([lng, lat]);
    if (progress < 1) {
      mapState.pendingDriverAnimation = window.requestAnimationFrame(tick);
    }
  };
  mapState.pendingDriverAnimation = window.requestAnimationFrame(tick);
}

function startRouteDashAnimation() {
  if (mapState.routeAnimationTimer || !mapState.map) return;
  let frameIndex = 0;
  mapState.routeAnimationTimer = window.setInterval(() => {
    if (!mapState.map?.getLayer(mapState.routeLineLayerId)) return;
    const isSearching = (currentRide?.status || '') === 'requested';
    const glowOpacity = isSearching ? 1 : 0.86;
    const hueShift = isSearching ? frameIndex * 7 : frameIndex * 3;
    mapState.map.setPaintProperty(mapState.routeLineLayerId, 'line-dasharray', ROUTE_DASH_FRAMES[frameIndex]);
    mapState.map.setPaintProperty(mapState.routeLineLayerId, 'line-color', `hsl(${210 + (hueShift % 24)}, 86%, 58%)`);
    mapState.map.setPaintProperty(mapState.routeLineLayerId, 'line-opacity', glowOpacity);
    mapState.map.setPaintProperty(mapState.routeLineLayerId, 'line-width', isSearching ? 6 : 5);
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
    mapState.map.setPaintProperty(mapState.routeLineLayerId, 'line-color-transition', { duration: 260, delay: 0 });
    mapState.map.setPaintProperty(mapState.routeLineLayerId, 'line-opacity-transition', { duration: 260, delay: 0 });
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
    sourceLabel: 'Estimated route',
    trafficLabel: 'Clear route'
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
    url.searchParams.set('annotations', 'congestion');
    const response = await fetch(url.toString());
    const payload = await response.json().catch(() => null);
    const route = payload?.routes?.[0];
    const coordinates = Array.isArray(route?.geometry?.coordinates) ? route.geometry.coordinates : null;
    if (!response.ok || !coordinates?.length) {
      console.error('[Route] Route failed: Mapbox API returned no route', { status: response.status, hasCoordinates: Boolean(coordinates?.length) });
      return buildFallbackDirections(pickup, destination);
    }

    // Extract and validate duration (Mapbox returns seconds) and distance (meters)
    const durationSeconds = Number(route.duration || 0);
    const rawEtaMinutes = durationSeconds / 60;
    const etaMinutes = rawEtaMinutes > 0 && rawEtaMinutes < MAX_DURATION_MINUTES
      ? Math.round(rawEtaMinutes)
      : null;
    const distanceMeters = Number(route.distance || 0);
    const rawDistanceMiles = distanceMeters * 0.000621371;
    const distanceMiles = rawDistanceMiles > 0 && rawDistanceMiles < MAX_DISTANCE_MILES
      ? roundToTwo(rawDistanceMiles)
      : null;
    if (typeof process !== 'undefined' && process?.env?.NODE_ENV !== 'production') {
      console.log('[Mapbox] Route data:', { durationSeconds, rawEtaMinutes, etaMinutes, distanceMeters, rawDistanceMiles, distanceMiles });
    }

    const instructions = (Array.isArray(route.legs) ? route.legs : [])
      .flatMap(leg => Array.isArray(leg.steps) ? leg.steps : [])
      .map(step => step?.maneuver?.instruction || step?.name)
      .filter(Boolean)
      .slice(0, 4);
    const congestionValues = (Array.isArray(route.legs) ? route.legs : [])
      .flatMap(leg => Array.isArray(leg?.annotation?.congestion) ? leg.annotation.congestion : []);
    const hasHeavyTraffic = congestionValues.some(value => ['severe', 'heavy'].includes(String(value).toLowerCase()));
    const hasSlowTraffic = congestionValues.some(value => ['moderate', 'low'].includes(String(value).toLowerCase()));
    console.log('[Route] Route loaded:', { distanceMiles, etaMinutes, instructions: instructions.length });
    return {
      geometry: coordinates,
      instructions: instructions.length ? instructions : buildFallbackDirections(pickup, destination).instructions,
      sourceLabel: 'Mapbox live route',
      trafficLabel: hasHeavyTraffic ? 'Heavy traffic' : hasSlowTraffic ? 'Slow traffic' : 'Clear route',
      distanceMiles,
      etaMinutes
    };
  } catch (_error) {
    console.error('[Route] Route failed:', _error);
    return buildFallbackDirections(pickup, destination);
  }
}

function renderRouteInstructions(instructions) {
  const list = document.getElementById('route-instructions');
  if (!list) return;
  list.innerHTML = '';
  (instructions?.length ? instructions : ['Set pickup and destination to preview your trip.']).forEach((item, index) => {
    const li = document.createElement('li');
    const icon = document.createElement('span');
    icon.className = 'route-instruction-icon bi bi-arrow-right-circle';
    icon.setAttribute('aria-hidden', 'true');
    const label = document.createElement('span');
    label.textContent = item;
    li.append(icon, label);
    li.classList.toggle('is-current', index === 0);
    list.appendChild(li);
  });
  list.querySelector('.is-current')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
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

function flyToPrimaryLocation(pickup, destination) {
  if (!mapState.map) return;
  const flyKey = `${pickup.lat.toFixed(5)}:${pickup.lng.toFixed(5)}:${destination.lat.toFixed(5)}:${destination.lng.toFixed(5)}`;
  if (flyKey === mapState.lastFlyKey) return;
  mapState.lastFlyKey = flyKey;
  const centerLng = (pickup.lng + destination.lng) / 2;
  const centerLat = (pickup.lat + destination.lat) / 2;
  mapState.map.flyTo({
    center: [centerLng, centerLat],
    zoom: clampZoom(mapState.map.getZoom?.(), MAP_FLY_MIN_ZOOM, MAP_FLY_MAX_ZOOM, MAP_FLY_TARGET_ZOOM),
    duration: MAP_FLY_ANIMATION_MS,
    essential: true,
    curve: 1.35,
    easing: t => 1 - Math.pow(1 - t, 3),
    pitch: 40
  });
  window.setTimeout(() => {
    if (!mapState.map || mapState.lastFlyKey !== flyKey) return;
    mapState.map.easeTo({ pitch: 46, duration: 260 });
  }, MAP_FLY_ANIMATION_MS);
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
    const nextDriverPosition = { lat: Number(driverLocation.lat), lng: Number(driverLocation.lng) };
    const previousDriverPosition = mapState.lastDriverPosition || nextDriverPosition;
    mapState.markers.driver
      .setPopup(new window.mapboxgl.Popup({ offset: 20 }).setText(currentRide?.driverName || 'Driver'))
      .addTo(mapState.map);
    if (mapState.lastDriverPosition) {
      animateDriverMarkerTo(mapState.markers.driver, previousDriverPosition, nextDriverPosition);
    } else {
      mapState.markers.driver.setLngLat([nextDriverPosition.lng, nextDriverPosition.lat]);
    }
    mapState.lastDriverPosition = nextDriverPosition;
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
  mapState.routeTrafficLabel = route.trafficLabel || 'Clear route';
  updateRouteSource();
  renderRouteInstructions(route.instructions);
  safeSetText('route-source-badge', route.sourceLabel);
  safeSetText('map-route-traffic', mapState.routeTrafficLabel);

  // Use actual Mapbox distance/duration to refresh fare estimate if data is valid
  if (Number.isFinite(route.distanceMiles) && Number.isFinite(route.etaMinutes) && route.distanceMiles > 0) {
    const mapboxRoute = { distanceMiles: route.distanceMiles, etaMinutes: route.etaMinutes };
    const updatedEstimate = {
      ok: true,
      route: mapboxRoute,
      _isFallback: false,
      _fallbackReason: '',
      ...buildEstimateFromRoute(mapboxRoute, selectedRideType)
    };
    renderFareEstimate(updatedEstimate);
  }

  if (fitRoute || !mapState.hasFittedScene) fitMapToScene(pickup, destination);
}

function renderMapState(options = {}) {
  const { fitRoute = false, allowFallback = true } = options;
  const { pickup, destination } = getPickupAndDestination({ allowFallback });
  if (!mapState.mapLoaded) {
    const fallbackDirections = buildFallbackDirections(pickup, destination);
    renderRouteInstructions(fallbackDirections.instructions);
    safeSetText('route-source-badge', fallbackDirections.sourceLabel);
    safeSetText('map-route-traffic', fallbackDirections.trafficLabel || 'Clear route');
    return;
  }
  flyToPrimaryLocation(pickup, destination);
  syncMapMarkers(pickup, destination);
  refreshMapRoute({ fitRoute }).catch(() => {
    const fallbackDirections = buildFallbackDirections(pickup, destination);
    renderRouteInstructions(fallbackDirections.instructions);
    safeSetText('route-source-badge', fallbackDirections.sourceLabel);
    safeSetText('map-route-traffic', fallbackDirections.trafficLabel || 'Clear route');
  });
}

async function initializeMap(options = {}) {
  const { force = false } = options;
  if (mapState.map && mapState.mapLoaded && !force) return;
  if (mapState.map && force) {
    mapState.map.remove();
    mapState.map = null;
    mapState.mapLoaded = false;
  }
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
    console.error('Mapbox token is missing. Add token to meta[name="mapbox-token"] or set mapbox_token query param');
    setMapFallbackMessage('Mapbox token missing. Add ?mapbox_token=YOUR_TOKEN or set the mapbox-token meta tag.');
    document.getElementById('map-fallback')?.classList.remove('d-none');
    setMapLoading(false);
    return;
  }
  console.log('Mapbox token loaded successfully');
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
    mapState.map.on('error', error => {
      console.error('Mapbox error:', error);
      setMapFallbackMessage('Map failed to render. Check your Mapbox token/network and retry.');
      document.getElementById('map-fallback')?.classList.remove('d-none');
      setMapLoading(false);
    });
    mapState.map.on('load', () => {
      console.log('Mapbox map loaded successfully');
      mapState.mapLoaded = true;
      document.getElementById('map-fallback')?.classList.add('d-none');
      setMapLoading(false);
      ensureRouteLayers();
      renderMapState({ fitRoute: true });
      // Run immediate + delayed resize so canvas settles after async style/layout paint.
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
  setPollingIndicator(true);
  let backendRides = [];
  try {
    backendRides = await fetchBackendRides();
  } catch (_error) {
    backendRides = [];
  } finally {
    setPollingIndicator(Boolean(currentRide && ACTIVE_RIDE_STATUSES.includes(currentRide.status)));
  }
  rides = mergeRides(backendRides, readSharedRideStore().rides);
  writeSharedRideStore({ rides });
  selectCurrentRide();
  renderRideState();
}

async function createRidePaymentIntent(ride) {
  if (!ride?.id || !currentUser?.id) return null;
  const amountCents = getPaymentAmountCents(ride);
  const { response, data } = await fetchJson('/api/payments/create-ride-payment', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      rideId: ride.id,
      riderId: currentUser.id,
      amountCents,
      currency: 'usd',
      paymentMethodType: selectedPaymentMethod,
      platform: 'drive'
    })
  });
  if (!response.ok || !data?.ok || !data?.clientSecret) {
    const message = data?.message || data?.error || 'Failed to initialize payment.';
    throw new Error(message);
  }
  stripeClientSecret = String(data.clientSecret);
  if (ride && data.paymentIntentId) {
    ride.paymentIntentId = data.paymentIntentId;
    ride.paymentStatus = 'pending';
  }
  return stripeClientSecret;
}

async function confirmStripeRidePayment() {
  if (!stripe || !stripeElements || !stripeClientSecret) return false;
  setPaymentStatus('Processing payment...', 'pending');
  const { error, paymentIntent } = await stripe.confirmPayment({
    elements: stripeElements,
    clientSecret: stripeClientSecret,
    redirect: 'if_required',
    confirmParams: {
      return_url: `${window.location.origin}/rider-dashboard.html?payment_success=true`
    }
  });
  if (error) {
    const message = error?.message || 'Payment failed.';
    setPaymentStatus(`Payment failed: ${message}`, 'failed');
    showToast(`Payment failed: ${message}`, 'error');
    return false;
  }
  const status = String(paymentIntent?.status || '').toLowerCase();
  if (status === 'succeeded' || status === 'processing' || status === 'requires_capture') {
    setPaymentStatus('Payment authorized', 'authorized');
    showToast('Payment successful!', 'success');
    return true;
  }
  setPaymentStatus('Payment failed', 'failed');
  showToast('Payment failed. Please try another method.', 'error');
  return false;
}

async function handleRequestRide() {
  await Promise.all([
    resolveCoordinateInput('pickup-input', { fitRoute: true, showError: true }),
    resolveCoordinateInput('destination-input', { fitRoute: true, showError: true })
  ]);
  updateRideValidation(latestEstimate);
  const { pickup, destination, hasValidCoordinates } = getPickupAndDestination();
  if (!hasValidCoordinates || !pickup || !destination || rideValidationState.disabledReason) {
    showPopup(rideValidationState.disabledReason || 'Enter valid pickup and destination to book a ride.');
    return;
  }
  const requestButton = document.getElementById('request-ride-button');
  const requestLabel = requestButton?.querySelector('.btn-label');
  const bookingErrorEl = document.getElementById('booking-error-message');
  if (bookingErrorEl) bookingErrorEl.classList.add('d-none');
  if (requestLabel) requestLabel.textContent = 'Booking...';
  setButtonLoading('request-ride-button', true);
  setPaymentStatus();
  try {
    const ride = await requestRide(pickup, destination);
    if (getSelectedPaymentConfig().requiresStripe) {
      const stripeReady = await ensurePaymentElement();
      if (!stripeReady) {
        throw new Error('Secure payments are currently unavailable. Please choose Cash.');
      }
      await createRidePaymentIntent(ride);
      const paymentSucceeded = await confirmStripeRidePayment();
      if (!paymentSucceeded) {
        if (ride?.id && accessToken) {
          await cancelRide(ride.id).catch(error => {
            console.warn('[Payment] Failed to cancel ride after payment failure', { rideId: ride.id, error });
            showToast('Payment failed and automatic ride cancellation did not complete. Please cancel the ride manually.', 'error');
            return null;
          });
        }
        throw new Error('Payment failed. Ride cancelled.');
      }
    } else {
      setPaymentStatus('Payment: Cash', 'authorized');
    }
    currentRide = normalizeRide(ride);
    rides = mergeRides([currentRide], readSharedRideStore().rides);
    renderRideState();
    if (requestButton && requestLabel) {
      const icon = requestButton.querySelector('.btn-icon');
      requestButton.classList.add('is-success');
      requestLabel.textContent = 'Ride booked!';
      if (icon) icon.className = 'bi bi-check2-circle btn-icon';
      window.setTimeout(() => {
        if (icon) icon.className = 'bi bi-lightning-charge-fill btn-icon';
        requestLabel.textContent = 'Book a ride';
        requestButton.classList.remove('is-success');
      }, REQUEST_SUCCESS_ANIMATION_MS);
    }
    showToast('Searching for nearby drivers...', 'info');

    // Simulate driver assignment after 3-5 seconds
    if (currentRide?.id) {
      simulateDriverAssignment(currentRide.id, pickup.lat, pickup.lng);
    }
  } catch (err) {
    const errorMsg = (err instanceof Error && err.message) || 'Failed to book ride. Please try again.';
    if (bookingErrorEl) {
      bookingErrorEl.textContent = errorMsg;
      bookingErrorEl.classList.remove('d-none');
    } else {
      showPopup(errorMsg);
    }
    if (requestLabel) requestLabel.textContent = 'Book a ride';
  } finally {
    setButtonLoading('request-ride-button', false);
    renderRideState();
  }
}

async function handleCancelRide() {
  if (!currentRide?.id) return;
  const rideId = currentRide.id;
  console.log('[Cancel Ride] Cancelling ride:', rideId);
  setCancelModalOpen(false);
  stopStatusProgression();
  stopEtaCountdown();
  assignedDriver = null;
  setButtonLoading('cancel-ride-button', true);
  try {
    const canceledRide = await cancelRide(rideId);
    if (canceledRide) {
      console.log('[Cancel Ride] Ride cancelled:', rideId);
      updateSharedRide(rideId, { status: 'canceled', lifecycleState: 'canceled', canceledAt: new Date().toISOString() });
      currentRide = null;
      rides = rides.filter(r => r.id !== rideId);
      renderRideState();
      showToast('Ride cancelled', 'info');
    }
  } catch (err) {
    const errorMsg = (err instanceof Error && err.message) || 'Failed to cancel ride. Please try again.';
    console.error('[Cancel Ride] Error cancelling ride:', rideId, err);
    showToast(errorMsg, 'error');
  } finally {
    setButtonLoading('cancel-ride-button', false);
    renderRideState();
  }
}

function handleCancelRideClick() {
  if (!currentRide?.id) return;
  setCancelModalOpen(true);
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
    latestKnownRiderPosition = { lat, lng };
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
  const pickupCoordinates = document.getElementById('pickup-coordinates');
  const pickupAddress = document.getElementById('pickup-address');
  const destinationInput = document.getElementById('destination-input');
  const destinationCoordinates = document.getElementById('destination-coordinates');
  const destinationAddress = document.getElementById('destination-address');
  const defaultDestination = {
    lat: DEFAULT_PICKUP.lat + 0.012,
    lng: DEFAULT_PICKUP.lng + 0.008
  };

  if (pickupInput && !pickupInput.value.trim()) {
    const label = 'San Francisco, CA';
    pickupInput.value = label;
    pickupInput.dataset.committedValue = label;
  }
  if (pickupCoordinates && !pickupCoordinates.value.trim()) {
    pickupCoordinates.value = formatCoordinatePair(DEFAULT_PICKUP.lat, DEFAULT_PICKUP.lng);
  }
  if (pickupAddress && !pickupAddress.value.trim()) {
    pickupAddress.value = String(pickupInput?.value || 'San Francisco, CA');
  }

  if (destinationInput && !destinationInput.value.trim()) {
    const label = 'Mission Bay, San Francisco, CA';
    destinationInput.value = label;
    destinationInput.dataset.committedValue = label;
  }
  if (destinationCoordinates && !destinationCoordinates.value.trim()) {
    destinationCoordinates.value = formatCoordinatePair(defaultDestination.lat, defaultDestination.lng);
  }
  if (destinationAddress && !destinationAddress.value.trim()) {
    destinationAddress.value = String(destinationInput?.value || 'Mission Bay, San Francisco, CA');
  }

  // Populate resolvedLocations so getPickupAndDestination() returns valid coordinates
  // at startup, enabling route and fare calculations immediately.
  if (!resolvedLocations['pickup-input']) {
    setResolvedLocation('pickup-input', {
      coordinates: { lat: DEFAULT_PICKUP.lat, lng: DEFAULT_PICKUP.lng },
      label: String(pickupInput?.value || 'San Francisco, CA')
    }, String(pickupInput?.value || 'San Francisco, CA'));
  }
  if (!resolvedLocations['destination-input']) {
    setResolvedLocation('destination-input', {
      coordinates: { lat: defaultDestination.lat, lng: defaultDestination.lng },
      label: String(destinationInput?.value || 'Mission Bay, San Francisco, CA')
    }, String(destinationInput?.value || 'Mission Bay, San Francisco, CA'));
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

function stopEtaCountdown() {
  if (etaCountdownIntervalId) {
    window.clearInterval(etaCountdownIntervalId);
    etaCountdownIntervalId = null;
  }
}

function startEtaCountdown(initialMinutes) {
  stopEtaCountdown();
  let secondsRemaining = Math.max(0, Math.round(Number(initialMinutes || 5) * 60));
  const updateDisplay = () => {
    const minutes = Math.floor(secondsRemaining / 60);
    const seconds = secondsRemaining % 60;
    const formatted = minutes > 0 ? `${minutes} min` : `${seconds}s`;
    animateNumericText('driver-eta', formatted);
    animateNumericText('driver-countdown', formatted);
  };
  updateDisplay();
  etaCountdownIntervalId = window.setInterval(() => {
    if (secondsRemaining > 0) secondsRemaining--;
    updateDisplay();
    if (secondsRemaining === 0) stopEtaCountdown();
  }, 1000);
}

function stopStatusProgression() {
  if (statusProgressionTimerId) {
    window.clearTimeout(statusProgressionTimerId);
    statusProgressionTimerId = null;
  }
}

function applyRideStatusUpdate(rideId, patch) {
  if (!rideId) return;
  const updated = updateSharedRide(rideId, patch);
  if (updated) {
    currentRide = normalizeRide(updated);
    rides = mergeRides([currentRide], readSharedRideStore().rides);
    renderRideState();
  }
}

function renderDriverCard(driver, etaMinutes) {
  if (!driver) return;
  const card = document.getElementById('driver-assigned-card');
  if (!card) return;

  const normalizedDriver = driver.vehicle && typeof driver.vehicle === 'object'
    ? driver
    : {
      ...driver,
      vehicle: {
        label: String(driver.vehicle || '').trim(),
        plate: driver.plate || driver.plateNumber || ''
      }
    };
  renderDriverCardDetails(normalizedDriver, etaMinutes || 5);

  // Online indicator
  card.querySelector('.driver-online-dot')?.classList.add('is-online');

  // Trigger slide-in animation
  card.classList.remove('d-none');
  card.classList.remove('slide-up');
  void card.offsetWidth; // force reflow so the animation restarts from scratch
  card.classList.add('slide-up');
}

function pickRandomDriver() {
  const index = Math.floor(Math.random() * MOCK_DRIVER_POOL.length);
  return MOCK_DRIVER_POOL[index];
}

function simulateDriverMovementOnMap(pickupLat, pickupLng) {
  if (!mapState.mapLoaded || !mapState.map) return;
  const startLat = pickupLat + (Math.random() - 0.5) * DRIVER_START_POSITION_OFFSET;
  const startLng = pickupLng + (Math.random() - 0.5) * DRIVER_START_POSITION_OFFSET;

  // Create driver marker at simulated start position
  if (!mapState.markers.driver) {
    mapState.markers.driver = new window.mapboxgl.Marker({ element: createDriverMarkerElement() });
  }
  mapState.markers.driver
    .setLngLat([startLng, startLat])
    .setPopup(new window.mapboxgl.Popup({ offset: 20 }).setText(assignedDriver?.name || 'Driver'))
    .addTo(mapState.map);
  mapState.lastDriverPosition = { lat: startLat, lng: startLng };

  // Animate toward pickup over ~20 seconds
  const targetPos = { lat: pickupLat, lng: pickupLng };
  animateDriverMarkerTo(mapState.markers.driver, { lat: startLat, lng: startLng }, targetPos);
}

function simulateDriverAssignment(rideId, pickupLat, pickupLng) {
  const delay = getRandomDelay(DRIVER_ASSIGN_DELAY_MIN_MS, DRIVER_ASSIGN_DELAY_MAX_MS);
  stopStatusProgression();

  statusProgressionTimerId = window.setTimeout(() => {
    const driver = pickRandomDriver();
    assignedDriver = driver;
    const assignedDriverId = `driver_${Date.now()}`;
    const driverEta = MIN_DRIVER_ETA_MINUTES + Math.floor(Math.random() * (MAX_DRIVER_ETA_MINUTES - MIN_DRIVER_ETA_MINUTES));
    const driverDistance = (0.3 + Math.random() * 2.5).toFixed(1);

    const vehicleLabel = String(driver.vehicle || '').trim();
    const yearMatch = vehicleLabel.match(/\b(19\d{2}|20\d{2})\b/);
    const vehicleYear = yearMatch ? Number(yearMatch[1]) : null;
    const vehicleWithoutYear = vehicleLabel.replace(/\s*\b\d{4}\b\s*/, ' ').trim();
    const vehicleParts = vehicleWithoutYear.split(/\s+/).filter(Boolean);
    const vehicleMake = vehicleParts[0] || '';
    const vehicleModel = vehicleParts.length > 1 ? vehicleParts.slice(1).join(' ') : '';

    applyRideStatusUpdate(rideId, {
      status: 'accepted',
      driverId: assignedDriverId,
      driverName: driver.name,
      distanceAway: Number(driverDistance),
      driver: {
        id: assignedDriverId,
        name: driver.name,
        rating: driver.rating,
        photoUrl: driver.photoUrl || null,
        distanceAway: Number(driverDistance),
        vehicle: {
          make: vehicleMake,
          model: vehicleModel,
          year: vehicleYear && vehicleYear > MIN_VALID_VEHICLE_YEAR ? vehicleYear : null,
          color: driver.color || '',
          plate: driver.plate || '',
          photoUrl: driver.vehiclePhotoUrl || null
        }
      },
      etaMinutes: driverEta,
      events: [
        ...(currentRide?.events || []),
        {
          id: `evt_assigned_${Date.now()}`,
          type: 'driver_assigned',
          title: 'Driver assigned',
          message: `${driver.name} is on the way.`,
          createdAt: new Date().toISOString()
        }
      ]
    });

    renderDriverCard(driver, driverEta);
    startEtaCountdown(driverEta);
    simulateDriverMovementOnMap(pickupLat, pickupLng);

    // Simulate driver arriving
    statusProgressionTimerId = window.setTimeout(() => {
      applyRideStatusUpdate(currentRide?.id, { status: 'arrived_at_pickup', etaMinutes: 0 });
      stopEtaCountdown();
      animateNumericText('driver-eta', 'Here now');
      animateNumericText('driver-countdown', 'Here now');
    }, driverEta * 60 * 1000);
  }, delay);
}

function setupHandlers() {
  document.getElementById('logout-button')?.addEventListener('click', handleLogout);
  document.getElementById('request-ride-button')?.addEventListener('click', () => {
    handleRequestRide().catch(() => showPopup('Unable to book a ride.'));
  });
  document.getElementById('cancel-ride-button')?.addEventListener('click', () => {
    handleCancelRideClick();
  });
  document.getElementById('cancel-modal-confirm')?.addEventListener('click', () => {
    handleCancelRide().catch(err => showToast((err instanceof Error && err.message) || 'Unable to cancel ride.', 'error'));
  });
  document.getElementById('cancel-modal-keep')?.addEventListener('click', () => {
    setCancelModalOpen(false);
  });
  document.getElementById('cancel-modal')?.addEventListener('click', event => {
    if (event.target === event.currentTarget) setCancelModalOpen(false);
  });
  document.getElementById('retry-map-button')?.addEventListener('click', () => {
    initializeMap({ force: true }).catch(() => {});
  });
  document.getElementById('retry-estimate-button')?.addEventListener('click', () => {
    refreshFareEstimate({ fitRoute: true }).catch(() => {});
  });
  document.getElementById('dismiss-long-distance-banner')?.addEventListener('click', () => {
    renderLongDistanceBanner('');
  });
  document.getElementById('empty-state-request-button')?.addEventListener('click', () => {
    document.getElementById('pickup-input')?.focus();
  });
  document.getElementById('current-location-button')?.addEventListener('click', () => {
    if (!navigator.geolocation) {
      showPopup('Geolocation unavailable in this browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(async position => {
      try {
        const lat = Number(position.coords.latitude);
        const lng = Number(position.coords.longitude);
        latestKnownRiderPosition = { lat, lng };
        const pickupInput = document.getElementById('pickup-input');
        if (pickupInput) pickupInput.value = formatCoordinatePair(lat, lng);
        const resolved = await reverseGeocodeCoordinates({ lat, lng });
        setResolvedLocation('pickup-input', resolved || { coordinates: { lat, lng }, label: formatCoordinatePair(lat, lng) }, pickupInput?.value || '');
        setInputFeedback('pickup-input', 'success', 'Using current location.');
        refreshFareEstimate({ fitRoute: true }).catch(() => {});
      } catch (_error) {
        showPopup('Unable to apply your current location.');
      }
    }, () => {
      showPopup('Unable to read your current location.');
    }, { enableHighAccuracy: true, timeout: CURRENT_LOCATION_TIMEOUT_MS });
  });
  document.getElementById('btn-call-driver')?.addEventListener('click', () => {
    const driverPhone = sanitizePhoneForUri(currentRide?.driver?.phone || currentRide?.driverPhone || '');
    if (!driverPhone) {
      showPopup('Driver phone number is unavailable.');
      return;
    }
    window.location.href = `tel:${driverPhone}`;
  });
  document.getElementById('btn-message-driver')?.addEventListener('click', () => {
    const driverPhone = sanitizePhoneForUri(currentRide?.driver?.phone || currentRide?.driverPhone || '');
    if (!driverPhone) {
      showPopup('Driver messaging is unavailable.');
      return;
    }
    window.location.href = `sms:${driverPhone}`;
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
      const { input, coordinatesField, addressField } = getLocationElements(id);
      const value = String(input?.value || '').trim();
      if (geocodeDebounceTimers[id]) window.clearTimeout(geocodeDebounceTimers[id]);
      setLocationError('');

      if (coordinatesField?.value || addressField?.value) {
        const committedValue = String(input?.dataset.committedValue || addressField?.value || '').trim();
        if (value !== committedValue) clearStoredLocation(id, { keepInputValue: true });
      }

      if (!value) {
        clearResolvedLocation(id);
        locationSuggestions[id] = [];
        hideSuggestions(id);
        setInputFeedback(id, '', '');
        refreshFareEstimate({ fitRoute: true }).catch(() => {});
        return;
      }
      if (parseCoordinateInput(value)) {
        setInputFeedback(id, 'success', id === 'pickup-input' ? 'Pickup location confirmed.' : 'Destination confirmed.');
        setInputLoading(id, false);
        refreshFareEstimate({ fitRoute: true }).catch(() => {});
        return;
      }
      clearResolvedLocation(id);
      locationSuggestions[id] = [];
      setInputFeedback(id, 'info', id === 'pickup-input' ? 'Searching pickup location…' : 'Searching destination…');
      queueGeocodeResolution(id, { fitRoute: true, showError: false });
      updateRideValidation(latestEstimate);
    });
    document.getElementById(id)?.addEventListener('keydown', event => {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      resolveCoordinateInput(id, { fitRoute: true, showError: true }).catch(() => {});
    });
    document.getElementById(id)?.addEventListener('blur', () => {
      window.setTimeout(() => {
        hideSuggestions(id);
      }, SUGGESTION_HIDE_DELAY_MS);
      const { input, coordinatesField } = getLocationElements(id);
      const value = String(input?.value || '').trim();
      if (!value) {
        clearStoredLocation(id);
        return;
      }
      if (value !== String(input?.dataset.committedValue || '').trim() || !String(coordinatesField?.value || '').trim()) {
        resolveCoordinateInput(id, { fitRoute: true, showError: true }).catch(() => {});
      }
    });
    document.getElementById(id)?.addEventListener('focus', () => {
      if (locationSuggestions[id]?.length) showSuggestions(id, locationSuggestions[id]);
    });
  });

  window.addEventListener('storage', event => {
    if (event.key === SHARED_RIDE_STORAGE_KEY) syncRides().catch(() => {});
  });

  document.getElementById('payment-method-pill')?.addEventListener('click', togglePaymentDropdown);

  document.querySelectorAll('[data-payment-method]').forEach(btn => {
    btn.addEventListener('click', () => {
      const methodId = btn.getAttribute('data-payment-method');
      if (methodId) setPaymentMethod(methodId);
      closePaymentDropdown();
    });
  });

  document.addEventListener('click', event => {
    const section = document.getElementById('payment-method-section');
    if (section && !section.contains(event.target)) closePaymentDropdown();
  });

  if (!mapState.resizeHandlerBound) {
    mapState.resizeHandlerBound = true;
    window.addEventListener('resize', () => resizeMapNow(50));
  }

  window.addEventListener('beforeunload', () => {
    if (clockIntervalId) window.clearInterval(clockIntervalId);
    if (searchingDotsIntervalId) window.clearInterval(searchingDotsIntervalId);
    if (etaCountdownIntervalId) window.clearInterval(etaCountdownIntervalId);
    if (statusProgressionTimerId) window.clearTimeout(statusProgressionTimerId);
    if (estimateRetryTimerId) window.clearTimeout(estimateRetryTimerId);
    if (mapState.routeAnimationTimer) window.clearInterval(mapState.routeAnimationTimer);
    if (mapState.pendingDriverAnimation) window.cancelAnimationFrame(mapState.pendingDriverAnimation);
    Object.values(geocodeDebounceTimers).forEach(timer => window.clearTimeout(timer));
  });
}

window.addEventListener('load', async () => {
  if (!setupSession()) return;
  seedDefaultInputs();
  setupHandlers();
  await initPaymentMethod();
  startSearchingDotsAnimation();
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
