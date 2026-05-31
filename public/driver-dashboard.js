const API_BASE_URL = '';
const REJECTED_RIDES_KEY = 'driverRejectedRideIds';

let currentUser = null;
let accessToken = null;

function showAlert(kind, message) {
  const alertDiv = document.getElementById('driver-alert');
  alertDiv.className = `alert alert-${kind}`;
  alertDiv.classList.remove('d-none');
  alertDiv.textContent = message;
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

async function loadDriverProfile() {
  const profileDiv = document.getElementById('profile-info');
  try {
    const { data } = await fetchJson(`${API_BASE_URL}/api/drivers/me`, {
      headers: { Authorization: 'Bearer ' + accessToken }
    });
    if (!data?.ok) {
      profileDiv.innerHTML = '<div class="text-danger">Unable to load driver profile.</div>';
      return;
    }
    const profile = data.profile || {};
    profileDiv.innerHTML = `
      <div><strong>User ID:</strong> ${profile.userId || currentUser.id || 'N/A'}</div>
      <div><strong>Email:</strong> ${currentUser.email || 'N/A'}</div>
      <div><strong>Role:</strong> ${String(currentUser.role || 'driver').toUpperCase()}</div>
      <div><strong>Availability:</strong> ${profile.availabilityStatus || 'offline'}</div>
      <div><strong>Rating:</strong> ${profile.rating ?? 'N/A'}</div>
    `;
  } catch (_error) {
    profileDiv.innerHTML = '<div class="text-danger">Unable to load driver profile.</div>';
  }
}

async function loadAvailableRideRequests() {
  const listDiv = document.getElementById('available-rides');
  try {
    const { data } = await fetchJson(`${API_BASE_URL}/api/rides/history`, {
      headers: { Authorization: 'Bearer ' + accessToken }
    });
    if (!data?.ok || !Array.isArray(data.rides)) {
      listDiv.innerHTML = '<div class="text-danger">Unable to load ride requests.</div>';
      return;
    }
    const rejected = new Set(getRejectedRideIds());
    const rides = data.rides
      .filter(ride => ['accepted', 'started', 'requested'].includes(ride.status))
      .filter(ride => !rejected.has(ride.id));
    if (!rides.length) {
      listDiv.innerHTML = '<div class="text-muted">No available ride requests right now.</div>';
      return;
    }
    listDiv.innerHTML = rides.map(ride => `
      <div class="ride-item">
        <div><strong>${ride.id}</strong> <span class="badge bg-info text-dark">${ride.status}</span></div>
        <div>Distance: ${Number(ride.miles || 0).toFixed(1)} mi</div>
        <div>Fare: $${Number(ride.fareEstimate || 0).toFixed(2)}</div>
      </div>
    `).join('');
  } catch (_error) {
    listDiv.innerHTML = '<div class="text-danger">Unable to load ride requests.</div>';
  }
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
    await Promise.all([loadAvailableRideRequests(), loadEarnings()]);
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
  loadAvailableRideRequests().catch(() => showAlert('danger', 'Unable to refresh ride requests.'));
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

function handleLogout() {
  ['accessToken', 'refreshToken', 'user', 'drive.accessToken', 'drive.refreshToken', 'drive.user'].forEach(function(key) {
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
  document.getElementById('driver-role').textContent = `Role: ${String(currentUser.role || 'driver').toUpperCase()}`;
  await Promise.all([loadDriverProfile(), loadAvailableRideRequests(), loadEarnings()]);
});
