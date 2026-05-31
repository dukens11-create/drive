const DRIVER_SETTINGS_KEY = 'driverSettingsProfile';

function readSettings() {
  try {
    const parsed = JSON.parse(localStorage.getItem(DRIVER_SETTINGS_KEY) || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (_error) {
    return {};
  }
}

function showSettingsAlert(kind, message) {
  const alert = document.getElementById('settings-alert');
  alert.className = `alert alert-${kind}`;
  alert.classList.remove('d-none');
  alert.textContent = message;
}

function populateForm(data) {
  document.getElementById('settings-full-name').value = data.fullName || '';
  document.getElementById('settings-phone').value = data.phone || '';
  document.getElementById('settings-bank-name').value = data.bankName || '';
  document.getElementById('settings-account-last4').value = data.accountLast4 || '';
  document.getElementById('settings-vehicle-make').value = data.vehicleMake || '';
  document.getElementById('settings-vehicle-model').value = data.vehicleModel || '';
  document.getElementById('settings-vehicle-plate').value = data.vehiclePlate || '';
  document.getElementById('settings-emergency-name').value = data.emergencyName || '';
  document.getElementById('settings-emergency-phone').value = data.emergencyPhone || '';
}

function getFormPayload() {
  return {
    fullName: document.getElementById('settings-full-name').value.trim(),
    phone: document.getElementById('settings-phone').value.trim(),
    bankName: document.getElementById('settings-bank-name').value.trim(),
    accountLast4: document.getElementById('settings-account-last4').value.trim(),
    vehicleMake: document.getElementById('settings-vehicle-make').value.trim(),
    vehicleModel: document.getElementById('settings-vehicle-model').value.trim(),
    vehiclePlate: document.getElementById('settings-vehicle-plate').value.trim(),
    emergencyName: document.getElementById('settings-emergency-name').value.trim(),
    emergencyPhone: document.getElementById('settings-emergency-phone').value.trim()
  };
}

window.addEventListener('load', () => {
  const userStr = localStorage.getItem('user');
  const token = localStorage.getItem('accessToken');
  if (!userStr || !token) {
    window.location.replace('/index.html');
    return;
  }

  try {
    const user = JSON.parse(userStr);
    if (user.role !== 'driver') {
      window.location.replace('/dashboard.html');
      return;
    }
  } catch (_error) {
    window.location.replace('/index.html');
    return;
  }

  populateForm(readSettings());

  document.getElementById('driver-settings-form').addEventListener('submit', event => {
    event.preventDefault();
    const payload = getFormPayload();
    if (!/^\d{4}$/.test(payload.accountLast4)) {
      showSettingsAlert('warning', 'Account Last 4 must be exactly 4 digits.');
      return;
    }
    localStorage.setItem(DRIVER_SETTINGS_KEY, JSON.stringify(payload));
    showSettingsAlert('success', 'Settings saved.');
  });
});
