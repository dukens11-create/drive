const STORAGE_KEYS = {
  accessToken: 'accessToken',
  refreshToken: 'refreshToken',
  user: 'user',
  legacyAccessToken: 'drive.accessToken',
  legacyRefreshToken: 'drive.refreshToken',
  legacyUser: 'drive.user'
};
const REDIRECT_DELAY_MS = 250;
const DRIVER_ROLE = 'driver';

function showMessage(kind, text) {
  const error = document.getElementById('auth-error');
  const success = document.getElementById('auth-success');
  error.classList.add('d-none');
  success.classList.add('d-none');
  if (!text) return;
  const target = kind === 'error' ? error : success;
  target.textContent = text;
  target.classList.remove('d-none');
}

function clearMessages() {
  showMessage('success', '');
}

function toggleLoading(button, isLoading) {
  button.disabled = isLoading;
  button.querySelector('.btn-text').classList.toggle('d-none', isLoading);
  button.querySelector('.spinner-border').classList.toggle('d-none', !isLoading);
}

function clearPersistedSession() {
  Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
}

function persistSession(payload) {
  const user = JSON.stringify(payload.user || {});
  localStorage.setItem(STORAGE_KEYS.accessToken, payload.accessToken || '');
  localStorage.setItem(STORAGE_KEYS.refreshToken, payload.refreshToken || '');
  localStorage.setItem(STORAGE_KEYS.user, user);
  localStorage.setItem(STORAGE_KEYS.legacyAccessToken, payload.accessToken || '');
  localStorage.setItem(STORAGE_KEYS.legacyRefreshToken, payload.refreshToken || '');
  localStorage.setItem(STORAGE_KEYS.legacyUser, user);
}

function validatePassword(password) {
  return (
    password.length >= 12 &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
}

function normalizeRole(role) {
  return String(role || '').toLowerCase();
}

function getRedirectPath(role) {
  return normalizeRole(role) === DRIVER_ROLE ? '/driver-dashboard.html' : '/rider-dashboard.html';
}

async function submitAuth(path, body, button) {
  toggleLoading(button, true);
  try {
    const response = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const payload = await response.json();
    if (!response.ok || payload.error) {
      throw new Error(payload.error || 'Authentication failed');
    }

    if (path.endsWith('/login') && normalizeRole(payload.user?.role) !== DRIVER_ROLE) {
      throw new Error('Please sign in with a driver account');
    }

    persistSession(payload);
    showMessage('success', 'Authentication successful. Redirecting...');
    setTimeout(() => {
      window.location.href = getRedirectPath(payload.user?.role || DRIVER_ROLE);
    }, REDIRECT_DELAY_MS);
  } catch (error) {
    showMessage('error', error.message || 'Authentication failed');
  } finally {
    toggleLoading(button, false);
  }
}


function setupPasswordToggles() {
  document.querySelectorAll('.password-toggle').forEach(toggle => {
    const targetId = toggle.getAttribute('data-target');
    const passwordInput = document.getElementById(targetId);
    if (!passwordInput) return;

    const syncToggleState = isVisible => {
      toggle.classList.toggle('is-visible', isVisible);
      toggle.setAttribute('aria-label', isVisible ? 'Hide password' : 'Show password');
      toggle.setAttribute('aria-pressed', String(isVisible));
    };

    syncToggleState(passwordInput.type === 'text');

    toggle.addEventListener('click', () => {
      const isVisible = passwordInput.type === 'password';
      passwordInput.type = isVisible ? 'text' : 'password';
      syncToggleState(isVisible);
      passwordInput.focus();
    });
  });
}

function switchForm(formName) {
  const loginForm = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');
  document.querySelectorAll('#auth-tabs .nav-link').forEach(tab => {
    tab.classList.toggle('active', tab.getAttribute('data-form') === formName);
  });
  loginForm.classList.toggle('d-none', formName !== 'login');
  signupForm.classList.toggle('d-none', formName !== 'signup');
  clearMessages();
}

document.addEventListener('DOMContentLoaded', () => {
  const currentAccessToken = localStorage.getItem(STORAGE_KEYS.accessToken);
  const currentRefreshToken = localStorage.getItem(STORAGE_KEYS.refreshToken);
  const currentUser = localStorage.getItem(STORAGE_KEYS.user);
  const legacyAccessToken = localStorage.getItem(STORAGE_KEYS.legacyAccessToken);
  const legacyRefreshToken = localStorage.getItem(STORAGE_KEYS.legacyRefreshToken);
  const legacyUser = localStorage.getItem(STORAGE_KEYS.legacyUser);
  const accessToken = currentAccessToken || legacyAccessToken;
  const refreshToken = currentRefreshToken || legacyRefreshToken;
  const user = currentUser || legacyUser;

  if (accessToken && refreshToken) {
    if (!currentAccessToken && legacyAccessToken) {
      localStorage.setItem(STORAGE_KEYS.accessToken, legacyAccessToken);
    }
    if (!currentRefreshToken && legacyRefreshToken) {
      localStorage.setItem(STORAGE_KEYS.refreshToken, legacyRefreshToken);
    }
    if (!currentUser && legacyUser) {
      localStorage.setItem(STORAGE_KEYS.user, legacyUser);
    }

    let role = DRIVER_ROLE;
    try {
      role = JSON.parse(user || '{}').role || DRIVER_ROLE;
    } catch {
      role = DRIVER_ROLE;
    }

    window.location.href = getRedirectPath(role);
    return;
  }

  if (accessToken || refreshToken || user) {
    clearPersistedSession();
  }

  const loginForm = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');
  const loginButton = document.getElementById('login-btn');
  const signupButton = document.getElementById('signup-btn');

  document.querySelectorAll('#auth-tabs .nav-link').forEach(tab => {
    tab.addEventListener('click', () => {
      switchForm(tab.getAttribute('data-form'));
    });
  });

  setupPasswordToggles();

  loginForm.addEventListener('submit', async event => {
    event.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    if (!email || !password) {
      showMessage('error', 'Email and password are required');
      return;
    }
    await submitAuth('/api/auth/login', { email, password }, loginButton);
  });

  signupForm.addEventListener('submit', async event => {
    event.preventDefault();
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;
    if (!email || !password) {
      showMessage('error', 'Email and password are required');
      return;
    }
    if (!validatePassword(password)) {
      showMessage('error', 'Password must be 12+ characters and include uppercase, lowercase, number, and symbol');
      return;
    }
    await submitAuth('/api/auth/signup', { email, password, role: DRIVER_ROLE }, signupButton);
  });
});
