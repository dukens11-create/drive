const SAVED_PLACES_STORAGE_KEY = 'drive.savedPlaces';
const MAX_FAVORITE_PLACES = 5;
const SCHEDULE_MIN_MINUTES_AHEAD = 15;
const SCHEDULE_MAX_DAYS_AHEAD = 30;

const API_BASE_URL = '';
const MAPBOX_TOKEN_STORAGE_KEY = 'drive.mapboxToken';
const MAPBOX_GEOCODE_CACHE_STORAGE_KEY = 'drive.mapboxGeocodeCache.v1';
const SHARED_RIDE_STORAGE_KEY = 'drive.sharedRideRequests.v1';
const SHARED_RIDE_STORAGE_VERSION = 1;
const RIDE_POLL_INTERVAL_MS = 2500;
const DRIVER_ASSIGNMENT_POLL_INTERVAL_MS = 3000;
const REALTIME_ETA_REFRESH_INTERVAL_MS = 3000;
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
const DRIVER_LOCATION_UPDATE_INTERVAL_MS = 2500;
const MILES_PER_LAT_DEGREE = 69; // approximate miles per degree of latitude at mid-latitudes
const KM_TO_MILES = 0.621371;
// Fallback ETA conversion for live socket updates when no fresh routing ETA is available yet.
const ETA_MINUTES_PER_MILE = 3.5;
const MIN_VALID_VEHICLE_YEAR = 1900;
const ACTIVE_RIDE_STATUSES = ['requested', 'accepted', 'assigned', 'arrived_at_pickup', 'started'];
const DRIVER_VISIBLE_RIDE_STATUSES = ['assigned', 'arrived_at_pickup', 'started'];
const DRIVER_APPROACH_RIDE_STATUSES = ['assigned', 'arrived_at_pickup'];
const TERMINAL_RIDE_STATUSES = ['completed', 'canceled'];
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

const DEMO_DRIVER = {
  driverId: 'driver_demo_1',
  name: 'John Smith',
  rating: 4.9,
  photoUrl: '/assets/drivers/demo-driver.png',
  phone: '555-555-5555',
  vehicle: {
    photoUrl: '/assets/vehicles/economy-car.png',
    make: 'Toyota',
    model: 'Camry',
    year: '2022',
    color: 'White',
    plate: 'FLP-123'
  },
  etaMinutes: 4,
  distanceAway: '0.8 mi',
  location: {
    lat: 37.7749,
    lng: -122.4194
  }
};

let currentUser = null;
let accessToken = '';
let refreshToken = '';
let selectedRideType = 'ECONOMY';
let selectedPaymentMethod = localStorage.getItem('drive.paymentMethod') || 'card';
let selectedPreferredDriverGender = 'no_preference';
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
let ridePollingIntervalId = null;
let assignedDriver = null;
let currentDriver = null;
let driverLocationSimIntervalId = null;
let estimateRetryCount = 0;
let estimateRetryTimerId = null;
let latestKnownRiderPosition = null;
let isFareEstimateLoading = false;
let realtimeSocket = null;
let realtimeSocketConnected = false;
let realtimeEtaRefreshIntervalId = null;
let subscribedRideRoomId = null;

// ─── Promo Code State ──────────────────────────────────────────────────────
let appliedPromo = null;
let discountAmount = 0;
let originalFare = 0;
let finalFare = 0;

// ─── Safety State ──────────────────────────────────────────────────────────
let sosModalOpen = false;
let shareTripModalOpen = false;
let currentShareLink = '';
// Phase 6: Voice / TTS state
let voiceAlertsEnabled = localStorage.getItem('drive.voiceAlertsEnabled') !== 'false';
let isMuted = false;
let voiceVolume = 0.8;
let isListening = false;
let recognition = null;
let lastSpokenRideStatus = '';
const alertQueue = [];
let isSpeaking = false;
const MIN_VOICE_COMMAND_CONFIDENCE = 0.5;
const CANCELLATION_CONFIRMATION_RESPONSES = new Set(['yes', 'yes please', 'confirm', 'confirmed']);
const voiceCommands = {
  where_driver: ["where is my driver", "where's my driver", "eta", "how far"],
  cancel_ride: ['cancel my ride', 'cancel', 'i want to cancel'],
  call_driver: ['call my driver', 'call driver', 'contact driver']
};
let savedPlaces = [];
let pendingDeleteScheduledId = null;
let pendingDeletePlaceId = null;
let placeModalEditId = null;
const scheduleState = {
  isScheduled: false,
  scheduledDateTime: null,
  scheduledRides: []
};
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

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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

const UI_ID_ALIASES = {
  'driver-assigned-card': 'driver-card',
  'driver-name': 'driver-full-name',
  'driver-rating': 'driver-rating-text',
  'driver-status-text': 'driver-status',
  'driver-distance-away': 'trip-distance',
  'driver-eta': 'trip-eta',
  'driver-countdown': 'driver-eta-time',
  'driver-avatar': 'driver-photo',
  'driver-vehicle': 'vehicle-make-model',
  'driver-vehicle-specs': 'vehicle-color',
  'driver-plate': 'vehicle-plate',
  'driver-plate-vehicle': 'vehicle-plate',
  'driver-vehicle-photo': 'vehicle-photo',
  'driver-vehicle-icon': 'vehicle-icon'
};

function getNodeById(id) {
  return document.getElementById(id) || document.getElementById(UI_ID_ALIASES[id] || '');
}

function animateNumericText(id, nextText) {
  const node = getNodeById(id);
  if (!node) return;
  if (node.textContent === nextText) return;
  node.classList.add('is-updating');
  window.setTimeout(() => {
    node.textContent = nextText;
    node.classList.remove('is-updating');
  }, 160);
}

function safeSetText(id, value) {
  const node = getNodeById(id);
  if (node) node.textContent = value;
}

function sanitizePhoneForUri(value) {
  const normalized = String(value || '').trim();
  if (!normalized) return '';
  if (!/^[+0-9()\-\s]+$/.test(normalized)) return '';
  return normalized.replace(/\s+/g, '');
}

function normalizeRideStatus(status) {
  const normalized = String(status || 'requested').trim().toLowerCase();
  if (normalized === 'accepted') return 'assigned';
  if (normalized === 'cancelled') return 'canceled';
  return normalized;
}

function formatDistanceAway(value) {
  const normalized = Number(value);
  if (!Number.isFinite(normalized) || normalized < 0) return '';
  return `${normalized.toFixed(1)} mi away`;
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
  const maxValidYear = new Date().getFullYear() + 1;
  const color = String(vehicle.color || '').trim();
  const plateNumber = String(vehicle.plate || vehicle.plateNumber || vehicle.licensePlate || '').trim();
  const title = label || (make && model ? `${make} ${model}` : 'Vehicle details pending');
  const normalizedYear = Number.isInteger(year) && year > MIN_VALID_VEHICLE_YEAR && year <= maxValidYear ? String(year) : '';
  const specs = [normalizedYear, color].filter(Boolean).join(' • ');
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
  const assignedCard = getNodeById('driver-assigned-card');
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

  const avatarImage = getNodeById('driver-avatar');
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

  const vehiclePhoto = getNodeById('driver-vehicle-photo');
  const vehicleIcon = getNodeById('driver-vehicle-icon');
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
  const driverLocationPayload = ride.driverLocation && typeof ride.driverLocation === 'object'
    ? ride.driverLocation
    : ride.location && typeof ride.location === 'object'
      ? ride.location
      : {};
  const driverLat = Number(driverLocationPayload.lat ?? driverLocationPayload.latitude ?? ride.driverLat ?? ride.driverLatitude ?? ride.latitude);
  const driverLng = Number(driverLocationPayload.lng ?? driverLocationPayload.longitude ?? ride.driverLng ?? ride.driverLongitude ?? ride.longitude);
  const driverHeading = Number(driverLocationPayload.heading ?? ride.heading ?? ride.driverHeading);
  const driverSpeed = Number(driverLocationPayload.speed ?? ride.speed ?? ride.driverSpeed);
  const normalizedStatus = normalizeRideStatus(ride.status);
  const normalizedLifecycleState = normalizeRideStatus(ride.lifecycleState || ride.status);
  const distanceAway = Number(ride.distanceAway ?? ride.driver?.distanceAway ?? driverLocationPayload.distanceAway);
  const normalizedDriver = ride.driver && typeof ride.driver === 'object' ? { ...ride.driver } : {};
  if (ride.vehicle && typeof ride.vehicle === 'object') {
    normalizedDriver.vehicle = {
      ...(normalizedDriver.vehicle && typeof normalizedDriver.vehicle === 'object' ? normalizedDriver.vehicle : {}),
      ...ride.vehicle
    };
  }
  if (!normalizedDriver.name && ride.driverName) normalizedDriver.name = ride.driverName;
  if (!normalizedDriver.rating && Number.isFinite(Number(ride.driverRating))) normalizedDriver.rating = Number(ride.driverRating);
  if (!normalizedDriver.photo && (ride.driverPhoto || ride.driverPhotoUrl)) {
    normalizedDriver.photo = ride.driverPhoto || ride.driverPhotoUrl;
  }
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
    status: normalizedStatus,
    lifecycleState: normalizedLifecycleState,
    driverId: ride.driverId || null,
    driverName: ride.driverName || ride.driver?.name || (ride.driverId ? `Driver ${String(ride.driverId).slice(0, 6)}` : null),
    driver: Object.keys(normalizedDriver).length ? normalizedDriver : null,
    etaMinutes: Number(ride.etaMinutes ?? ride.driver?.etaMinutes ?? ride.minutes ?? 0),
    distanceAway: Number.isFinite(distanceAway) ? Math.max(0, distanceAway) : null,
    driverStatus: String(ride.driverStatus || ride.statusLabel || driverLocationPayload.status || '').trim(),
    riderLocation: ride.riderLocation && Number.isFinite(Number(ride.riderLocation.lat)) && Number.isFinite(Number(ride.riderLocation.lng))
      ? { lat: Number(ride.riderLocation.lat), lng: Number(ride.riderLocation.lng), updatedAt: ride.riderLocation.updatedAt || new Date().toISOString() }
      : null,
    driverLocation: Number.isFinite(driverLat) && Number.isFinite(driverLng)
      ? {
        lat: driverLat,
        lng: driverLng,
        heading: Number.isFinite(driverHeading) ? normalizeHeading(driverHeading) : null,
        speed: Number.isFinite(driverSpeed) ? Math.max(0, driverSpeed) : null,
        updatedAt: driverLocationPayload.updatedAt || ride.updatedAt || new Date().toISOString()
      }
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
    status: scheduleState.isScheduled ? 'scheduled' : 'requested',
    lifecycleState: scheduleState.isScheduled ? 'scheduled' : 'requested',
    scheduledAt: scheduleState.isScheduled ? scheduleState.scheduledDateTime : null,
    etaMinutes: estimate.route.etaMinutes,
    paymentMethod: selectedPaymentMethod,
    riderLocation: mapState.markers.rider
      ? { lat: mapState.markers.rider.getLngLat().lat, lng: mapState.markers.rider.getLngLat().lng, updatedAt: new Date().toISOString() }
      : null,
    events: [{
      id: `evt_${Date.now()}`,
      type: scheduleState.isScheduled ? 'ride_scheduled' : 'ride_requested',
      title: scheduleState.isScheduled ? 'Ride scheduled' : 'Ride requested',
      message: scheduleState.isScheduled
        ? `Scheduled for ${new Date(scheduleState.scheduledDateTime).toLocaleString()}.`
        : 'Waiting for a driver to accept your trip.',
      createdAt: new Date().toISOString()
    }]
  };
  console.log('[RIDER] Booking ride:', {
    pickupAddress: baseRide.pickupLabel,
    destinationAddress: baseRide.destinationLabel,
    rideType: baseRide.rideType,
    fareEstimate: baseRide.fareEstimate
  });

  if (accessToken) {
    const destinationAddress = destinationLocation?.label || document.getElementById('destination-input')?.value.trim() || '';
    const scheduledTime = scheduleState.isScheduled && scheduleState.scheduledDateTime ? scheduleState.scheduledDateTime : undefined;
    const requestBody = {
      pickupLat: pickup.lat,
      pickupLng: pickup.lng,
      dropoffLat: destination.lat,
      dropoffLng: destination.lng,
      pickupAddress: pickupLocation?.label || document.getElementById('pickup-input')?.value.trim() || '',
      dropoffAddress: destinationAddress,
      rideType: normalizedRideType,
      fareEstimate: estimate.fareEstimate,
      distance: estimate.route.distanceMiles,
      duration: estimate.route.etaMinutes,
      miles: estimate.route.distanceMiles,
      minutes: estimate.route.etaMinutes,
      riderId: currentUser.id,
      ...(appliedPromo ? { promoCode: appliedPromo.code, discountAmount, finalFare } : {}),
      paymentMethod: selectedPaymentMethod,
      preferredDriverGender: selectedPreferredDriverGender || 'no_preference',
      ...(scheduledTime ? { scheduledAt: scheduledTime, scheduledTime } : {})
    };
    try {
      console.log('[Ride Booking] Payload:', requestBody);
      console.log('[Payment] Selected method:', selectedPaymentMethod);
      if (scheduleState.isScheduled) {
        const scheduled = await fetchJson('/api/scheduled/book', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(requestBody)
        });
        console.log('[Ride Booking] Scheduled API response:', { status: scheduled.response.status, data: scheduled.data });
        if (scheduled.response.ok && scheduled.data?.id) {
          console.log(`[BOOKING] Ride created: ${scheduled.data.id}`);
          console.log(`[BOOKING] Ride status: ${scheduled.data.status || baseRide.status}`);
          return upsertSharedRide({
            ...baseRide,
            ...scheduled.data,
            pickupLabel: scheduled.data.pickupLabel || scheduled.data.pickupAddress || baseRide.pickupLabel,
            destinationLabel: scheduled.data.destinationLabel || scheduled.data.dropoffAddress || baseRide.destinationLabel,
            fareDetails: baseRide.fareDetails
          });
        }
      }
      const { response, data } = await fetchJson('/api/rides', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(requestBody)
      });
      console.log('[Ride Booking] API response:', { status: response.status, data });
      if (response.ok && data?.ok && data.ride) {
        console.log(`[BOOKING] Ride created: ${data.ride.id}`);
        console.log(`[BOOKING] Ride status: ${data.ride.status}`);
        return upsertSharedRide({ ...baseRide, ...data.ride, fareDetails: data.ride.fareDetails || baseRide.fareDetails });
      }
      const fallback = await fetchJson('/api/rides/request', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(requestBody)
      });
      console.log('[Ride Booking] Fallback API response:', { status: fallback.response.status, data: fallback.data });
      if (fallback.response.ok && fallback.data?.ok && fallback.data.ride) {
        console.log(`[BOOKING] Ride created: ${fallback.data.ride.id}`);
        console.log(`[BOOKING] Ride status: ${fallback.data.ride.status}`);
        return upsertSharedRide({ ...baseRide, ...fallback.data.ride, fareDetails: fallback.data.ride.fareDetails || baseRide.fareDetails });
      }
    } catch (_error) {
      // Fall back to local demo mode.
    }
  }

  const localRide = upsertSharedRide({ ...baseRide, id: `ride_local_${Date.now()}` });
  console.log(`[BOOKING] Ride created: ${localRide.id}`);
  console.log(`[BOOKING] Ride status: ${localRide.status}`);
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
  const status = normalizeRideStatus(ride?.status || 'idle');
  if (status === 'requested') return { pill: 'Searching', message: 'Searching for nearby drivers...', step: 'searching', headerStatus: 'Finding a driver' };
  if (status === 'assigned') return { pill: 'Assigned', message: 'Your driver is on the way to pickup.', step: 'assigned', headerStatus: 'Driver assigned' };
  if (status === 'arrived_at_pickup') return { pill: 'Arriving', message: 'Your driver has arrived at the pickup point.', step: 'arriving', headerStatus: 'Driver at pickup' };
  if (status === 'started') return { pill: 'In trip', message: 'You are on the way to your destination.', step: 'started', headerStatus: 'Ride in progress' };
  if (status === 'completed') return { pill: 'Completed', message: 'Ride completed successfully.', step: 'completed', headerStatus: 'Trip completed' };
  if (status === 'canceled') return { pill: 'Canceled', message: 'Ride canceled.', step: 'canceled', headerStatus: 'Ride canceled' };
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
  setPollingIndicator(Boolean(currentRide && ACTIVE_RIDE_STATUSES.includes(normalizeRideStatus(currentRide.status))));
  document.getElementById('ride-empty-state')?.classList.toggle('d-none', rides.some(ride => ride.riderId === currentUser?.id));

  const assignedCard = getNodeById('driver-assigned-card');
  const showDriverCard = Boolean(currentRide && DRIVER_VISIBLE_RIDE_STATUSES.includes(normalizeRideStatus(currentRide.status)));
  const rideStatus = normalizeRideStatus(currentRide?.status || '');
  const wasHidden = assignedCard?.classList.contains('d-none');
  if (assignedCard) assignedCard.classList.toggle('d-none', !showDriverCard);
  if (showDriverCard) {
    if (wasHidden) {
      assignedCard.classList.remove('slide-up');
      void assignedCard.offsetWidth; // force reflow so the animation restarts from scratch
      assignedCard.classList.add('slide-up');
    }
    const activeDriver = {
      ...(currentRide.driver || assignedDriver || {}),
      vehicle: (
        currentRide?.driver?.vehicle && typeof currentRide.driver.vehicle === 'object'
          ? currentRide.driver.vehicle
          : (currentRide?.vehicle && typeof currentRide.vehicle === 'object' ? currentRide.vehicle : undefined)
      )
    };
    renderDriverCardDetails(activeDriver, currentRide.etaMinutes || currentRide.minutes || 0);
    const statusText = String(currentRide.driverStatus || '').trim();
    const distanceText = formatDistanceAway(currentRide.distanceAway);
    safeSetText('driver-location', [distanceText, statusText].filter(Boolean).join(' • ') || '--');
    if (distanceText) animateNumericText('driver-countdown', distanceText);
    if (!etaCountdownIntervalId) animateNumericText('driver-eta', formatMinutes(currentRide.etaMinutes || currentRide.minutes || 0));
  }

  const cancelButton = document.getElementById('cancel-ride-button');
  const requestButton = document.getElementById('request-ride-button');
  const buttonGroup = document.querySelector('.button-group');
  const canCancelRide = Boolean(currentRide && ['requested', 'assigned', 'arrived_at_pickup'].includes(normalizeRideStatus(currentRide.status)));
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

  // Show/hide promo section based on whether route is estimated
  const hasRoute = Boolean(latestEstimate?.fareEstimate);
  showPromoSection(hasRoute);

  // Show/hide safety buttons based on active ride status
  renderSafetyButtons();

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

  // Phase 6: Trigger spoken alerts on status transitions
  if (currentRide?.status && currentRide.status !== lastSpokenRideStatus) {
    lastSpokenRideStatus = currentRide.status;
    const spokenAlertState = state.step || currentRide.status;
    triggerSpokenAlert(spokenAlertState);
  }

  // Phase 6: Show/hide voice controls with driver card
  const voiceControlsRow = document.getElementById('voice-controls-row');
  if (voiceControlsRow) voiceControlsRow.classList.toggle('d-none', !showDriverCard);
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
  const safeMessage = escapeHtml(message);
  const toast = document.createElement('div');
  toast.className = `toast-item toast-item--${type}`;
  toast.setAttribute('role', 'status');
  toast.innerHTML =
    `<span class="toast-icon" role="img" aria-label="${iconLabel[type] || 'Info'}">${iconMap[type] || 'ℹ️'}</span>` +
    `<span class="toast-message">${safeMessage}</span>` +
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
  const canCancelRide = Boolean(
    currentRide && ['requested', 'assigned', 'arrived_at_pickup'].includes(normalizeRideStatus(currentRide.status))
  );
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

  // Recalculate promo discount if promo is applied
  if (appliedPromo) {
    discountAmount = roundToTwo(calculateDiscount(estimate.fareEstimate, appliedPromo));
    originalFare = roundToTwo(estimate.fareEstimate);
    finalFare = roundToTwo(estimate.fareEstimate - discountAmount);
    renderPromoApplied();
    updateFareWithDiscount();
  }
  showPromoSection(Boolean(estimate?.fareEstimate));
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
  element.setAttribute('aria-label', 'Driver vehicle marker');

  const speedBadge = document.createElement('div');
  speedBadge.className = 'driver-marker-speed';
  speedBadge.textContent = 'Driver';

  const body = document.createElement('div');
  body.className = 'driver-marker-body';

  const vehicle = document.createElement('i');
  vehicle.className = 'bi bi-car-front-fill driver-marker-vehicle';
  vehicle.setAttribute('aria-hidden', 'true');

  body.appendChild(vehicle);
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
  const body = markerElement.querySelector('.driver-marker-body');
  const speedBadge = markerElement.querySelector('.driver-marker-speed');
  if (body) {
    body.style.transform = `rotate(${normalizeHeading(position.heading ?? mapState.driverHeading)}deg)`;
  }
  if (speedBadge) {
    const speedMph = Number(currentRide?.driverLocation?.speed);
    speedBadge.textContent = Number.isFinite(speedMph) && speedMph > 0
      ? `${Math.round(speedMph)} mph`
      : (currentRide?.driverName || 'Driver');
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

  const normalizedRideStatus = normalizeRideStatus(currentRide?.status);
  const shouldDisplayDriverMarker = Boolean(currentRide?.driverLocation)
    && ACTIVE_RIDE_STATUSES.includes(normalizedRideStatus)
    && !TERMINAL_RIDE_STATUSES.includes(normalizedRideStatus);
  const driverLocation = currentRide?.driverLocation;
  if (shouldDisplayDriverMarker && driverLocation && Number.isFinite(Number(driverLocation.lat)) && Number.isFinite(Number(driverLocation.lng))) {
    if (!mapState.markers.driver) {
      mapState.markers.driver = new window.mapboxgl.Marker({ element: createDriverMarkerElement() });
    }
    if (Number.isFinite(Number(driverLocation.heading))) {
      mapState.driverHeading = normalizeHeading(Number(driverLocation.heading));
    } else if (mapState.lastDriverPosition) {
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
    // Also remove the driver-car symbol layer/source if present
    const map = mapState.map;
    if (map) {
      if (map.getLayer('driver-car')) map.removeLayer('driver-car');
      if (map.getSource('driver-car')) map.removeSource('driver-car');
    }
  }
}

async function refreshMapRoute(options = {}) {
  const { fitRoute = false, force = false } = options;
  const { pickup, destination } = getPickupAndDestination({ allowFallback: true });
  const normalizedRideStatus = normalizeRideStatus(currentRide?.status);
  const hasDriverLocation = Boolean(
    currentRide?.driverLocation
    && Number.isFinite(Number(currentRide.driverLocation.lat))
    && Number.isFinite(Number(currentRide.driverLocation.lng))
  );
  const useDriverApproachRoute = hasDriverLocation && DRIVER_APPROACH_RIDE_STATUSES.includes(normalizedRideStatus);
  const routeStart = useDriverApproachRoute
    ? { lat: Number(currentRide.driverLocation.lat), lng: Number(currentRide.driverLocation.lng) }
    : pickup;
  const routeEnd = useDriverApproachRoute ? pickup : destination;
  const nextRouteKey = [
    Number(routeStart.lat).toFixed(5),
    Number(routeStart.lng).toFixed(5),
    Number(routeEnd.lat).toFixed(5),
    Number(routeEnd.lng).toFixed(5),
    normalizedRideStatus
  ].join(':');
  mapState.lastRouteKey = nextRouteKey;
  if (!force && mapState.lastFetchedRouteKey === nextRouteKey) {
    if (fitRoute || !mapState.hasFittedScene || useDriverApproachRoute) fitMapToScene(pickup, destination);
    return;
  }

  const route = await fetchDirectionsRoute(routeStart, routeEnd);
  if (nextRouteKey !== mapState.lastRouteKey) return;
  if (Number.isFinite(Number(route?.distanceKm))) {
    console.log(`[MAP] Route distance: ${Number(route.distanceKm).toFixed(2)} km`);
  } else if (Number.isFinite(Number(route?.distanceMiles))) {
    console.log(`[MAP] Route distance: ${(Number(route.distanceMiles) * 1.60934).toFixed(2)} km`);
  }
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
  mapState.routeSourceLabel = useDriverApproachRoute ? 'Driver to pickup route' : route.sourceLabel;
  mapState.routeTrafficLabel = route.trafficLabel || 'Clear route';
  updateRouteSource();
  renderRouteInstructions(route.instructions);
  safeSetText('route-source-badge', mapState.routeSourceLabel);
  safeSetText('map-route-traffic', mapState.routeTrafficLabel);

  // Use actual Mapbox distance/duration to refresh fare estimate if data is valid
  if (Number.isFinite(route.distanceMiles) && Number.isFinite(route.etaMinutes) && route.distanceMiles > 0) {
    if (useDriverApproachRoute) {
    safeSetText('map-route-distance', formatMiles(route.distanceMiles));
    animateNumericText('map-route-duration', formatMinutes(route.etaMinutes));
    safeSetText('map-route-overview', `Driver to pickup • ${formatMiles(route.distanceMiles)} • ${formatMinutes(route.etaMinutes)}`);
    animateNumericText('map-route-arrival', formatArrivalTimeFromMinutes(route.etaMinutes));
    if (!etaCountdownIntervalId) animateNumericText('driver-eta', formatMinutes(route.etaMinutes));
    } else {
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
  }

  if (fitRoute || !mapState.hasFittedScene || useDriverApproachRoute) fitMapToScene(pickup, destination);
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
  const shouldTrackDriver = Boolean(
    currentRide?.driverLocation
    && DRIVER_APPROACH_RIDE_STATUSES.includes(normalizeRideStatus(currentRide?.status))
  );
  refreshMapRoute({ fitRoute: fitRoute || shouldTrackDriver }).catch(() => {
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
    setPollingIndicator(Boolean(currentRide && ACTIVE_RIDE_STATUSES.includes(normalizeRideStatus(currentRide?.status))));
  }
  rides = mergeRides(backendRides, readSharedRideStore().rides);
  writeSharedRideStore({ rides });
  selectCurrentRide();
  const normalizedStatus = normalizeRideStatus(currentRide?.status);
  if (currentRide?.id && normalizedStatus === 'requested') {
    if (!realtimeSocketConnected) startPollingForDriver(currentRide.id);
    if (realtimeSocketConnected) subscribeRideRoom(currentRide.id);
  } else if (!currentRide?.id || TERMINAL_RIDE_STATUSES.includes(normalizedStatus) || DRIVER_VISIBLE_RIDE_STATUSES.includes(normalizedStatus)) {
    stopPollingForDriver();
    if (currentRide?.id && realtimeSocketConnected) subscribeRideRoom(currentRide.id);
  }
  renderRideState();
}

function subscribeRideRoom(rideId) {
  const normalizedRideId = String(rideId || '').trim();
  if (!realtimeSocket || !realtimeSocketConnected || !normalizedRideId) return;
  if (subscribedRideRoomId === normalizedRideId) return;
  realtimeSocket.emit('ride:join', { rideId: normalizedRideId });
  subscribedRideRoomId = normalizedRideId;
}

function applyRealtimeRideUpdate(nextRideLike) {
  const nextRide = normalizeRide(nextRideLike);
  if (!nextRide?.id) return;
  const previousStatus = normalizeRideStatus(currentRide?.status);
  currentRide = nextRide;
  rides = mergeRides([nextRide], readSharedRideStore().rides);
  writeSharedRideStore({ rides });
  renderRideState();
  subscribeRideRoom(nextRide.id);
  const nextStatus = normalizeRideStatus(nextRide.status);
  if (DRIVER_VISIBLE_RIDE_STATUSES.includes(nextStatus) && previousStatus !== nextStatus) {
    stopPollingForDriver();
  } else if (TERMINAL_RIDE_STATUSES.includes(nextStatus)) {
    stopPollingForDriver();
  }
}

function applyRealtimeDriverLocation(payload) {
  const rideId = String(payload?.rideId || '').trim();
  if (!rideId) return;
  const baseRide = currentRide?.id === rideId
    ? currentRide
    : rides.find(ride => ride.id === rideId);
  if (!baseRide) return;
  const lat = Number(payload?.lat);
  const lng = Number(payload?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
  console.log(`[MAP] Driver location updated: lat=${lat}, lng=${lng}`);
  const previousLocation = baseRide.driverLocation || {};
  const heading = Number.isFinite(Number(payload?.heading))
    ? normalizeHeading(Number(payload.heading))
    : (Number.isFinite(Number(previousLocation.heading)) ? Number(previousLocation.heading) : null);
  const distanceMiles = calculateDistanceKm(lat, lng, Number(baseRide.pickupLat), Number(baseRide.pickupLng)) * KM_TO_MILES;
  const etaMinutes = Math.max(1, Math.round(distanceMiles * ETA_MINUTES_PER_MILE));
  applyRealtimeRideUpdate({
    ...baseRide,
    distanceAway: Number(distanceMiles.toFixed(1)),
    etaMinutes,
    driverLocation: {
      ...(baseRide.driverLocation || {}),
      lat,
      lng,
      heading,
      speed: Number.isFinite(Number(payload?.speed)) ? Number(payload.speed) : previousLocation.speed,
      updatedAt: payload?.updatedAt || new Date().toISOString()
    }
  });
}

function stopRealtimeEtaRefresh() {
  if (realtimeEtaRefreshIntervalId) {
    window.clearInterval(realtimeEtaRefreshIntervalId);
    realtimeEtaRefreshIntervalId = null;
  }
}

function startRealtimeEtaRefresh() {
  stopRealtimeEtaRefresh();
  realtimeEtaRefreshIntervalId = window.setInterval(() => {
    const status = normalizeRideStatus(currentRide?.status);
    if (!currentRide?.id || !currentRide?.driverLocation) return;
    if (!DRIVER_APPROACH_RIDE_STATUSES.includes(status)) return;
    refreshMapRoute({ force: true }).catch(() => {});
  }, REALTIME_ETA_REFRESH_INTERVAL_MS);
}

function startRideRealtimeSync() {
  if (!accessToken || typeof window.io === 'undefined') return false;
  try {
    realtimeSocket = window.io({
      auth: { token: accessToken }
    });
  } catch (_error) {
    realtimeSocket = null;
    return false;
  }
  realtimeSocket.on('connect', () => {
    realtimeSocketConnected = true;
    subscribedRideRoomId = null;
    realtimeSocket.emit('dispatch:subscribe');
    if (currentRide?.id) subscribeRideRoom(currentRide.id);
    stopPollingForDriver();
  });
  realtimeSocket.on('disconnect', () => {
    realtimeSocketConnected = false;
    subscribedRideRoomId = null;
  });
  realtimeSocket.on('dispatch:trip_update', payload => {
    if (!payload?.ride) return;
    applyRealtimeRideUpdate(payload.ride);
  });
  realtimeSocket.on('dispatch:assignment_confirmed', payload => {
    const ridePayload = payload?.ride || payload?.assignment || payload;
    if (!ridePayload) return;
    applyRealtimeRideUpdate(ridePayload);
  });
  realtimeSocket.on('dispatch:request_rejected', payload => {
    if (!payload?.rideId || payload.rideId !== currentRide?.id) return;
    showToast('No driver accepted in time. Still searching…', 'warning');
  });
  realtimeSocket.on('ride:driver_location', payload => {
    applyRealtimeDriverLocation(payload);
  });
  startRealtimeEtaRefresh();
  return true;
}

async function pollForDriverAssignment(rideId) {
  if (!rideId || !accessToken) return;
  const { response, data } = await fetchJson(`/api/rides/${encodeURIComponent(rideId)}`, { headers: getAuthHeaders() });
  if (!response.ok || !data?.ok || !data?.ride) return;
  const previousStatus = normalizeRideStatus(currentRide?.status);
  const nextRide = normalizeRide(data.ride);
  currentRide = nextRide;
  rides = mergeRides([nextRide], readSharedRideStore().rides);
  writeSharedRideStore({ rides });
  renderRideState();
  const nextStatus = normalizeRideStatus(nextRide.status);
  if (DRIVER_VISIBLE_RIDE_STATUSES.includes(nextStatus) && previousStatus !== nextStatus) {
    const driver = nextRide.driver || {};
    const vehicle = driver.vehicle || {};
    console.log(
      `[RIDER] Driver assigned! Driver: ${driver.name || 'Driver'}, Vehicle: ${vehicle.year || '--'} ${vehicle.color || ''} ${vehicle.make || ''} ${vehicle.model || ''}`.trim()
    );
    stopPollingForDriver();
  } else if (TERMINAL_RIDE_STATUSES.includes(nextStatus)) {
    stopPollingForDriver();
  }
}

function stopPollingForDriver() {
  if (ridePollingIntervalId) {
    window.clearInterval(ridePollingIntervalId);
    ridePollingIntervalId = null;
    console.log('[RIDER] Polling stopped');
  }
}

function startPollingForDriver(rideId) {
  if (!rideId || !accessToken) return;
  stopPollingForDriver();
  console.log(`[RIDER] Polling for driver assignment: ${rideId}`);
  pollForDriverAssignment(rideId).catch(() => {});
  ridePollingIntervalId = window.setInterval(() => {
    pollForDriverAssignment(rideId).catch(() => {});
  }, DRIVER_ASSIGNMENT_POLL_INTERVAL_MS);
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
  // Validate schedule time if scheduling
  if (scheduleState.isScheduled) {
    if (!scheduleState.scheduledDateTime) {
      showPopup('Please select a date and time to schedule your ride.');
      return;
    }
    const { valid, error } = validateScheduleTime(new Date(scheduleState.scheduledDateTime));
    if (!valid) {
      showPopup(error);
      return;
    }
  }

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
  if (requestLabel) requestLabel.textContent = scheduleState.isScheduled ? 'Scheduling...' : 'Booking...';
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
      if (scheduleState.isScheduled) {
        requestLabel.textContent = 'Ride Scheduled!';
        const dt = new Date(scheduleState.scheduledDateTime);
        const dtStr = dt.toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
        showPopup(`Ride scheduled for ${dtStr}`);
        // Add to scheduled rides list
        scheduleState.scheduledRides.push({ ...currentRide, reminderSent: false });
        renderScheduledRides();
        console.log('[Schedule] Scheduled ride for:', scheduleState.scheduledDateTime);
      } else {
        requestLabel.textContent = 'Ride booked!';
        showPopup('Searching for nearby drivers...');
      }
      if (icon) icon.className = 'bi bi-check2-circle btn-icon';
      window.setTimeout(() => {
        if (icon) icon.className = 'bi bi-lightning-charge-fill btn-icon';
        requestLabel.textContent = scheduleState.isScheduled ? 'Schedule Ride' : 'Book a ride';
        requestButton.classList.remove('is-success');
      }, REQUEST_SUCCESS_ANIMATION_MS);
    }
    showToast('Searching for nearby drivers...', 'info');

    if (!scheduleState.isScheduled && currentRide?.id) {
      if (realtimeSocketConnected) subscribeRideRoom(currentRide.id);
      else startPollingForDriver(currentRide.id);
    }
  } catch (err) {
    const errorMsg = (err instanceof Error && err.message) || 'Failed to book ride. Please try again.';
    if (bookingErrorEl) {
      bookingErrorEl.textContent = errorMsg;
      bookingErrorEl.classList.remove('d-none');
    } else {
      showPopup(errorMsg);
    }
    if (requestLabel) requestLabel.textContent = scheduleState.isScheduled ? 'Schedule Ride' : 'Book a ride';
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
  stopDriverLocationSim();
  assignedDriver = null;
  currentDriver = null;
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
    if (currentRide?.id && ACTIVE_RIDE_STATUSES.includes(normalizeRideStatus(currentRide.status))) {
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
  const card = getNodeById('driver-assigned-card');
  if (!card) return;

  const normalizedDriver = driver.vehicle && typeof driver.vehicle === 'object'
    ? driver
    : {
      ...driver,
      vehicle: {
        label: String(driver.vehicle || '').trim(),
        plate: driver.plate || driver.plateNumber || '',
        plateNumber: driver.plate || driver.plateNumber || ''
      }
    };
  renderDriverCardDetails(normalizedDriver, etaMinutes || 5);

  // Online indicator
  card.querySelector('.driver-online-dot')?.classList.add('is-online');
  card.classList.remove('d-none');
  card.classList.remove('slide-up');
  void card.offsetWidth;
  card.classList.add('slide-up');
}

function pickRandomDriver() {
  const index = Math.floor(Math.random() * MOCK_DRIVER_POOL.length);
  return MOCK_DRIVER_POOL[index];
}

function addDriverMarkerToMap(driver) {
  if (!mapState.mapLoaded || !mapState.map) return;
  const map = mapState.map;
  const driverLat = Number(driver?.location?.lat || driver?.lat || 0);
  const driverLng = Number(driver?.location?.lng || driver?.lng || 0);
  if (!Number.isFinite(driverLat) || !Number.isFinite(driverLng)) return;

  const geojsonData = {
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      properties: { driverName: driver?.name || 'Driver' },
      geometry: { type: 'Point', coordinates: [driverLng, driverLat] }
    }]
  };

  const setupSymbolLayer = () => {
    if (map.getSource('driver-car')) {
      map.getSource('driver-car').setData(geojsonData);
      if (!map.getLayer('driver-car')) {
        map.addLayer({
          id: 'driver-car',
          type: 'symbol',
          source: 'driver-car',
          layout: {
            'icon-image': 'driver-car-icon',
            'icon-size': 0.6,
            'icon-allow-overlap': true,
            'icon-anchor': 'bottom'
          }
        });
      }
    } else {
      map.addSource('driver-car', { type: 'geojson', data: geojsonData });
      if (!map.getLayer('driver-car')) {
        map.addLayer({
          id: 'driver-car',
          type: 'symbol',
          source: 'driver-car',
          layout: {
            'icon-image': 'driver-car-icon',
            'icon-size': 0.6,
            'icon-allow-overlap': true,
            'icon-anchor': 'bottom'
          }
        });
      }
    }
  };

  if (map.hasImage('driver-car-icon')) {
    setupSymbolLayer();
  } else {
    map.loadImage('/assets/vehicles/economy-car.png', (error, image) => {
      if (error || !image) {
        // Fall back to DOM marker if image cannot be loaded
        simulateDriverMovementOnMap(driverLat, driverLng);
        return;
      }
      if (!map.hasImage('driver-car-icon')) {
        map.addImage('driver-car-icon', image);
      }
      setupSymbolLayer();
    });
  }

  mapState.lastDriverPosition = { lat: driverLat, lng: driverLng };
  console.log(`[MAP] Driver marker positioned at (${driverLat}, ${driverLng})`);
}

function updateDriverMarkerLocation(newLat, newLng) {
  if (!mapState.mapLoaded || !mapState.map) return;
  if (!Number.isFinite(newLat) || !Number.isFinite(newLng)) return;
  const map = mapState.map;
  if (map.getSource('driver-car')) {
    map.getSource('driver-car').setData({
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        properties: {},
        geometry: { type: 'Point', coordinates: [newLng, newLat] }
      }]
    });
  } else if (mapState.markers.driver) {
    if (mapState.lastDriverPosition) {
      animateDriverMarkerTo(mapState.markers.driver, mapState.lastDriverPosition, { lat: newLat, lng: newLng });
    } else {
      mapState.markers.driver.setLngLat([newLng, newLat]);
    }
  }
  mapState.lastDriverPosition = { lat: newLat, lng: newLng };
  console.log(`[MAP] Driver marker positioned at (${newLat}, ${newLng})`);
}

function stopDriverLocationSim() {
  if (driverLocationSimIntervalId) {
    window.clearInterval(driverLocationSimIntervalId);
    driverLocationSimIntervalId = null;
  }
}

function simulateDriverLocationUpdates(pickupLat, pickupLng) {
  stopDriverLocationSim();
  if (!mapState.lastDriverPosition) return;
  let currentLat = mapState.lastDriverPosition.lat;
  let currentLng = mapState.lastDriverPosition.lng;
  let etaSeconds = (currentDriver?.etaMinutes || 4) * 60;

  driverLocationSimIntervalId = window.setInterval(() => {
    // Move 5% closer to pickup each interval
    const stepFraction = 0.05;
    currentLat += (pickupLat - currentLat) * stepFraction;
    currentLng += (pickupLng - currentLng) * stepFraction;

    updateDriverMarkerLocation(currentLat, currentLng);

    // Update ETA
    etaSeconds = Math.max(0, etaSeconds - DRIVER_LOCATION_UPDATE_INTERVAL_MS / 1000);
    const etaMins = Math.ceil(etaSeconds / 60);
    if (etaCountdownIntervalId === null) {
      animateNumericText('driver-eta', formatMinutes(etaMins));
      animateNumericText('driver-countdown', formatMinutes(etaMins));
    }

    // Update distance using approximate miles per degree of latitude
    const dLat = pickupLat - currentLat;
    const dLng = pickupLng - currentLng;
    const distanceDeg = Math.sqrt(dLat * dLat + dLng * dLng);
    const distanceMi = (distanceDeg * MILES_PER_LAT_DEGREE).toFixed(1);
    safeSetText('driver-distance-away', `${distanceMi} mi`);

    if (etaSeconds <= 0) {
      stopDriverLocationSim();
    }
  }, DRIVER_LOCATION_UPDATE_INTERVAL_MS);
}

// Fallback: creates a DOM-element driver marker when the image-based symbol layer
// (driver-car) cannot be loaded (e.g. missing PNG asset or map not ready).
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
    // Use the DEMO_DRIVER as the assigned driver
    const driver = {
      ...DEMO_DRIVER,
      driverId: `driver_${Date.now()}`,
      location: {
        lat: pickupLat + (Math.random() - 0.5) * DRIVER_START_POSITION_OFFSET,
        lng: pickupLng + (Math.random() - 0.5) * DRIVER_START_POSITION_OFFSET
      }
    };
    assignedDriver = driver;
    currentDriver = driver;
    const driverEta = driver.etaMinutes || MIN_DRIVER_ETA_MINUTES;
    const driverDistance = driver.distanceAway || '0.8 mi';

    applyRideStatusUpdate(rideId, {
      status: 'assigned',
      driverId: driver.driverId,
      driverName: driver.name,
      distanceAway: driverDistance,
      driver: {
        id: driver.driverId,
        name: driver.name,
        rating: driver.rating,
        photoUrl: driver.photoUrl,
        phone: driver.phone,
        distanceAway: driverDistance,
        vehicle: {
          make: driver.vehicle.make,
          model: driver.vehicle.model,
          year: Number(driver.vehicle.year) || null,
          color: driver.vehicle.color,
          plate: driver.vehicle.plate,
          photoUrl: driver.vehicle.photoUrl
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

    // Add car icon marker to map using map.loadImage()
    addDriverMarkerToMap(driver);
    // Start periodic location updates simulating approach to pickup
    simulateDriverLocationUpdates(pickupLat, pickupLng);

    // Simulate driver arriving
    statusProgressionTimerId = window.setTimeout(() => {
      applyRideStatusUpdate(currentRide?.id, { status: 'arrived_at_pickup', etaMinutes: 0 });
      stopEtaCountdown();
      stopDriverLocationSim();
      animateNumericText('driver-eta', 'Here now');
      animateNumericText('driver-countdown', 'Here now');
    }, driverEta * 60 * 1000);
  }, delay);
}

// ─── Promo Code ─────────────────────────────────────────────────────────────

const MOCK_PROMO_CODES = {
  SAVE15: { type: 'percentage', value: 15, maxDiscount: 50, description: '15% off your next ride', validUntil: '2027-12-31T23:59:59Z', minFare: 10, applicableRideTypes: ['ECONOMY', 'COMFORT', 'PREMIUM'] },
  SAVE5: { type: 'fixed', value: 5, description: '$5 off your next ride', validUntil: '2027-12-31T23:59:59Z', minFare: 8, applicableRideTypes: ['ECONOMY', 'COMFORT', 'PREMIUM'] },
  DRIVE10: { type: 'percentage', value: 10, maxDiscount: 20, description: '10% off any ride', validUntil: '2027-12-31T23:59:59Z', minFare: 0, applicableRideTypes: ['ECONOMY', 'COMFORT', 'PREMIUM'] }
};

function validatePromoCode(code, rideType, fare) {
  if (!code || !/^[A-Z0-9]{3,20}$/.test(code)) {
    return { valid: false, error: 'Invalid promo code format.' };
  }
  const promo = MOCK_PROMO_CODES[code];
  if (!promo) return { valid: false, error: 'Promo code not found.' };
  const now = new Date();
  if (promo.validUntil && new Date(promo.validUntil) < now) {
    return { valid: false, error: 'This code has expired.' };
  }
  if (promo.minFare && fare < promo.minFare) {
    return { valid: false, error: `Minimum fare $${promo.minFare.toFixed(2)} required for this code.` };
  }
  if (promo.applicableRideTypes && !promo.applicableRideTypes.includes(rideType)) {
    const rideLabel = rideType ? rideType.charAt(0).toUpperCase() + rideType.slice(1).toLowerCase() : 'this ride type';
    return { valid: false, error: `This code is not valid for ${rideLabel} rides.` };
  }
  return { valid: true, promo };
}

function calculateDiscount(fare, promo) {
  if (!promo || !fare) return 0;
  if (promo.type === 'percentage') {
    const raw = (fare * promo.value) / 100;
    return Math.min(raw, promo.maxDiscount || raw);
  }
  if (promo.type === 'fixed') {
    return Math.min(promo.value, fare);
  }
  return 0;
}

function showPromoError(message) {
  const node = document.getElementById('promo-error');
  if (!node) return;
  node.textContent = message;
  node.classList.remove('d-none');
}

function hidePromoError() {
  document.getElementById('promo-error')?.classList.add('d-none');
}

function renderPromoApplied() {
  const badge = document.getElementById('promo-applied-badge');
  const inputRow = document.getElementById('promo-input-row');
  const codeNode = document.getElementById('promo-badge-code');
  const descNode = document.getElementById('promo-badge-desc');
  const savingsNode = document.getElementById('promo-savings-text');
  const discountRow = document.getElementById('promo-discount-row');
  const discountLabel = document.getElementById('promo-discount-label-text');
  const discountValue = document.getElementById('fare-discount');

  if (appliedPromo) {
    if (badge) badge.classList.remove('d-none');
    if (inputRow) inputRow.classList.add('d-none');
    if (codeNode) codeNode.textContent = appliedPromo.code;
    if (descNode) descNode.textContent = appliedPromo.description || '';
    if (savingsNode) savingsNode.textContent = `You save ${formatCurrency(discountAmount)}`;
    if (discountRow) discountRow.classList.remove('d-none');
    if (discountLabel) discountLabel.textContent = `Promo: ${appliedPromo.code}`;
    if (discountValue) discountValue.textContent = `-${formatCurrency(discountAmount)}`;
  } else {
    if (badge) badge.classList.add('d-none');
    if (inputRow) inputRow.classList.remove('d-none');
    if (discountRow) discountRow.classList.add('d-none');
  }
}

function updateFareWithDiscount() {
  const estimateNode = document.getElementById('fare-estimate');
  if (!estimateNode) return;
  if (appliedPromo && discountAmount > 0) {
    estimateNode.textContent = formatCurrency(finalFare);
  } else if (latestEstimate) {
    estimateNode.textContent = formatCurrency(latestEstimate.fareEstimate);
  }
}

async function handleApplyPromo(code) {
  if (!code) {
    showPromoError('Please enter a promo code.');
    return;
  }
  hidePromoError();
  const btn = document.getElementById('apply-promo-button');
  setButtonLoading('apply-promo-button', true);

  try {
    const fare = latestEstimate?.fareEstimate || 0;

    // Try backend validation first
    if (accessToken) {
      try {
        const { response, data } = await fetchJson('/api/promos/validate', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ code, rideType: selectedRideType, fare })
        });
        if (response.ok && data?.valid) {
          appliedPromo = { code, ...data.promo };
          discountAmount = roundToTwo(data.discountAmount || 0);
          originalFare = roundToTwo(fare);
          finalFare = roundToTwo(data.finalFare || fare - discountAmount);
          console.log('[Promo] Applied code:', code, 'Discount:', discountAmount);
          renderPromoApplied();
          updateFareWithDiscount();
          return;
        }
        if (response.ok && data?.error) {
          showPromoError(data.error);
          return;
        }
      } catch (_error) {
        // Fall through to local validation
      }
    }

    // Local mock validation
    const result = validatePromoCode(code, selectedRideType, fare);
    if (!result.valid) {
      showPromoError(result.error);
      return;
    }
    const promo = result.promo;
    const discount = roundToTwo(calculateDiscount(fare, promo));
    appliedPromo = { code, ...promo };
    discountAmount = discount;
    originalFare = roundToTwo(fare);
    finalFare = roundToTwo(fare - discount);
    console.log('[Promo] Applied code:', code, 'Discount:', discountAmount);
    renderPromoApplied();
    updateFareWithDiscount();
  } finally {
    setButtonLoading('apply-promo-button', false);
  }
}

function clearPromoCode() {
  appliedPromo = null;
  discountAmount = 0;
  originalFare = 0;
  finalFare = 0;
  const input = document.getElementById('promo-code-input');
  if (input) input.value = '';
  hidePromoError();
  renderPromoApplied();
  updateFareWithDiscount();
  console.log('[Promo] Code cleared');
}

function showPromoSection(show) {
  const section = document.getElementById('promo-section');
  if (section) section.classList.toggle('d-none', !show);
}

// ─── SOS / Safety ───────────────────────────────────────────────────────────

function setSOSModalOpen(isOpen) {
  sosModalOpen = Boolean(isOpen);
  const modal = document.getElementById('sos-modal');
  if (modal) modal.classList.toggle('d-none', !sosModalOpen);
  if (!sosModalOpen) {
    const confirmMsg = document.getElementById('sos-confirmation-message');
    if (confirmMsg) confirmMsg.classList.add('d-none');
  }
}

function handleSOSClick() {
  setSOSModalOpen(true);
}

function showSOSConfirmation(message) {
  const node = document.getElementById('sos-confirmation-message');
  if (!node) return;
  node.textContent = message;
  node.classList.remove('d-none');
  window.setTimeout(() => setSOSModalOpen(false), 5000);
}

async function logSOSIncident(incidentType, description) {
  const rideId = currentRide?.id || null;
  const location = latestKnownRiderPosition || null;
  const payload = {
    rideId,
    userId: currentUser?.id || null,
    location,
    timestamp: new Date().toISOString(),
    driverId: currentRide?.driverId || null,
    driverName: currentRide?.driverName || assignedDriver?.name || null,
    incidentType,
    description
  };
  console.log('[SOS] Incident logged:', payload);
  if (accessToken) {
    try {
      await fetchJson('/api/safety/sos', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });
    } catch (_error) {
      // Log locally only if API unavailable
    }
  }
}

function callEmergencyServices() {
  logSOSIncident('call_911', 'User initiated 911 call').catch(() => {});
  console.log('[Safety] SOS activated:', { rideId: currentRide?.id, location: latestKnownRiderPosition, time: new Date().toISOString() });
  showSOSConfirmation('Opening phone dialer to call 911…');
  window.setTimeout(() => {
    window.location.href = 'tel:911';
  }, 800);
}

function alertEmergencyContacts() {
  logSOSIncident('alert_contacts', 'User alerted emergency contacts').catch(() => {});
  console.log('[Safety] SOS activated:', { rideId: currentRide?.id, location: latestKnownRiderPosition, time: new Date().toISOString() });
  showSOSConfirmation('Emergency contacts have been notified.');
}

function shareLocationWithAuthorities(coordinates) {
  const loc = coordinates || latestKnownRiderPosition;
  logSOSIncident('share_location_police', 'User shared location with police').catch(() => {});
  console.log('[Safety] SOS activated:', { rideId: currentRide?.id, location: loc, time: new Date().toISOString() });
  showSOSConfirmation('Your location has been shared with authorities.');
}

// ─── Share Trip ──────────────────────────────────────────────────────────────

function setShareTripModalOpen(isOpen) {
  shareTripModalOpen = Boolean(isOpen);
  const modal = document.getElementById('share-trip-modal');
  if (modal) modal.classList.toggle('d-none', !shareTripModalOpen);
}

async function handleShareTripClick() {
  if (!currentRide?.id) {
    showPopup('No active ride to share.');
    return;
  }

  // Populate share modal details
  const pickupLabel = document.getElementById('pickup-input')?.value || currentRide.pickupLabel || '--';
  const destinationLabel = document.getElementById('destination-input')?.value || currentRide.destinationLabel || '--';
  const driverName = currentRide.driverName || assignedDriver?.name || '--';
  const driverRating = currentRide.driver?.rating || assignedDriver?.rating || '';
  const etaText = document.getElementById('driver-eta')?.textContent || '--';

  const sharePickup = document.getElementById('share-pickup-label');
  const shareDest = document.getElementById('share-destination-label');
  const shareDriver = document.getElementById('share-driver-info');
  const shareEta = document.getElementById('share-eta-info');

  if (sharePickup) sharePickup.textContent = pickupLabel;
  if (shareDest) shareDest.textContent = destinationLabel;
  if (shareDriver) shareDriver.textContent = driverRating ? `${driverName} (⭐ ${Number(driverRating).toFixed(1)})` : driverName;
  if (shareEta) shareEta.textContent = `ETA: ${etaText}`;

  // Generate shareable link
  let shareLink = '';
  if (accessToken) {
    try {
      const { response, data } = await fetchJson(`/api/rides/${currentRide.id}/share`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ rideId: currentRide.id })
      });
      if (response.ok && data?.shareLink) {
        shareLink = data.shareLink;
      }
    } catch (_error) {
      // Backend will remain the source of truth for secure share links.
    }
  }
  if (!shareLink) {
    showPopup('Could not generate a share link right now. Please try again.');
    return;
  }
  currentShareLink = shareLink;

  const linkInput = document.getElementById('share-link-input');
  if (linkInput) linkInput.value = shareLink;

  const copyLabel = document.getElementById('share-copy-label');
  if (copyLabel) copyLabel.textContent = 'Copy Link';

  setShareTripModalOpen(true);
  console.log('[Share] Trip share modal opened:', { rideId: currentRide.id, shareLink });
}

function handleCopyLink() {
  if (!currentShareLink) return;
  navigator.clipboard.writeText(currentShareLink).then(() => {
    const copyLabel = document.getElementById('share-copy-label');
    if (copyLabel) {
      copyLabel.textContent = 'Copied!';
      window.setTimeout(() => { copyLabel.textContent = 'Copy Link'; }, 2500);
    }
    console.log('[Share] Trip shared:', { rideId: currentRide?.id, method: 'copy', recipient: null });
    showPopup('Link copied to clipboard!');
  }).catch(() => {
    showPopup('Could not copy link. Please copy it manually.');
  });
}

function handleShareSMS(phoneNumber) {
  const link = currentShareLink;
  if (!link) return;
  const driverName = currentRide?.driverName || assignedDriver?.name || 'your driver';
  const message = encodeURIComponent(`I'm on my way! Track my ride with ${driverName}: ${link}`);
  console.log('[Share] Trip shared:', { rideId: currentRide?.id, method: 'sms', recipient: phoneNumber || null });
  window.location.href = `sms:${phoneNumber ? encodeURIComponent(phoneNumber) : ''}?body=${message}`;
}

function handleShareEmail(email) {
  const link = currentShareLink;
  if (!link) return;
  const subject = encodeURIComponent('Tracking my ride — live trip link');
  const driverName = currentRide?.driverName || assignedDriver?.name || 'my driver';
  const body = encodeURIComponent(`Hi,\n\nI'm currently in a ride with ${driverName}. You can track my trip in real time here:\n\n${link}\n\nThe link expires after the ride is complete.\n\nStay safe!`);
  console.log('[Share] Trip shared:', { rideId: currentRide?.id, method: 'email', recipient: email || null });
  window.location.href = `mailto:${email || ''}?subject=${subject}&body=${body}`;
}

async function handleNativeShare() {
  const link = currentShareLink;
  if (!link) return;
  if (navigator.share) {
    try {
      await navigator.share({
        title: 'Track my ride',
        text: 'Follow my live trip:',
        url: link
      });
      console.log('[Share] Trip shared:', { rideId: currentRide?.id, method: 'native', recipient: null });
    } catch (_error) {
      // User cancelled or browser doesn't support
    }
  } else {
    handleCopyLink();
  }
}

function renderSafetyButtons() {
  const safetyRow = document.getElementById('safety-actions-row');
  if (!safetyRow) return;
  const activeStatuses = ['accepted', 'arrived_at_pickup', 'started'];
  const isActive = Boolean(currentRide && activeStatuses.includes(currentRide.status));
  safetyRow.classList.toggle('d-none', !isActive);
}

// ── Phase 6: Text-to-Speech (Spoken Alerts) ──────────────────────────────────

function speak(text, options = {}) {
  if (!voiceAlertsEnabled || isMuted) {
    console.log('[Voice Alert] Suppressed (muted or disabled):', text);
    return;
  }
  if (!window.speechSynthesis) {
    console.warn('[Voice Alert] SpeechSynthesis not available');
    return;
  }
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.rate = options.rate || 1.0;
  utterance.pitch = options.pitch || 1.0;
  utterance.volume = voiceVolume;
  utterance.onstart = () => {
    console.log('[Voice Alert] Speaking:', text);
    isSpeaking = true;
  };
  utterance.onend = () => {
    isSpeaking = false;
    if (alertQueue.length > 0) {
      const next = alertQueue.shift();
      speak(next.text, next.options);
    }
  };
  utterance.onerror = (event) => {
    console.error('[Voice Alert] Error:', event.error);
    isSpeaking = false;
  };
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

function queueAlert(text, options = {}) {
  console.log('[Voice Alert] Triggered:', text);
  if (isSpeaking) {
    alertQueue.push({ text, options });
  } else {
    speak(text, options);
  }
}

function toggleVoiceAlerts() {
  voiceAlertsEnabled = !voiceAlertsEnabled;
  localStorage.setItem('drive.voiceAlertsEnabled', voiceAlertsEnabled ? 'true' : 'false');
  const toggle = document.getElementById('voice-alerts-toggle');
  if (toggle) toggle.checked = voiceAlertsEnabled;
  console.log('[Voice Alert] Alerts', voiceAlertsEnabled ? 'enabled' : 'disabled');
}

function toggleMute() {
  isMuted = !isMuted;
  const btn = document.getElementById('btn-mute-alerts');
  const icon = btn?.querySelector('i');
  if (btn) btn.classList.toggle('is-muted', isMuted);
  if (icon) icon.className = isMuted ? 'bi bi-volume-mute-fill' : 'bi bi-volume-up-fill';
  if (btn) btn.title = isMuted ? 'Unmute spoken alerts' : 'Mute spoken alerts';
  if (btn) btn.setAttribute('aria-label', isMuted ? 'Unmute spoken alerts' : 'Mute spoken alerts');
  if (isMuted && window.speechSynthesis) window.speechSynthesis.cancel();
  console.log('[Voice Alert] Mute:', isMuted);
}

function setVoiceVolume(percent) {
  voiceVolume = Math.max(0, Math.min(1, percent / 100));
  console.log('[Voice Alert] Volume set to:', voiceVolume);
}

function cancelAllAlerts() {
  alertQueue.length = 0;
  isSpeaking = false;
  if (window.speechSynthesis) window.speechSynthesis.cancel();
}

// ── Phase 6: Voice Commands (Speech Recognition) ─────────────────────────────

function setVoiceButtonState(state) {
  const btn = document.getElementById('btn-voice-command');
  const icon = btn?.querySelector('i');
  if (!btn) return;
  btn.classList.remove('is-listening', 'is-processing', 'is-error');
  if (state === 'listening') {
    btn.classList.add('is-listening');
    if (icon) icon.className = 'bi bi-mic-fill';
    btn.title = 'Stop listening';
    btn.setAttribute('aria-label', 'Stop voice command');
  } else if (state === 'processing') {
    btn.classList.add('is-processing');
    if (icon) icon.className = 'bi bi-hourglass-split';
    btn.title = 'Processing…';
    btn.setAttribute('aria-label', 'Processing voice command');
  } else if (state === 'error') {
    btn.classList.add('is-error');
    if (icon) icon.className = 'bi bi-mic-mute-fill';
    btn.title = 'Voice command error';
    btn.setAttribute('aria-label', 'Voice command error');
  } else {
    if (icon) icon.className = 'bi bi-mic-fill';
    btn.title = 'Voice command';
    btn.setAttribute('aria-label', 'Voice command');
  }
}

function setVoiceFeedback(text, isError = false) {
  const el = document.getElementById('voice-feedback');
  const textEl = document.getElementById('voice-feedback-text');
  if (!el || !textEl) return;
  textEl.textContent = text || '';
  el.classList.toggle('d-none', !text);
  el.classList.toggle('is-error', Boolean(isError));
}

function matchVoiceCommand(transcript) {
  const lower = transcript.toLowerCase();
  for (const [cmd, phrases] of Object.entries(voiceCommands)) {
    if (phrases.some(phrase => lower.includes(phrase))) return cmd;
  }
  return null;
}

function executeVoiceCommand(command) {
  console.log('[Voice] Command executed:', command);
  switch (command) {
    case 'where_driver': {
      const eta = currentRide?.etaMinutes || currentRide?.minutes || 0;
      const etaText = eta > 0 ? `${Math.round(eta)} minute${Math.round(eta) !== 1 ? 's' : ''}` : 'a moment';
      const msg = `Your driver is ${etaText} away`;
      setVoiceFeedback(msg);
      speak(msg);
      break;
    }
    case 'cancel_ride': {
      const msg = 'Confirming cancellation. Say yes to confirm or no to cancel.';
      setVoiceFeedback(msg);
      speak(msg);
      // Listen for confirmation
      window.setTimeout(() => listenForCancellationConfirm(), 3500);
      break;
    }
    case 'call_driver': {
      setVoiceFeedback('Calling your driver');
      speak('Calling your driver');
      window.setTimeout(() => {
        const driverPhone = sanitizePhoneForUri(currentRide?.driver?.phone || currentRide?.driverPhone || '');
        if (driverPhone) {
          window.location.href = `tel:${driverPhone}`;
        } else {
          showPopup('Driver phone number is unavailable.');
        }
      }, 1200);
      break;
    }
    default:
      break;
  }
}

function listenForCancellationConfirm() {
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRec) return;
  const confirmRec = new SpeechRec();
  confirmRec.lang = 'en-US';
  confirmRec.continuous = false;
  confirmRec.interimResults = false;
  confirmRec.onresult = (event) => {
    const transcript = (event.results[0]?.[0]?.transcript || '').toLowerCase().replace(/[.!?]/g, '').trim();
    console.log('[Voice] Cancellation confirmation:', transcript);
    if (CANCELLATION_CONFIRMATION_RESPONSES.has(transcript)) {
      setVoiceFeedback('Cancelling your ride…');
      speak('Your ride has been cancelled');
      handleCancelRide().catch(() => {});
    } else {
      setVoiceFeedback('Cancellation aborted.');
      speak('OK, keeping your ride.');
      window.setTimeout(() => setVoiceFeedback(''), 3000);
    }
  };
  confirmRec.onerror = () => {
    setVoiceFeedback('Could not hear confirmation.', true);
    window.setTimeout(() => setVoiceFeedback(''), 3000);
  };
  try {
    confirmRec.start();
  } catch (_e) {
    const message = 'Could not start cancellation confirmation.';
    setVoiceFeedback(message, true);
    speak('Could not start confirmation. Please try again.');
    window.setTimeout(() => setVoiceFeedback(''), 3000);
  }
}

function handleVoiceResult(event) {
  const transcript = Array.from(event.results)
    .map(result => result[0].transcript)
    .join('')
    .toLowerCase();
  const confidence = event.results[event.results.length - 1]?.[0]?.confidence ?? 1;
  console.log('[Speech Recognition] Recognized:', transcript, 'confidence:', confidence);
  setVoiceFeedback(`Listening… you said: "${transcript}"`);

  const isFinal = event.results[event.results.length - 1]?.isFinal;
  if (!isFinal) return;

  setVoiceButtonState('processing');
  const command = matchVoiceCommand(transcript);
  if (command && confidence >= MIN_VOICE_COMMAND_CONFIDENCE) {
    executeVoiceCommand(command);
  } else if (command) {
    const msg = "I didn't quite catch that. Please try again.";
    setVoiceFeedback(msg, true);
    speak(msg);
  } else {
    const msg = "I didn't understand. You can say 'where is my driver', 'cancel my ride', or 'call my driver'.";
    setVoiceFeedback(msg, true);
    speak(msg);
  }
  window.setTimeout(() => {
    setVoiceButtonState('idle');
    setVoiceFeedback('');
  }, 5000);
}

function handleVoiceError(event) {
  console.error('[Speech Recognition] Error:', event.error);
  isListening = false;
  setVoiceButtonState('error');
  let msg = '';
  if (event.error === 'no-speech') {
    msg = "Sorry, I didn't hear that. Please try again.";
  } else if (event.error === 'not-allowed' || event.error === 'permission-denied') {
    msg = 'Please enable microphone access to use voice commands.';
  } else {
    msg = 'Voice command error. Please try again.';
  }
  setVoiceFeedback(msg, true);
  speak(msg);
  window.setTimeout(() => {
    setVoiceButtonState('idle');
    setVoiceFeedback('');
  }, 5000);
}

function initializeVoiceRecognition() {
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRec) {
    console.warn('[Speech Recognition] Not supported in this browser');
    const btn = document.getElementById('btn-voice-command');
    if (btn) {
      btn.disabled = true;
      btn.title = 'Voice commands not supported on this browser';
    }
    return;
  }
  recognition = new SpeechRec();
  recognition.lang = 'en-US';
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.onstart = () => {
    console.log('[Speech Recognition] Listening started');
    isListening = true;
    setVoiceButtonState('listening');
    setVoiceFeedback('Listening…');
  };
  recognition.onresult = (event) => handleVoiceResult(event);
  recognition.onerror = (event) => handleVoiceError(event);
  recognition.onend = () => {
    console.log('[Speech Recognition] Listening ended');
    isListening = false;
    if (document.getElementById('btn-voice-command')?.classList.contains('is-listening')) {
      setVoiceButtonState('idle');
    }
  };
}

function handleVoiceClick() {
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRec) {
    showPopup('Voice commands not supported on this browser.');
    return;
  }
  if (!recognition) initializeVoiceRecognition();
  if (!recognition) return;
  if (isListening) {
    recognition.stop();
    isListening = false;
    setVoiceButtonState('idle');
    setVoiceFeedback('');
  } else {
    try {
      recognition.start();
    } catch (err) {
      console.error('[Voice] Could not start recognition:', err);
      showPopup('Could not start voice recognition. Please try again.');
    }
  }
}

function triggerSpokenAlert(step) {
  if (!voiceAlertsEnabled) return;
  const driver = currentRide?.driver || assignedDriver || {};
  const driverName = driver.name || 'Your driver';
  const vehicleDisplay = getDriverVehicleDisplay(
    driver.vehicle && typeof driver.vehicle === 'object'
      ? driver.vehicle
      : { label: driver.vehicle || '', plateNumber: driver.plate || driver.plateNumber || '' }
  );
  const vehicleInfo = [vehicleDisplay.specs, vehicleDisplay.title]
    .filter(part => part && part !== 'Vehicle details pending')
    .join(' ') || 'their vehicle';
  const eta = currentRide?.etaMinutes || currentRide?.minutes || 0;
  const etaText = eta > 0 ? formatMinutes(eta) : 'a moment';
  const fare = currentRide?.fare || currentRide?.fareEstimate || 0;

  switch (step) {
    case 'assigned':
      queueAlert(`A driver has been assigned. ${driverName} is on the way in ${vehicleInfo}.`);
      break;
    case 'arriving':
      queueAlert('Your driver has arrived at your pickup location.');
      break;
    case 'started':
      queueAlert(`Your ride has started. Estimated arrival time: ${etaText}.`);
      break;
    case 'completed':
      queueAlert(`Your ride is complete. Thank you for riding with us. Your fare is ${formatCurrency(fare)}.`);
      break;
    case 'canceled':
      queueAlert('Your ride has been cancelled.');
      break;
    default:
      break;
  }
}

// ─── Saved Places ─────────────────────────────────────────────────────────────

function loadSavedPlaces() {
  const raw = localStorage.getItem(SAVED_PLACES_STORAGE_KEY);
  savedPlaces = parseJson(raw, []);
  if (!Array.isArray(savedPlaces)) savedPlaces = [];
  console.log('[Saved Places] Loaded places:', savedPlaces.length);
  return savedPlaces;
}

function persistSavedPlaces() {
  localStorage.setItem(SAVED_PLACES_STORAGE_KEY, JSON.stringify(savedPlaces));
}

async function fetchSavedPlaces() {
  loadSavedPlaces();
  if (accessToken) {
    try {
      const { response, data } = await fetchJson('/api/riders/places', { headers: getAuthHeaders() });
      if (response.ok && Array.isArray(data?.places)) {
        savedPlaces = data.places;
        persistSavedPlaces();
        console.log('[Saved Places] Fetched from backend:', savedPlaces.length);
      }
    } catch (_error) {
      // Use localStorage fallback silently
    }
  }
  renderSavedPlacesList();
  populateQuickPlaces();
}

async function saveSavedPlace(place) {
  const idx = savedPlaces.findIndex(p => p.id === place.id);
  if (idx >= 0) {
    savedPlaces[idx] = { ...savedPlaces[idx], ...place };
  } else {
    savedPlaces.push({ ...place, createdAt: new Date().toISOString() });
  }
  persistSavedPlaces();
  console.log('[Saved Places] Saved place:', place);
  if (accessToken) {
    try {
      await fetchJson('/api/riders/places', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ places: savedPlaces })
      });
    } catch (_error) {}
  }
  renderSavedPlacesList();
  populateQuickPlaces();
}

async function deleteSavedPlace(placeId) {
  savedPlaces = savedPlaces.filter(p => p.id !== placeId);
  persistSavedPlaces();
  console.log('[Saved Places] Deleted place:', placeId);
  if (accessToken) {
    try {
      await fetchJson('/api/riders/places', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ places: savedPlaces })
      });
    } catch (_error) {}
  }
  renderSavedPlacesList();
  populateQuickPlaces();
}

function updatePlaceLastUsed(placeId) {
  const place = savedPlaces.find(p => p.id === placeId);
  if (place) {
    place.lastUsed = new Date().toISOString();
    persistSavedPlaces();
    console.log('[Saved Places] Updated last used:', placeId);
  }
}

function populateQuickPlaces() {
  const typeOrder = { home: 0, work: 1, favorite: 2 };
  const sorted = [...savedPlaces].sort((a, b) => {
    const td = (typeOrder[a.type] ?? 2) - (typeOrder[b.type] ?? 2);
    if (td !== 0) return td;
    return (b.lastUsed || '') > (a.lastUsed || '') ? 1 : -1;
  }).slice(0, 5);

  ['pickup', 'destination'].forEach(field => {
    const container = document.getElementById(`${field}-quick-places`);
    if (!container) return;
    if (!sorted.length) {
      container.classList.add('d-none');
      container.innerHTML = '';
      return;
    }
    container.classList.remove('d-none');
    container.innerHTML = sorted.map(place => {
      const icon = place.type === 'home' ? 'house-fill' : place.type === 'work' ? 'briefcase-fill' : 'star-fill';
      return `<button type="button" class="quick-place-btn" data-place-id="${escapeHtml(place.id)}" data-field="${field}" aria-label="${escapeHtml(place.label)} – set as ${field}"><i class="bi bi-${icon}"></i><span>${escapeHtml(place.label)}</span></button>`;
    }).join('');
    container.querySelectorAll('.quick-place-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        handleQuickPlaceClick(btn.getAttribute('data-place-id'), btn.getAttribute('data-field'));
      });
    });
  });
}

function handleQuickPlaceClick(placeId, field) {
  const place = savedPlaces.find(p => p.id === placeId);
  if (!place || !place.address) return;
  const inputId = `${field}-input`;
  const input = document.getElementById(inputId);
  if (input) {
    input.value = place.address;
    input.dataset.committedValue = place.address;
  }
  // Only pass resolved location if we have valid coordinates
  if (place.coordinates && Number.isFinite(place.coordinates.lat) && Number.isFinite(place.coordinates.lng)) {
    setResolvedLocation(inputId, { coordinates: place.coordinates, label: place.address }, place.address);
    setInputFeedback(inputId, 'success', `${place.label} selected.`);
    refreshFareEstimate({ fitRoute: true }).catch(() => {});
  } else {
    // No geocoded coordinates – trigger geocode resolution from the text
    setInputFeedback(inputId, 'info', 'Resolving location…');
    resolveCoordinateInput(inputId, { fitRoute: true, showError: false }).catch(() => {});
  }
  updatePlaceLastUsed(placeId);
  console.log('[Saved Places] Quick place selected:', place.label, 'for', field);
}

function renderSavedPlacesList() {
  const list = document.getElementById('saved-places-list');
  const emptyState = document.getElementById('saved-places-empty');
  if (!list) return;

  if (!savedPlaces.length) {
    list.innerHTML = '';
    emptyState?.classList.remove('d-none');
    return;
  }
  emptyState?.classList.add('d-none');

  const typeOrder = { home: 0, work: 1, favorite: 2 };
  const sorted = [...savedPlaces].sort((a, b) => (typeOrder[a.type] ?? 2) - (typeOrder[b.type] ?? 2));

  list.innerHTML = sorted.map(place => {
    const icon = place.type === 'home' ? 'house-fill' : place.type === 'work' ? 'briefcase-fill' : 'star-fill';
    return `
      <div class="saved-place-item">
        <div class="saved-place-icon saved-place-icon--${escapeHtml(place.type)}">
          <i class="bi bi-${icon}"></i>
        </div>
        <div class="saved-place-info">
          <div class="saved-place-label">${escapeHtml(place.label)}</div>
          <div class="saved-place-address">${escapeHtml(place.address)}</div>
          ${place.notes ? `<div class="saved-place-notes">${escapeHtml(place.notes)}</div>` : ''}
        </div>
        <div class="saved-place-actions">
          <button type="button" class="saved-place-edit-btn" data-place-id="${escapeHtml(place.id)}" aria-label="Edit ${escapeHtml(place.label)}">
            <i class="bi bi-pencil-fill"></i>
          </button>
          <button type="button" class="saved-place-delete-btn" data-place-id="${escapeHtml(place.id)}" aria-label="Delete ${escapeHtml(place.label)}">
            <i class="bi bi-trash-fill"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');

  list.querySelectorAll('.saved-place-edit-btn').forEach(btn => {
    btn.addEventListener('click', () => openPlaceModal(btn.getAttribute('data-place-id')));
  });
  list.querySelectorAll('.saved-place-delete-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const placeId = btn.getAttribute('data-place-id');
      const place = savedPlaces.find(p => p.id === placeId);
      if (!place) return;
      pendingDeletePlaceId = placeId;
      const descEl = document.getElementById('delete-place-description');
      if (descEl) descEl.textContent = `"${place.label}" will be removed from your saved places.`;
      document.getElementById('delete-place-modal')?.classList.remove('d-none');
    });
  });
}

function openPlaceModal(editId = null) {
  placeModalEditId = editId || null;
  const modal = document.getElementById('place-modal');
  const title = document.getElementById('place-modal-title');
  const typeSelect = document.getElementById('place-type-select');
  const labelInput = document.getElementById('place-label-input');
  const addressInput = document.getElementById('place-address-input');
  const notesInput = document.getElementById('place-notes-input');
  const errorEl = document.getElementById('place-modal-error');
  if (!modal) return;

  if (editId) {
    const place = savedPlaces.find(p => p.id === editId);
    if (!place) return;
    if (title) title.textContent = 'Edit Place';
    if (typeSelect) typeSelect.value = place.type || 'favorite';
    if (labelInput) labelInput.value = place.label || '';
    if (addressInput) addressInput.value = place.address || '';
    if (notesInput) notesInput.value = place.notes || '';
  } else {
    if (title) title.textContent = 'Add Place';
    if (typeSelect) typeSelect.value = 'favorite';
    if (labelInput) labelInput.value = '';
    if (addressInput) addressInput.value = '';
    if (notesInput) notesInput.value = '';
  }
  if (errorEl) errorEl.classList.add('d-none');
  updatePlaceLabelVisibility();
  modal.classList.remove('d-none');
  console.log('[Saved Places] Opened place modal:', editId ? 'edit' : 'add');
}

function closePlaceModal() {
  document.getElementById('place-modal')?.classList.add('d-none');
  placeModalEditId = null;
}

function updatePlaceLabelVisibility() {
  const typeSelect = document.getElementById('place-type-select');
  const labelGroup = document.getElementById('place-label-group');
  if (!typeSelect || !labelGroup) return;
  const type = typeSelect.value;
  labelGroup.style.display = type === 'favorite' ? '' : 'none';
}

async function handlePlaceModalSave() {
  const typeSelect = document.getElementById('place-type-select');
  const labelInput = document.getElementById('place-label-input');
  const addressInput = document.getElementById('place-address-input');
  const notesInput = document.getElementById('place-notes-input');
  const errorEl = document.getElementById('place-modal-error');

  const type = typeSelect?.value || 'favorite';
  const rawLabel = String(labelInput?.value || '').trim();
  const address = String(addressInput?.value || '').trim();
  const notes = String(notesInput?.value || '').trim();

  const label = type === 'home' ? 'Home' : type === 'work' ? 'Work' : rawLabel;

  const showError = msg => {
    if (errorEl) {
      errorEl.textContent = msg;
      errorEl.classList.remove('d-none');
    }
  };

  if (!address) { showError('Please enter an address.'); return; }
  if (type === 'favorite' && !rawLabel) { showError('Please enter a label for this place.'); return; }

  // Check for duplicate home/work (exclude the current place being edited)
  if (type === 'home' || type === 'work') {
    const existing = savedPlaces.find(p => p.type === type && p.id !== placeModalEditId);
    if (existing) { showError(`You already have a ${label} saved. Edit it instead.`); return; }
  }

  // Check max favorites (exclude the current place being edited)
  if (type === 'favorite') {
    const favCount = savedPlaces.filter(p => p.type === 'favorite' && p.id !== placeModalEditId).length;
    if (favCount >= MAX_FAVORITE_PLACES) { showError(`You can save up to ${MAX_FAVORITE_PLACES} favorite places.`); return; }
  }

  // Geocode address to get coordinates
  let coordinates = null;
  try {
    const token = mapState.token;
    if (token) {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${token}&limit=1`;
      const res = await fetch(url);
      const json = await res.json();
      const feature = json?.features?.[0];
      if (feature) {
        coordinates = { lat: feature.center[1], lng: feature.center[0] };
      }
    }
  } catch (_error) {}

  const place = {
    id: placeModalEditId || `place_${type}_${Date.now()}`,
    label,
    type,
    address,
    coordinates,
    notes,
    lastUsed: null
  };

  await saveSavedPlace(place);
  closePlaceModal();
  showPopup(`${label} saved!`);
}

// ─── Schedule Ride ─────────────────────────────────────────────────────────────

function handleScheduleToggle(isScheduled) {
  scheduleState.isScheduled = isScheduled;
  const nowBtn = document.getElementById('ride-now-btn');
  const laterBtn = document.getElementById('schedule-later-btn');
  const pickerSection = document.getElementById('schedule-picker-section');
  const requestBtn = document.getElementById('request-ride-button');
  const requestLabel = requestBtn?.querySelector('.btn-label');

  nowBtn?.classList.toggle('is-active', !isScheduled);
  laterBtn?.classList.toggle('is-active', isScheduled);
  nowBtn?.setAttribute('aria-pressed', String(!isScheduled));
  laterBtn?.setAttribute('aria-pressed', String(isScheduled));

  if (isScheduled) {
    pickerSection?.classList.remove('d-none');
    if (requestLabel) requestLabel.textContent = 'Schedule Ride';
    // Set minimum date to today
    const dateInput = document.getElementById('schedule-date');
    if (dateInput) {
      const now = new Date();
      dateInput.min = now.toISOString().split('T')[0];
      const maxDate = new Date(now);
      maxDate.setDate(maxDate.getDate() + SCHEDULE_MAX_DAYS_AHEAD);
      dateInput.max = maxDate.toISOString().split('T')[0];
    }
    // Set minimum time if today is selected
    updateScheduleTimeMin();
  } else {
    pickerSection?.classList.add('d-none');
    scheduleState.scheduledDateTime = null;
    if (requestLabel) requestLabel.textContent = 'Book a ride';
    document.getElementById('schedule-preview')?.classList.add('d-none');
    document.getElementById('schedule-validation-msg')?.classList.add('d-none');
  }
  console.log('[Schedule] Toggle:', isScheduled ? 'Schedule Later' : 'Ride Now');
}

function updateScheduleTimeMin() {
  const dateInput = document.getElementById('schedule-date');
  const timeInput = document.getElementById('schedule-time');
  if (!dateInput || !timeInput) return;
  const now = new Date();
  const selectedDate = dateInput.value;
  const todayStr = now.toISOString().split('T')[0];
  if (selectedDate === todayStr || !selectedDate) {
    const minTime = new Date(now.getTime() + SCHEDULE_MIN_MINUTES_AHEAD * 60 * 1000);
    timeInput.min = `${String(minTime.getHours()).padStart(2, '0')}:${String(minTime.getMinutes()).padStart(2, '0')}`;
  } else {
    timeInput.min = '00:00';
  }
}

function handleDateTimeSelect() {
  const dateInput = document.getElementById('schedule-date');
  const timeInput = document.getElementById('schedule-time');
  const preview = document.getElementById('schedule-preview');
  const previewText = document.getElementById('schedule-preview-text');
  const validationMsg = document.getElementById('schedule-validation-msg');
  const validationText = document.getElementById('schedule-validation-text');

  const dateVal = dateInput?.value;
  const timeVal = timeInput?.value;

  if (!dateVal || !timeVal) {
    preview?.classList.add('d-none');
    validationMsg?.classList.add('d-none');
    scheduleState.scheduledDateTime = null;
    return;
  }

  const scheduled = new Date(`${dateVal}T${timeVal}`);
  const { valid, error } = validateScheduleTime(scheduled);

  if (!valid) {
    preview?.classList.add('d-none');
    validationMsg?.classList.remove('d-none');
    if (validationText) validationText.textContent = error;
    scheduleState.scheduledDateTime = null;
    return;
  }

  validationMsg?.classList.add('d-none');
  scheduleState.scheduledDateTime = scheduled.toISOString();

  const formattedDate = scheduled.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  const formattedTime = scheduled.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (previewText) previewText.textContent = `${formattedDate} at ${formattedTime}`;
  preview?.classList.remove('d-none');

  console.log('[Schedule] Scheduled ride for:', scheduleState.scheduledDateTime);
}

function validateScheduleTime(datetime) {
  const now = new Date();
  const minTime = new Date(now.getTime() + SCHEDULE_MIN_MINUTES_AHEAD * 60 * 1000);
  const maxTime = new Date(now.getTime() + SCHEDULE_MAX_DAYS_AHEAD * 24 * 60 * 60 * 1000);

  if (datetime < minTime) {
    return { valid: false, error: `Please schedule at least ${SCHEDULE_MIN_MINUTES_AHEAD} minutes from now.` };
  }
  if (datetime > maxTime) {
    return { valid: false, error: `You can only schedule up to ${SCHEDULE_MAX_DAYS_AHEAD} days in advance.` };
  }
  return { valid: true, error: '' };
}

function applyScheduleQuickOption(offsetDays) {
  const dateInput = document.getElementById('schedule-date');
  const timeInput = document.getElementById('schedule-time');
  if (!dateInput || !timeInput) return;

  const target = new Date();
  target.setDate(target.getDate() + offsetDays);
  const dateStr = target.toISOString().split('T')[0];
  dateInput.value = dateStr;

  // Set a sensible default time for the offset
  if (offsetDays === 0) {
    // Today: use the minimum schedule-ahead constant plus a small buffer
    const minTime = new Date(Date.now() + (SCHEDULE_MIN_MINUTES_AHEAD + 5) * 60 * 1000);
    timeInput.value = `${String(minTime.getHours()).padStart(2, '0')}:${String(minTime.getMinutes()).padStart(2, '0')}`;
  } else {
    timeInput.value = '09:00';
  }

  document.querySelectorAll('.schedule-quick-btn').forEach(btn => {
    btn.classList.toggle('is-active', Number(btn.getAttribute('data-offset')) === offsetDays);
  });

  updateScheduleTimeMin();
  handleDateTimeSelect();
}

async function fetchScheduledRides() {
  if (accessToken) {
    try {
      const { response, data } = await fetchJson('/api/scheduled/mine', { headers: getAuthHeaders() });
      if (response.ok && Array.isArray(data)) {
        scheduleState.scheduledRides = data;
        console.log('[Schedule] Fetched scheduled rides:', scheduleState.scheduledRides.length);
      }
    } catch (_error) {}
  }
  // Also pull from local store
  const localRides = readSharedRideStore().rides.filter(r => r.scheduledAt && r.status === 'scheduled');
  const merged = [...scheduleState.scheduledRides];
  localRides.forEach(lr => {
    if (!merged.find(r => r.id === lr.id)) merged.push(lr);
  });
  scheduleState.scheduledRides = merged;
  renderScheduledRides();
}

function renderScheduledRides() {
  const list = document.getElementById('scheduled-rides-list');
  const emptyState = document.getElementById('scheduled-rides-empty');
  const countBadge = document.getElementById('scheduled-rides-count');
  if (!list) return;

  const rides = scheduleState.scheduledRides.filter(r => r.scheduledAt);
  if (countBadge) {
    countBadge.textContent = String(rides.length);
    countBadge.classList.toggle('d-none', rides.length === 0);
  }

  if (!rides.length) {
    list.innerHTML = '';
    emptyState?.classList.remove('d-none');
    return;
  }
  emptyState?.classList.add('d-none');

  const sorted = [...rides].sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));

  list.innerHTML = sorted.map(ride => {
    const dt = new Date(ride.scheduledAt);
    const dateStr = dt.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
    const timeStr = dt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    const from = escapeHtml(ride.pickupLabel || ride.pickupAddress || 'Pickup');
    const to = escapeHtml(ride.destinationLabel || ride.dropoffAddress || 'Destination');
    const fare = ride.fareEstimate ? `$${Number(ride.fareEstimate).toFixed(2)}` : '';
    return `
      <div class="scheduled-ride-item" data-ride-id="${escapeHtml(ride.id)}">
        <div class="scheduled-ride-time">
          <div class="scheduled-ride-date">${escapeHtml(dateStr)}</div>
          <div class="scheduled-ride-clock">${escapeHtml(timeStr)}</div>
        </div>
        <div class="scheduled-ride-info">
          <div class="scheduled-ride-route">${from} → ${to}</div>
          <div class="scheduled-ride-meta">${escapeHtml(ride.rideType || 'Economy')}${fare ? ` · ${fare}` : ''}</div>
        </div>
        <div class="scheduled-ride-actions">
          <button type="button" class="scheduled-ride-cancel-btn" data-ride-id="${escapeHtml(ride.id)}" aria-label="Cancel scheduled ride">
            <i class="bi bi-x-circle"></i> Cancel
          </button>
        </div>
      </div>
    `;
  }).join('');

  list.querySelectorAll('.scheduled-ride-cancel-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      pendingDeleteScheduledId = btn.getAttribute('data-ride-id');
      const modal = document.getElementById('cancel-scheduled-modal');
      modal?.classList.remove('d-none');
    });
  });
}

async function handleCancelScheduledRide(rideId) {
  if (!rideId) return;
  console.log('[Schedule] Cancelling scheduled ride:', rideId);
  if (accessToken) {
    try {
      await fetchJson(`/api/scheduled/${rideId}/cancel`, { method: 'POST', headers: getAuthHeaders() });
    } catch (_error) {}
  }
  scheduleState.scheduledRides = scheduleState.scheduledRides.filter(r => r.id !== rideId);
  // Also remove from shared ride store
  const store = readSharedRideStore();
  const updated = store.rides.map(r => r.id === rideId ? { ...r, status: 'canceled' } : r);
  writeSharedRideStore({ rides: updated });
  renderScheduledRides();
  showPopup('Scheduled ride cancelled.');
}

function setupScheduleRideReminders() {
  // Check every minute for rides happening in ~15 minutes
  window.setInterval(() => {
    const now = Date.now();
    scheduleState.scheduledRides.forEach(ride => {
      if (!ride.scheduledAt || ride.reminderSent) return;
      const diff = new Date(ride.scheduledAt).getTime() - now;
      if (diff > 0 && diff <= 15 * 60 * 1000) {
        const timeStr = new Date(ride.scheduledAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
        showPopup(`Your ride departs at ${timeStr} – 15 minutes away!`);
        ride.reminderSent = true;
        console.log('[Schedule] Reminder sent for ride:', ride.id);
      }
    });
  }, 60 * 1000);
}

function setupHandlers() {
  document.getElementById('logout-button')?.addEventListener('click', handleLogout);
  document.getElementById('request-ride-button')?.addEventListener('click', () => {
    handleRequestRide().catch(() => showPopup('Unable to book a ride.'));
  });
  document.getElementById('cancel-ride-button')?.addEventListener('click', () => {
    handleCancelRideClick();
  });
  document.getElementById('btn-cancel-ride-from-card')?.addEventListener('click', () => {
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

  // ─── Promo Code Handlers ────────────────────────────────────────────────
  document.getElementById('apply-promo-button')?.addEventListener('click', () => {
    const input = document.getElementById('promo-code-input');
    handleApplyPromo(String(input?.value || '').trim().toUpperCase()).catch(() => {});
  });
  document.getElementById('promo-code-input')?.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      event.preventDefault();
      const input = document.getElementById('promo-code-input');
      handleApplyPromo(String(input?.value || '').trim().toUpperCase()).catch(() => {});
    }
  });
  document.getElementById('clear-promo-button')?.addEventListener('click', () => {
    clearPromoCode();
  });

  // ─── SOS Handlers ───────────────────────────────────────────────────────
  document.getElementById('btn-sos')?.addEventListener('click', () => {
    handleSOSClick();
  });
  document.getElementById('sos-modal')?.addEventListener('click', event => {
    if (event.target === event.currentTarget) setSOSModalOpen(false);
  });
  document.getElementById('sos-cancel')?.addEventListener('click', () => {
    setSOSModalOpen(false);
  });
  document.getElementById('sos-call-911')?.addEventListener('click', () => {
    callEmergencyServices();
  });
  document.getElementById('sos-alert-contacts')?.addEventListener('click', () => {
    alertEmergencyContacts();
  });
  document.getElementById('sos-share-police')?.addEventListener('click', () => {
    shareLocationWithAuthorities();
  });

  // ─── Share Trip Handlers ─────────────────────────────────────────────────
  document.getElementById('btn-share-trip')?.addEventListener('click', () => {
    handleShareTripClick();
  });
  document.getElementById('share-trip-close')?.addEventListener('click', () => {
    setShareTripModalOpen(false);
  });
  document.getElementById('share-trip-modal')?.addEventListener('click', event => {
    if (event.target === event.currentTarget) setShareTripModalOpen(false);
  });
  document.getElementById('share-copy-link')?.addEventListener('click', () => {
    handleCopyLink();
  });
  document.getElementById('share-via-sms')?.addEventListener('click', () => {
    handleShareSMS();
  });
  document.getElementById('share-via-email')?.addEventListener('click', () => {
    handleShareEmail();
  });
  document.getElementById('share-via-native')?.addEventListener('click', () => {
    handleNativeShare();
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
  document.getElementById('btn-voice-command')?.addEventListener('click', handleVoiceClick);
  document.getElementById('btn-mute-alerts')?.addEventListener('click', toggleMute);
  document.getElementById('voice-alerts-toggle')?.addEventListener('change', (event) => {
    voiceAlertsEnabled = Boolean(event.target?.checked);
    localStorage.setItem('drive.voiceAlertsEnabled', voiceAlertsEnabled ? 'true' : 'false');
    console.log('[Voice Alert] Alerts', voiceAlertsEnabled ? 'enabled' : 'disabled');
  });
  document.getElementById('voice-volume-slider')?.addEventListener('input', (event) => {
    setVoiceVolume(Number(event.target?.value || 80));
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

  // ── Schedule Ride handlers ──────────────────────────────────────────────────
  document.getElementById('ride-now-btn')?.addEventListener('click', () => handleScheduleToggle(false));
  document.getElementById('schedule-later-btn')?.addEventListener('click', () => handleScheduleToggle(true));
  document.getElementById('schedule-date')?.addEventListener('change', () => {
    updateScheduleTimeMin();
    handleDateTimeSelect();
  });
  document.getElementById('schedule-time')?.addEventListener('change', handleDateTimeSelect);
  document.querySelectorAll('.schedule-quick-btn').forEach(btn => {
    btn.addEventListener('click', () => applyScheduleQuickOption(Number(btn.getAttribute('data-offset') || 0)));
  });

  // Set "Next Day" label dynamically
  const nextDayBtn = document.getElementById('schedule-quick-next-day');
  if (nextDayBtn) {
    const dayAfterTomorrow = new Date();
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
    nextDayBtn.textContent = dayAfterTomorrow.toLocaleDateString([], { weekday: 'short' });
  }

  // ── Saved Places handlers ───────────────────────────────────────────────────
  document.getElementById('add-place-btn')?.addEventListener('click', () => openPlaceModal(null));
  document.getElementById('place-modal-save')?.addEventListener('click', () => {
    handlePlaceModalSave().catch(() => showPopup('Unable to save place.'));
  });
  document.getElementById('place-modal-cancel')?.addEventListener('click', closePlaceModal);
  document.getElementById('place-modal')?.addEventListener('click', event => {
    if (event.target === event.currentTarget) closePlaceModal();
  });
  document.getElementById('place-type-select')?.addEventListener('change', updatePlaceLabelVisibility);

  // Place address autocomplete
  document.getElementById('place-address-input')?.addEventListener('input', () => {
    const input = document.getElementById('place-address-input');
    const value = String(input?.value || '').trim();
    if (geocodeDebounceTimers['place-address-input']) window.clearTimeout(geocodeDebounceTimers['place-address-input']);
    if (value.length < MIN_GEOCODE_QUERY_LENGTH) {
      document.getElementById('place-address-suggestions')?.classList.add('d-none');
      return;
    }
    geocodeDebounceTimers['place-address-input'] = window.setTimeout(async () => {
      const token = mapState.token;
      if (!token) return;
      try {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(value)}.json?access_token=${token}&limit=${MAX_GEOCODE_SUGGESTIONS}&country=US&types=address,place,poi`;
        const res = await fetch(url);
        const json = await res.json();
        const suggestions = document.getElementById('place-address-suggestions');
        if (!suggestions) return;
        const features = json?.features || [];
        if (!features.length) { suggestions.classList.add('d-none'); return; }
        suggestions.innerHTML = features.map(f =>
          `<div class="suggestion-item" tabindex="0" role="option">${escapeHtml(f.place_name)}</div>`
        ).join('');
        suggestions.classList.remove('d-none');
        suggestions.querySelectorAll('.suggestion-item').forEach((item, i) => {
          item.addEventListener('click', () => {
            if (input) input.value = features[i].place_name;
            suggestions.classList.add('d-none');
          });
          item.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') {
              if (input) input.value = features[i].place_name;
              suggestions.classList.add('d-none');
            }
          });
        });
      } catch (_error) {}
    }, GEOCODE_DEBOUNCE_MS);
  });
  document.getElementById('place-address-input')?.addEventListener('blur', () => {
    window.setTimeout(() => document.getElementById('place-address-suggestions')?.classList.add('d-none'), SUGGESTION_HIDE_DELAY_MS);
  });

  // ── Cancel Scheduled Ride handlers ─────────────────────────────────────────
  document.getElementById('cancel-scheduled-confirm')?.addEventListener('click', () => {
    const rideId = pendingDeleteScheduledId;
    pendingDeleteScheduledId = null;
    document.getElementById('cancel-scheduled-modal')?.classList.add('d-none');
    handleCancelScheduledRide(rideId).catch(() => showPopup('Unable to cancel scheduled ride.'));
  });
  document.getElementById('cancel-scheduled-keep')?.addEventListener('click', () => {
    pendingDeleteScheduledId = null;
    document.getElementById('cancel-scheduled-modal')?.classList.add('d-none');
  });
  document.getElementById('cancel-scheduled-modal')?.addEventListener('click', event => {
    if (event.target === event.currentTarget) {
      pendingDeleteScheduledId = null;
      event.currentTarget.classList.add('d-none');
    }
  });

  // ── Delete Place modal handlers ─────────────────────────────────────────────
  document.getElementById('delete-place-confirm')?.addEventListener('click', () => {
    const placeId = pendingDeletePlaceId;
    pendingDeletePlaceId = null;
    document.getElementById('delete-place-modal')?.classList.add('d-none');
    if (placeId) deleteSavedPlace(placeId).catch(() => showPopup('Unable to delete place.'));
  });
  document.getElementById('delete-place-cancel')?.addEventListener('click', () => {
    pendingDeletePlaceId = null;
    document.getElementById('delete-place-modal')?.classList.add('d-none');
  });
  document.getElementById('delete-place-modal')?.addEventListener('click', event => {
    if (event.target === event.currentTarget) {
      pendingDeletePlaceId = null;
      event.currentTarget.classList.add('d-none');
    }
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

  const driverGenderSelect = document.getElementById('driver-gender-pref-select');
  if (driverGenderSelect) {
    driverGenderSelect.addEventListener('change', () => {
      selectedPreferredDriverGender = driverGenderSelect.value || 'no_preference';
    });
  }

  if (!mapState.resizeHandlerBound) {
    mapState.resizeHandlerBound = true;
    window.addEventListener('resize', () => resizeMapNow(50));
  }

  window.addEventListener('beforeunload', () => {
    if (clockIntervalId) window.clearInterval(clockIntervalId);
    if (searchingDotsIntervalId) window.clearInterval(searchingDotsIntervalId);
    if (etaCountdownIntervalId) window.clearInterval(etaCountdownIntervalId);
    if (statusProgressionTimerId) window.clearTimeout(statusProgressionTimerId);
    if (ridePollingIntervalId) window.clearInterval(ridePollingIntervalId);
    if (estimateRetryTimerId) window.clearTimeout(estimateRetryTimerId);
    if (driverLocationSimIntervalId) window.clearInterval(driverLocationSimIntervalId);
    if (realtimeSocket) {
      realtimeSocket.disconnect();
      realtimeSocket = null;
    }
    stopRealtimeEtaRefresh();
    if (mapState.routeAnimationTimer) window.clearInterval(mapState.routeAnimationTimer);
    if (mapState.pendingDriverAnimation) window.cancelAnimationFrame(mapState.pendingDriverAnimation);
    Object.values(geocodeDebounceTimers).forEach(timer => window.clearTimeout(timer));
    cancelAllAlerts();
    if (recognition && isListening) { try { recognition.stop(); } catch (_e) { /* ignore */ } }
  });
}

window.addEventListener('load', async () => {
  if (!setupSession()) return;
  seedDefaultInputs();
  setupHandlers();
  startRideRealtimeSync();
  showPromoSection(false); // Hidden until fare is estimated
  initializeVoiceRecognition();
  const toggle = document.getElementById('voice-alerts-toggle');
  if (toggle) toggle.checked = voiceAlertsEnabled;
  const slider = document.getElementById('voice-volume-slider');
  if (slider) slider.value = String(Math.round(voiceVolume * 100));
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
  // Phase 4: Initialize saved places and schedule features
  await fetchSavedPlaces().catch(() => {});
  await fetchScheduledRides().catch(() => {});
  setupScheduleRideReminders();
});
