(() => {
  const userRaw = localStorage.getItem('user');
  if (!userRaw) {
    return;
  }

  try {
    const user = JSON.parse(userRaw);
    if (user?.role === 'driver' && window.location.pathname !== '/driver-dashboard.html') {
      window.location.replace('/driver-dashboard.html');
    }
  } catch (_error) {
    // Let existing dashboard auth/session handling continue.
  }
})();
