// ─── Rider Dashboard ──────────────────────────────────────────────────────────
// Demo mode uses localStorage + window storage events to propagate state
// between browser tabs.  Every comment marked [REALTIME] shows where
// Firebase / Supabase listeners should replace the localStorage calls.

// ─── Shared Storage Keys ──────────────────────────────────────────────────────
// These keys are shared with driver-dashboard.js so both pages see the same data.
const SHARED_PENDING_RIDES_KEY  = 'drive_shared_pending_rides';   // rider → driver
const SHARED_RIDE_STATUS_KEY    = 'drive_shared_ride_status';     // driver → rider

// ─── Constants ────────────────────────────────────────────────────────────────
const MAPBOX_TOKEN_META        = 'mapbox-token';
const STATUS_POLL_INTERVAL_MS  = 2000;   // fallback polling when storage event unreliable
const ALERT_DURATION_MS        = 4000;
const FARE_BASE                = 2.50;
const FARE_PER_KM              = 1.90;
const FARE_PER_MIN             = 0.25;

const DEMO_RIDER_PROFILE = {
  name: 'Demo Rider',
  email: 'rider@demo.drive',
  rating: 4.9
};

const RIDE_TYPES = [
  { id: 'economy',  label: 'Economy',  icon: 'bi-car-front',   surgeMultiplier: 1.0 },
  { id: 'comfort',  label: 'Comfort',  icon: 'bi-car-front-fill', surgeMultiplier: 1.3 },
  { id: 'xl',       label: 'XL',       icon: 'bi-truck',        surgeMultiplier: 1.6 },
  { id: 'luxury',   label: 'Luxury',   icon: 'bi-gem',          surgeMultiplier: 2.2 }
];

// ─── State ────────────────────────────────────────────────────────────────────
let currentUser     = null;
let accessToken     = null;
let riderMap        = null;
let mapboxToken     = null;
let currentRideId   = null;
let rideStatus      = null;   // searching | accepted | arriving | started | completed | canceled
let pickupCoords    = null;   // { lat, lng }
let destCoords      = null;   // { lat, lng }
let selectedRideType = 'economy';
let fareEstimate    = 0;
let statusPollTimer = null;
let pickupMarker    = null;
let destMarker      = null;
let driverMarker    = null;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function generateRideId() {
  return 'rider_ride_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
}

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getInitials(name) {
  return String(name || 'R')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(p => p[0]?.toUpperCase() || '')
    .join('');
}

// ─── Alert ────────────────────────────────────────────────────────────────────
function showAlert(type, message) {
  const container = document.getElementById('alert-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `alert-toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), ALERT_DURATION_MS);
}

// ─── localStorage helpers ─────────────────────────────────────────────────────
function safeJsonGet(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback; }
  catch { return fallback; }
}

function safeJsonSet(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); }
  catch { /* quota or private-mode: silently ignore */ }
}

// ─── Shared Ride Request Store ────────────────────────────────────────────────
// [REALTIME] Replace with: firebase.database().ref('pendingRides').push(request)
// or supabase.channel('ride-requests').send({ type: 'broadcast', event: 'new-ride', payload: request })
function publishRideRequest(request) {
  const existing = safeJsonGet(SHARED_PENDING_RIDES_KEY, []);
  const next = existing.filter(r => r.id !== request.id);
  next.unshift(request);
  safeJsonSet(SHARED_PENDING_RIDES_KEY, next.slice(0, 20));
  // Storage event fires in OTHER tabs; this tab needs a manual dispatch.
  // [REALTIME] Firebase/Supabase will replace this storage event approach.
  window.dispatchEvent(new StorageEvent('storage', {
    key: SHARED_PENDING_RIDES_KEY,
    newValue: JSON.stringify(next.slice(0, 20))
  }));
}

function removeRideRequest(rideId) {
  const existing = safeJsonGet(SHARED_PENDING_RIDES_KEY, []);
  safeJsonSet(SHARED_PENDING_RIDES_KEY, existing.filter(r => r.id !== rideId));
}

// ─── Shared Ride Status Store ─────────────────────────────────────────────────
// [REALTIME] Replace with: firebase.database().ref(`rideStatus/${rideId}`).on('value', ...)
// or supabase.channel('ride-status').on('broadcast', { event: 'status-update' }, handler)
function getRideStatusEntry(rideId) {
  const map = safeJsonGet(SHARED_RIDE_STATUS_KEY, {});
  return map[rideId] || null;
}

// ─── Fare Calculation ─────────────────────────────────────────────────────────
function estimateFare(pickupLat, pickupLng, destLat, destLng, rideTypeId) {
  const R = 6371;
  const toRad = d => d * Math.PI / 180;
  const dLat = toRad(destLat - pickupLat);
  const dLng = toRad(destLng - pickupLng);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(pickupLat)) * Math.cos(toRad(destLat)) * Math.sin(dLng / 2) ** 2;
  const km = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const mins = (km / 30) * 60;   // assume 30 km/h average
  const surge = RIDE_TYPES.find(t => t.id === rideTypeId)?.surgeMultiplier ?? 1;
  const raw = Math.max(FARE_BASE, FARE_BASE + km * FARE_PER_KM + mins * FARE_PER_MIN) * surge;
  return Math.round(raw * 100) / 100;
}

// ─── Map Initialisation ───────────────────────────────────────────────────────
function initMap() {
  const tokenMeta = document.querySelector(`meta[name="${MAPBOX_TOKEN_META}"]`);
  mapboxToken = tokenMeta?.content?.trim() || '';

  if (!mapboxToken || typeof mapboxgl === 'undefined') {
    document.getElementById('rider-map').style.background = '#0d1b2a';
    return;
  }

  mapboxgl.accessToken = mapboxToken;
  riderMap = new mapboxgl.Map({
    container: 'rider-map',
    style: 'mapbox://styles/mapbox/navigation-night-v1',
    center: [-122.4194, 37.7749],
    zoom: 13,
    attributionControl: false
  });

  riderMap.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');
  riderMap.on('load', () => {
    // Try to center on user location
    navigator.geolocation?.getCurrentPosition(pos => {
      const { latitude: lat, longitude: lng } = pos.coords;
      pickupCoords = { lat, lng };
      riderMap.flyTo({ center: [lng, lat], zoom: 14 });
      setPickupMarker(lng, lat);
      autoFillPickupAddress(lat, lng);
    }, () => {});
  });
}

function setPickupMarker(lng, lat) {
  if (!riderMap) return;
  pickupMarker?.remove();
  const el = document.createElement('div');
  el.style.cssText = 'width:14px;height:14px;border-radius:50%;background:#26d07c;border:3px solid #fff;box-shadow:0 0 0 3px rgba(38,208,124,.35)';
  pickupMarker = new mapboxgl.Marker({ element: el }).setLngLat([lng, lat]).addTo(riderMap);
}

function setDestMarker(lng, lat) {
  if (!riderMap) return;
  destMarker?.remove();
  const el = document.createElement('div');
  el.style.cssText = 'width:14px;height:14px;border-radius:50%;background:#ff6b6b;border:3px solid #fff;box-shadow:0 0 0 3px rgba(255,107,107,.35)';
  destMarker = new mapboxgl.Marker({ element: el }).setLngLat([lng, lat]).addTo(riderMap);
}

function setDriverMarker(lng, lat) {
  if (!riderMap) return;
  if (driverMarker) {
    driverMarker.setLngLat([lng, lat]);
  } else {
    const el = document.createElement('div');
    el.style.cssText = 'width:18px;height:18px;border-radius:50%;background:#1b80ff;border:3px solid #fff;box-shadow:0 0 0 3px rgba(27,128,255,.35)';
    driverMarker = new mapboxgl.Marker({ element: el }).setLngLat([lng, lat]).addTo(riderMap);
  }
}

async function autoFillPickupAddress(lat, lng) {
  if (!mapboxToken) return;
  try {
    const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxToken}&types=address,place&limit=1`);
    const data = await res.json();
    const place = data.features?.[0]?.place_name || '';
    const input = document.getElementById('pickup-input');
    if (input && !input.value) input.value = place;
  } catch { /* geocoding optional */ }
}

async function geocodeAddress(address) {
  if (!mapboxToken || !address.trim()) return null;
  try {
    const encoded = encodeURIComponent(address);
    const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json?access_token=${mapboxToken}&limit=1`);
    const data = await res.json();
    const feature = data.features?.[0];
    if (!feature) return null;
    return { lat: feature.center[1], lng: feature.center[0], label: feature.place_name };
  } catch { return null; }
}

// ─── Profile Rendering ────────────────────────────────────────────────────────
function renderProfile() {
  const user = currentUser || DEMO_RIDER_PROFILE;
  const name = user.name || user.email?.split('@')[0] || 'Rider';
  document.getElementById('rider-name').textContent = name;
  document.getElementById('rider-initials').textContent = getInitials(name);
}

// ─── Ride Type Rendering ──────────────────────────────────────────────────────
function renderRideTypes() {
  const container = document.getElementById('ride-type-row');
  container.innerHTML = RIDE_TYPES.map(t => `
    <button class="ride-type-btn${t.id === selectedRideType ? ' is-selected' : ''}"
            data-ride-type="${escapeHtml(t.id)}" type="button">
      <i class="bi ${escapeHtml(t.icon)}"></i>${escapeHtml(t.label)}
    </button>
  `).join('');

  container.querySelectorAll('.ride-type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedRideType = btn.dataset.rideType;
      container.querySelectorAll('.ride-type-btn').forEach(b => b.classList.toggle('is-selected', b === btn));
      updateFareEstimate();
    });
  });
}

// ─── Fare Estimate ────────────────────────────────────────────────────────────
function updateFareEstimate() {
  const fareEl = document.getElementById('fare-amount');
  const fareDetailEl = document.getElementById('fare-detail');
  if (pickupCoords && destCoords) {
    fareEstimate = estimateFare(pickupCoords.lat, pickupCoords.lng, destCoords.lat, destCoords.lng, selectedRideType);
    if (fareEl) fareEl.textContent = `$${fareEstimate.toFixed(2)}`;
    if (fareDetailEl) fareDetailEl.textContent = 'Estimated fare';
  } else {
    if (fareEl) fareEl.textContent = '$—';
    if (fareDetailEl) fareDetailEl.textContent = 'Enter both locations for estimate';
  }
}

// ─── Request Ride Flow ────────────────────────────────────────────────────────
async function handleRequestRide() {
  const pickupInput = document.getElementById('pickup-input').value.trim();
  const destInput   = document.getElementById('dest-input').value.trim();

  if (!pickupInput) { showAlert('warning', 'Please enter a pickup location.'); return; }
  if (!destInput)   { showAlert('warning', 'Please enter a destination.'); return; }

  // Geocode addresses if we don't have coords yet
  if (!pickupCoords) {
    showAlert('info', 'Locating pickup…');
    pickupCoords = await geocodeAddress(pickupInput);
    if (!pickupCoords) { showAlert('danger', 'Could not locate pickup address.'); return; }
    setPickupMarker(pickupCoords.lng, pickupCoords.lat);
  }

  if (!destCoords) {
    showAlert('info', 'Locating destination…');
    destCoords = await geocodeAddress(destInput);
    if (!destCoords) { showAlert('danger', 'Could not locate destination address.'); return; }
    setDestMarker(destCoords.lng, destCoords.lat);
  }

  updateFareEstimate();

  const user = currentUser || DEMO_RIDER_PROFILE;
  const rideRequest = {
    id:           generateRideId(),
    riderId:      user.id || user.email || 'demo-rider',
    riderName:    user.name || user.email?.split('@')[0] || 'Rider',
    pickup:       pickupInput,
    pickupLat:    pickupCoords.lat,
    pickupLng:    pickupCoords.lng,
    destination:  destInput,
    destLat:      destCoords.lat,
    destLng:      destCoords.lng,
    rideType:     selectedRideType,
    fareEstimate: fareEstimate,
    // Driver-dashboard normalizeRide() reads these field names:
    passengerName: user.name || user.email?.split('@')[0] || 'Rider',
    status:       'requested',
    requestedAt:  new Date().toISOString()
  };

  currentRideId = rideRequest.id;
  rideStatus    = 'searching';

  // [REALTIME] Replace publishRideRequest() with Firebase push or Supabase broadcast.
  publishRideRequest(rideRequest);

  // Fit map to both points
  if (riderMap && pickupCoords && destCoords) {
    const bounds = new mapboxgl.LngLatBounds();
    bounds.extend([pickupCoords.lng, pickupCoords.lat]);
    bounds.extend([destCoords.lng, destCoords.lat]);
    riderMap.fitBounds(bounds, { padding: 60 });
  }

  showRideStatusPanel('searching');
  startStatusPolling();
  showAlert('success', 'Ride requested! Searching for a driver…');
}

// ─── Cancel Ride ──────────────────────────────────────────────────────────────
function handleCancelRide() {
  if (!currentRideId) return;
  removeRideRequest(currentRideId);
  currentRideId = null;
  rideStatus    = null;
  stopStatusPolling();
  showRequestPanel();
  pickupMarker?.remove(); pickupMarker = null;
  destMarker?.remove();   destMarker   = null;
  driverMarker?.remove(); driverMarker = null;
  showAlert('info', 'Ride cancelled.');
}

// ─── Demo Ride Button ─────────────────────────────────────────────────────────
function handleDemoRide() {
  // Pre-fill demo coordinates (San Francisco downtown)
  document.getElementById('pickup-input').value = '1 Market St, San Francisco, CA';
  document.getElementById('dest-input').value   = 'Golden Gate Park, San Francisco, CA';
  pickupCoords = { lat: 37.7937, lng: -122.3947 };
  destCoords   = { lat: 37.7694, lng: -122.4862 };
  setPickupMarker(pickupCoords.lng, pickupCoords.lat);
  setDestMarker(destCoords.lng, destCoords.lat);
  updateFareEstimate();
  showAlert('info', 'Demo locations set. Click "Request Ride" to continue.');
}

// ─── Status Polling ───────────────────────────────────────────────────────────
// [REALTIME] Replace polling loop with:
//   firebase.database().ref(`rideStatus/${currentRideId}`).on('value', handleStatusUpdate)
// or:
//   supabase.channel('ride-status').on('broadcast', { event: 'status-update' }, handleStatusUpdate)
function startStatusPolling() {
  stopStatusPolling();
  statusPollTimer = setInterval(() => {
    if (!currentRideId) { stopStatusPolling(); return; }
    const entry = getRideStatusEntry(currentRideId);
    if (entry) applyDriverStatusUpdate(entry);
  }, STATUS_POLL_INTERVAL_MS);
}

function stopStatusPolling() {
  if (statusPollTimer !== null) {
    clearInterval(statusPollTimer);
    statusPollTimer = null;
  }
}

// ─── Incoming Driver Status ───────────────────────────────────────────────────
function applyDriverStatusUpdate(entry) {
  if (!entry || entry.rideId !== currentRideId) return;

  const prev = rideStatus;

  if (entry.status === 'accepted' && prev !== 'accepted' && prev !== 'arriving' && prev !== 'started' && prev !== 'completed') {
    rideStatus = 'accepted';
    showRideStatusPanel('assigned', entry);
    showAlert('success', `Driver assigned: ${entry.driverName || 'Your driver'} is on the way!`);
    if (entry.driverLat && entry.driverLng) setDriverMarker(entry.driverLng, entry.driverLat);
  } else if (entry.status === 'arrived_at_pickup' && prev !== 'arriving' && prev !== 'started' && prev !== 'completed') {
    rideStatus = 'arriving';
    showRideStatusPanel('arriving', entry);
    showAlert('info', 'Your driver has arrived at the pickup point!');
  } else if (entry.status === 'started' && prev !== 'started' && prev !== 'completed') {
    rideStatus = 'started';
    showRideStatusPanel('started', entry);
    showAlert('success', 'Trip started! Enjoy your ride.');
  } else if (entry.status === 'completed' && prev !== 'completed') {
    rideStatus = 'completed';
    showRideStatusPanel('completed', entry);
    showAlert('success', `Trip complete! Fare: $${Number(entry.fare || fareEstimate).toFixed(2)}`);
    stopStatusPolling();
    currentRideId = null;
  } else if (entry.status === 'rejected' || entry.status === 'declined') {
    // Driver rejected → keep rider in searching state (re-publish request)
    showAlert('warning', 'Driver unavailable, still searching…');
    // The current request stays in SHARED_PENDING_RIDES_KEY so other drivers can see it.
    // No status change needed; rider continues waiting.
  }
}

// ─── Panel Show/Hide ──────────────────────────────────────────────────────────
function showRequestPanel() {
  document.getElementById('request-panel').style.display  = '';
  document.getElementById('status-panel').classList.remove('is-visible');
  document.getElementById('driver-card').classList.remove('is-visible');
}

function showRideStatusPanel(phase, driverInfo = null) {
  document.getElementById('request-panel').style.display = 'none';
  document.getElementById('status-panel').classList.add('is-visible');

  // Status badge
  const badge = document.getElementById('ride-status-badge');
  const labels = {
    searching: 'Searching for driver',
    assigned:  'Driver assigned',
    arriving:  'Driver arriving',
    started:   'Ride started',
    completed: 'Ride completed'
  };
  const classes = {
    searching: 'searching',
    assigned:  'assigned',
    arriving:  'arriving',
    started:   'started',
    completed: 'completed'
  };
  badge.className = `status-badge ${classes[phase] || 'searching'}`;
  badge.innerHTML = `<span class="pulse-ring" style="${phase === 'searching' ? '' : 'display:none'}"></span> ${escapeHtml(labels[phase] || phase)}`;

  // Driver card
  if (driverInfo && phase !== 'searching') {
    const card = document.getElementById('driver-card');
    card.classList.add('is-visible');
    document.getElementById('driver-initials').textContent = getInitials(driverInfo.driverName || 'D');
    document.getElementById('driver-name-text').textContent = driverInfo.driverName || 'Your Driver';
    document.getElementById('driver-rating-text').textContent = `★ ${Number(driverInfo.driverRating || 4.8).toFixed(1)}`;
    document.getElementById('driver-vehicle-text').textContent = driverInfo.vehicleInfo || 'Sedan';
    document.getElementById('driver-eta-value').textContent = driverInfo.eta ? `${driverInfo.eta} min` : '—';
    document.getElementById('driver-distance-value').textContent = driverInfo.distanceKm ? `${Number(driverInfo.distanceKm).toFixed(1)} km` : '—';
  }

  // Timeline steps
  const steps = ['searching', 'assigned', 'arriving', 'started', 'completed'];
  const currentIndex = steps.indexOf(phase);
  steps.forEach((step, i) => {
    const el = document.getElementById(`step-${step}`);
    if (!el) return;
    el.classList.toggle('is-done',   i < currentIndex);
    el.classList.toggle('is-active', i === currentIndex);
  });
}

// ─── storage Event Listener ───────────────────────────────────────────────────
// [REALTIME] Remove this entire listener and replace with Firebase/Supabase subscriptions.
function handleStorageEvent(event) {
  if (event.key !== SHARED_RIDE_STATUS_KEY) return;
  if (!currentRideId) return;
  const map = safeJsonGet(SHARED_RIDE_STATUS_KEY, {});
  const entry = map[currentRideId];
  if (entry) applyDriverStatusUpdate(entry);
}

// ─── Destination input → geocode + update fare ────────────────────────────────
async function handleDestBlur() {
  const input = document.getElementById('dest-input');
  const addr  = input?.value?.trim();
  if (!addr) return;
  const coords = await geocodeAddress(addr);
  if (coords) {
    destCoords = coords;
    setDestMarker(coords.lng, coords.lat);
    updateFareEstimate();
    if (riderMap) riderMap.flyTo({ center: [coords.lng, coords.lat], zoom: 13 });
  }
}

async function handlePickupBlur() {
  const input = document.getElementById('pickup-input');
  const addr  = input?.value?.trim();
  if (!addr) return;
  const coords = await geocodeAddress(addr);
  if (coords) {
    pickupCoords = coords;
    setPickupMarker(coords.lng, coords.lat);
    updateFareEstimate();
  }
}

// ─── Current Location Button ──────────────────────────────────────────────────
function handleUseCurrentLocation() {
  if (!navigator.geolocation) {
    showAlert('warning', 'Geolocation not supported by this browser.');
    return;
  }
  navigator.geolocation.getCurrentPosition(
    async pos => {
      const { latitude: lat, longitude: lng } = pos.coords;
      pickupCoords = { lat, lng };
      setPickupMarker(lng, lat);
      if (riderMap) riderMap.flyTo({ center: [lng, lat], zoom: 15 });
      await autoFillPickupAddress(lat, lng);
      updateFareEstimate();
    },
    () => showAlert('warning', 'Could not get your current location.')
  );
}

// ─── Initialise ───────────────────────────────────────────────────────────────
function init() {
  // Auth session (optional – works in demo mode without login)
  accessToken = localStorage.getItem('accessToken');
  try { currentUser = JSON.parse(localStorage.getItem('user') || 'null'); } catch { currentUser = null; }

  renderProfile();
  renderRideTypes();
  updateFareEstimate();
  initMap();

  // [REALTIME] Replace storage listener with Firebase/Supabase subscription.
  window.addEventListener('storage', handleStorageEvent);

  // Buttons
  document.getElementById('btn-request-ride')?.addEventListener('click', () => {
    handleRequestRide().catch(() => {});
  });
  document.getElementById('btn-cancel-ride')?.addEventListener('click', handleCancelRide);
  document.getElementById('btn-demo-ride')?.addEventListener('click', handleDemoRide);
  document.getElementById('btn-use-location')?.addEventListener('click', handleUseCurrentLocation);
  document.getElementById('dest-input')?.addEventListener('blur', () => handleDestBlur().catch(() => {}));
  document.getElementById('pickup-input')?.addEventListener('blur', () => handlePickupBlur().catch(() => {}));

  // Kick off polling in case storage events aren't firing (same-tab scenario)
  // [REALTIME] Remove this polling once Firebase/Supabase realtime is active.
}

document.addEventListener('DOMContentLoaded', init);
