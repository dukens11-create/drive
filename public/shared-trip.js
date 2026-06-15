// shared-trip.js — Public shared trip view page
// Displays live trip progress for a shareable trip link.

const SHARED_TRIP_POLL_INTERVAL_MS = 10000;

let sharedRideId = null;
let sharedToken = null;
let pollIntervalId = null;

function parseJson(value, fallback) {
  try {
    return JSON.parse(value);
  } catch (_error) {
    return fallback;
  }
}

function getQueryParam(name) {
  const url = new URL(window.location.href);
  return url.searchParams.get(name) || '';
}

function formatMinutes(value) {
  const m = Math.max(0, Math.round(Number(value || 0)));
  if (m < 1) return 'Arriving now';
  return `${m} min`;
}

function formatStatus(status) {
  const map = {
    requested: 'Searching for driver',
    accepted: 'Driver on the way',
    arrived_at_pickup: 'Driver has arrived',
    started: 'Trip in progress',
    completed: 'Trip completed',
    canceled: 'Trip canceled'
  };
  return map[status] || status || 'Unknown';
}

function showLoading() {
  document.getElementById('shared-loading')?.classList.remove('d-none');
  document.getElementById('shared-error')?.classList.add('d-none');
  const content = document.getElementById('shared-content');
  if (content) content.classList.add('d-none');
}

function showError(detail) {
  document.getElementById('shared-loading')?.classList.add('d-none');
  document.getElementById('shared-error')?.classList.remove('d-none');
  const content = document.getElementById('shared-content');
  if (content) content.classList.add('d-none');
  const detailNode = document.getElementById('shared-error-detail');
  if (detailNode && detail) detailNode.textContent = detail;
}

function showContent() {
  document.getElementById('shared-loading')?.classList.add('d-none');
  document.getElementById('shared-error')?.classList.add('d-none');
  const content = document.getElementById('shared-content');
  if (content) {
    content.classList.remove('d-none');
    content.style.removeProperty('display');
  }
}

function renderTrip(ride) {
  if (!ride) return;

  const status = ride.status || 'requested';
  const statusPill = document.getElementById('shared-status-pill');
  if (statusPill) {
    statusPill.textContent = formatStatus(status);
    statusPill.className = `shared-status-pill status-${status}`;
  }

  const eta = ride.etaMinutes || ride.minutes || 0;
  const etaNode = document.getElementById('shared-eta');
  if (etaNode) {
    if (status === 'completed') {
      etaNode.textContent = 'Arrived';
    } else if (status === 'canceled') {
      etaNode.textContent = '—';
    } else {
      etaNode.textContent = formatMinutes(eta);
    }
  }

  const pickupNode = document.getElementById('shared-pickup-text');
  const destNode = document.getElementById('shared-destination-text');
  if (pickupNode) pickupNode.textContent = ride.pickupLabel || ride.pickupAddress || '--';
  if (destNode) destNode.textContent = ride.destinationLabel || ride.dropoffAddress || '--';

  const driver = ride.driver || {};
  const driverName = ride.driverName || driver.name || '--';
  const driverRating = Number(driver.rating || ride.driverRating || 0);
  const vehicle = driver.vehicle || {};
  const vehicleLabel = vehicle.label || vehicle.make && vehicle.model
    ? `${vehicle.make || ''} ${vehicle.model || ''}`.trim()
    : ride.vehicleLabel || '';
  const plateNumber = vehicle.plateNumber || vehicle.licensePlate || ride.plateNumber || '';

  const nameNode = document.getElementById('shared-driver-name');
  const vehicleNode = document.getElementById('shared-driver-vehicle');
  const ratingNode = document.getElementById('shared-driver-rating');
  const initialNode = document.getElementById('shared-driver-initial');

  if (nameNode) nameNode.textContent = driverName;
  if (vehicleNode) vehicleNode.textContent = vehicleLabel ? (plateNumber ? `${vehicleLabel} · ${plateNumber}` : vehicleLabel) : '--';
  if (ratingNode) ratingNode.textContent = driverRating ? `⭐ ${driverRating.toFixed(2)} rating` : '--';
  if (initialNode) initialNode.textContent = driverName !== '--' ? driverName.charAt(0).toUpperCase() : '?';

  // Stop polling if trip completed or canceled
  if (['completed', 'canceled'].includes(status) && pollIntervalId) {
    window.clearInterval(pollIntervalId);
    pollIntervalId = null;
  }
}

async function loadTripFromBackend() {
  try {
    const res = await fetch(`/api/rides/${encodeURIComponent(sharedRideId)}/share?token=${encodeURIComponent(sharedToken)}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data?.ride || data || null;
  } catch (_error) {
    return null;
  }
}

async function loadAndRenderTrip() {
  const ride = await loadTripFromBackend();
  if (!ride) {
    return false;
  }
  renderTrip(ride);
  return true;
}

async function initialize() {
  sharedRideId = getQueryParam('rideId');
  sharedToken = getQueryParam('token');

  if (!sharedRideId) {
    showError('No ride ID was provided in the link.');
    return;
  }

  showLoading();

  const found = await loadAndRenderTrip();
  if (!found) {
    showError('This trip link may have expired or is no longer valid.');
    return;
  }

  showContent();

  // Poll for live updates
  pollIntervalId = window.setInterval(async () => {
    const updated = await loadAndRenderTrip();
    if (!updated) {
      window.clearInterval(pollIntervalId);
      pollIntervalId = null;
    }
  }, SHARED_TRIP_POLL_INTERVAL_MS);
}

window.addEventListener('load', () => {
  initialize().catch(() => {
    showError('Unable to load trip details.');
  });
});

window.addEventListener('beforeunload', () => {
  if (pollIntervalId) window.clearInterval(pollIntervalId);
});
