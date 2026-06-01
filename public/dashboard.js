(() => {
  const userRaw = localStorage.getItem('user');
  if (!userRaw) {
    return;
  }

  try {
    const user = JSON.parse(userRaw);
    const role = String(user?.role || '').toLowerCase();
    if (role === 'driver' && window.location.pathname !== '/driver-dashboard.html') {
      window.location.replace('/driver-dashboard.html');
      return;
    }

    if (role === 'rider' && window.location.pathname === '/driver-dashboard.html') {
      window.location.replace('/rider-dashboard.html');
    }
  } catch (_error) {
    // Let existing dashboard auth/session handling continue.
  }
})();
