const API_BASE_URL = '';

const state = {
  category: 'all',
  search: '',
  restaurants: [],
  selectedRestaurant: null,
  menu: [],
  cart: [],
  activeOrder: null,
  trackingTimer: null,
  location: null
};

const AUTH_TOKEN_KEYS = ['accessToken', 'drive.accessToken', 'authToken', 'token', 'drive_token'];
const AUTH_USER_KEYS = ['user', 'drive.user', 'drive_user'];

function moneyCents(value) {
  return '$' + (Number(value || 0) / 100).toFixed(2);
}

function getFirstStored(keys) {
  for (const key of keys) {
    const value = String(localStorage.getItem(key) || '').trim();
    if (value) return value;
  }
  return '';
}

function getSession() {
  const token = getFirstStored(AUTH_TOKEN_KEYS);
  const rawUser = getFirstStored(AUTH_USER_KEYS);
  let user = null;
  try {
    user = rawUser ? JSON.parse(rawUser) : null;
  } catch (_error) {
    user = null;
  }
  return { token, user };
}

function showToast(message) {
  const toast = document.getElementById('eat-toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  window.setTimeout(() => toast.classList.remove('show'), 2200);
}

async function fetchJson(url, options = {}, requireRider = false) {
  const session = getSession();
  const headers = new Headers(options.headers || {});
  if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (session.token) headers.set('Authorization', 'Bearer ' + session.token);

  if (requireRider && (!session.token || String(session.user?.role || '').toLowerCase() !== 'rider')) {
    throw new Error('Please sign in as a rider to place and manage food orders.');
  }

  const response = await fetch(API_BASE_URL + url, { ...options, headers });
  let data = null;
  try {
    data = await response.json();
  } catch (_error) {
    data = null;
  }

  if (!response.ok) {
    const error = new Error(data?.error || data?.message || 'Request failed');
    error.status = response.status;
    throw error;
  }

  return data;
}

function restaurantSearchText(restaurant) {
  return [
    restaurant.name,
    restaurant.cuisine,
    restaurant.city,
    restaurant.description
  ].filter(Boolean).join(' ').toLowerCase();
}

function categoryOf(restaurant) {
  const cuisine = String(restaurant.cuisine || '').trim().toLowerCase();
  if (!cuisine) return 'all';
  if (cuisine.includes('pizza')) return 'pizza';
  if (cuisine.includes('hait')) return 'haitian';
  if (cuisine.includes('chinese') || cuisine.includes('asian')) return 'chinese';
  if (cuisine.includes('chicken')) return 'chicken';
  if (cuisine.includes('grocery') || cuisine.includes('market')) return 'grocery';
  if (cuisine.includes('burger') || cuisine.includes('fast')) return 'fast-food';
  return cuisine.replace(/\s+/g, '-');
}

function getDeliveryFeeCents(restaurant) {
  const configured = restaurant?.settings?.deliveryFee;
  const direct = Number(configured?.feeCents ?? configured?.amountCents ?? configured?.cents);
  if (Number.isFinite(direct) && direct >= 0) return Math.round(direct);

  const zoneFee = Number(restaurant?.deliveryZones?.[0]?.feeCents);
  return Number.isFinite(zoneFee) && zoneFee >= 0 ? Math.round(zoneFee) : 0;
}

function getTaxRatePercent(restaurant) {
  const configured = restaurant?.settings?.taxes;
  const value = Number(configured?.ratePercent ?? configured?.percent ?? configured?.rate ?? 0);
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

function cartSubtotalCents() {
  return state.cart.reduce((sum, item) => sum + Number(item.priceCents || 0) * Number(item.quantity || 1), 0);
}

function cartQuote() {
  const subtotalCents = cartSubtotalCents();
  const deliveryFeeCents = state.cart.length ? getDeliveryFeeCents(state.selectedRestaurant) : 0;
  const taxRatePercent = getTaxRatePercent(state.selectedRestaurant);
  const taxCents = Math.round(subtotalCents * taxRatePercent / 100);
  return {
    subtotalCents,
    deliveryFeeCents,
    taxCents,
    totalCents: subtotalCents + deliveryFeeCents + taxCents
  };
}

function renderCart() {
  const itemsNode = document.getElementById('cart-items');
  const emptyNode = document.getElementById('cart-empty');
  if (!itemsNode || !emptyNode) return;

  itemsNode.innerHTML = '';

  state.cart.forEach(item => {
    const row = document.createElement('div');
    row.className = 'cart-item';

    const left = document.createElement('div');
    const name = document.createElement('div');
    name.className = 'cart-item-name';
    name.textContent = item.name;

    const controls = document.createElement('div');
    controls.className = 'cart-quantity';

    const minus = document.createElement('button');
    minus.type = 'button';
    minus.textContent = '−';
    minus.setAttribute('aria-label', 'Decrease quantity');
    minus.addEventListener('click', () => changeQuantity(item.itemId, -1));

    const count = document.createElement('span');
    count.textContent = String(item.quantity);

    const plus = document.createElement('button');
    plus.type = 'button';
    plus.textContent = '+';
    plus.setAttribute('aria-label', 'Increase quantity');
    plus.addEventListener('click', () => changeQuantity(item.itemId, 1));

    controls.append(minus, count, plus);
    left.append(name, controls);

    const price = document.createElement('div');
    price.className = 'cart-item-price';
    price.textContent = moneyCents(item.priceCents * item.quantity);

    row.append(left, price);
    itemsNode.appendChild(row);
  });

  const quote = cartQuote();
  emptyNode.classList.toggle('hidden', state.cart.length > 0);
  document.getElementById('cart-count').textContent = String(state.cart.reduce((sum, item) => sum + item.quantity, 0));
  document.getElementById('cart-subtotal').textContent = moneyCents(quote.subtotalCents);
  document.getElementById('cart-delivery').textContent = moneyCents(quote.deliveryFeeCents);
  document.getElementById('cart-tax').textContent = moneyCents(quote.taxCents);
  document.getElementById('cart-total').textContent = moneyCents(quote.totalCents);

  const checkout = document.getElementById('checkout-button');
  if (checkout) checkout.disabled = state.cart.length === 0 || Boolean(state.activeOrder);
}

function changeQuantity(itemId, delta) {
  const item = state.cart.find(entry => entry.itemId === itemId);
  if (!item) return;
  item.quantity += delta;
  if (item.quantity <= 0) {
    state.cart = state.cart.filter(entry => entry.itemId !== itemId);
  }
  renderCart();
}

function addItem(item) {
  if (!state.selectedRestaurant) return;

  const existing = state.cart.find(entry => entry.itemId === item.id);
  if (existing) {
    existing.quantity += 1;
  } else {
    state.cart.push({
      restaurantId: state.selectedRestaurant.id,
      itemId: item.id,
      name: item.name,
      priceCents: Number(item.priceCents || 0),
      quantity: 1
    });
  }
  renderCart();
  showToast(item.name + ' added to cart');
}

function filteredRestaurants() {
  return state.restaurants.filter(restaurant => {
    const category = categoryOf(restaurant);
    const categoryMatch = state.category === 'all' || category === state.category;
    const searchMatch = !state.search || restaurantSearchText(restaurant).includes(state.search);
    return categoryMatch && searchMatch;
  });
}

function renderRestaurants() {
  const grid = document.getElementById('restaurant-grid');
  if (!grid) return;

  const restaurants = filteredRestaurants();
  grid.innerHTML = '';

  for (const restaurant of restaurants) {
    const category = categoryOf(restaurant);
    const card = document.createElement('article');
    card.className = 'restaurant-card';
    card.dataset.category = category;
    card.dataset.search = restaurantSearchText(restaurant);

    const visual = document.createElement('div');
    visual.className = 'restaurant-visual';

    const imageUrl = String(
      restaurant.imageUrl
      || restaurant.coverImageUrl
      || restaurant.photoUrl
      || restaurant.logoUrl
      || restaurant.settings?.branding?.imageUrl
      || ''
    ).trim();

    if (imageUrl) {
      const image = document.createElement('img');
      image.className = 'restaurant-photo';
      image.src = imageUrl;
      image.alt = restaurant.name ? restaurant.name + ' restaurant' : 'Restaurant';
      image.loading = 'lazy';
      image.addEventListener('error', () => {
        image.remove();
        visual.className = 'restaurant-visual api-fallback';
        visual.innerHTML = '<i class="bi bi-shop" aria-hidden="true"></i>';
      });
      visual.appendChild(image);
    } else {
      const visualClass = {
        'fast-food': 'visual-burger',
        pizza: 'visual-pizza',
        chicken: 'visual-chicken',
        haitian: 'visual-haitian',
        chinese: 'visual-chinese',
        grocery: 'visual-grocery'
      }[category] || 'api-fallback';
      visual.className = 'restaurant-visual ' + visualClass;
      visual.innerHTML = '<i class="bi bi-shop" aria-hidden="true"></i>';
    }

    const body = document.createElement('div');
    body.className = 'restaurant-body';

    const titleRow = document.createElement('div');
    titleRow.className = 'restaurant-title-row';

    const title = document.createElement('h3');
    title.textContent = restaurant.name || 'Restaurant';

    const badge = document.createElement('span');
    badge.className = 'rating' + (restaurant.verificationStatus === 'verified' ? ' verified' : '');
    badge.innerHTML = restaurant.verificationStatus === 'verified'
      ? '<i class="bi bi-patch-check-fill"></i> Verified'
      : 'New';

    titleRow.append(title, badge);

    const cuisine = document.createElement('p');
    cuisine.textContent = [restaurant.cuisine, restaurant.city].filter(Boolean).join(' • ') || 'Local restaurant';

    const meta = document.createElement('div');
    meta.className = 'restaurant-meta';
    meta.innerHTML = '<span>' + moneyCents(getDeliveryFeeCents(restaurant)) + ' delivery</span><span>Live menu</span>';

    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.action = 'view-menu';
    button.textContent = 'View menu';
    button.addEventListener('click', () => openRestaurant(restaurant));

    body.append(titleRow, cuisine, meta, button);
    card.append(visual, body);
    grid.appendChild(card);
  }

  const countNode = document.getElementById('restaurant-count');
  if (countNode) countNode.textContent = restaurants.length + ' ' + (restaurants.length === 1 ? 'place' : 'places');
  document.getElementById('no-results')?.classList.toggle('hidden', restaurants.length !== 0);
}

async function loadRestaurants() {
  const grid = document.getElementById('restaurant-grid');
  if (grid) {
    grid.innerHTML = '<div class="eat-loading-card"><i class="bi bi-arrow-repeat"></i><strong>Loading restaurants...</strong></div>';
  }

  try {
    const data = state.location
      ? await fetchJson('/api/restaurants/nearby?lat=' + encodeURIComponent(state.location.lat) + '&lng=' + encodeURIComponent(state.location.lng))
      : await fetchJson('/api/restaurants/search');

    state.restaurants = Array.isArray(data?.restaurants) ? data.restaurants : [];
    renderRestaurants();
  } catch (error) {
    if (grid) {
      grid.innerHTML = '<div class="eat-api-message"><strong>Restaurants are unavailable.</strong><span>Please try again.</span></div>';
    }
    showToast(error.message || 'Could not load restaurants.');
  }
}

async function openRestaurant(restaurant) {
  const grid = document.getElementById('restaurant-grid');
  if (!grid) return;

  if (state.cart.length && state.selectedRestaurant?.id && state.selectedRestaurant.id !== restaurant.id) {
    const clear = window.confirm('Your cart contains items from another restaurant. Clear the cart and continue?');
    if (!clear) return;
    state.cart = [];
  }

  state.selectedRestaurant = restaurant;
  renderCart();

  grid.innerHTML = '<div class="eat-loading-card"><strong>Loading ' + (restaurant.name || 'menu') + '...</strong></div>';

  try {
    const data = await fetchJson('/api/restaurants/' + encodeURIComponent(restaurant.id) + '/menu');
    state.menu = Array.isArray(data?.items) ? data.items : [];
    renderMenu();
  } catch (error) {
    grid.innerHTML = '<div class="eat-api-message"><strong>Menu unavailable.</strong><span>' + String(error.message || '') + '</span></div>';
  }
}

function renderMenu() {
  const grid = document.getElementById('restaurant-grid');
  if (!grid || !state.selectedRestaurant) return;
  grid.innerHTML = '';

  const toolbar = document.createElement('div');
  toolbar.className = 'menu-toolbar';

  const heading = document.createElement('div');
  const title = document.createElement('strong');
  title.textContent = state.selectedRestaurant.name || 'Menu';
  const subtitle = document.createElement('div');
  subtitle.textContent = 'Choose items from the live restaurant menu.';
  heading.append(title, subtitle);

  const back = document.createElement('button');
  back.type = 'button';
  back.textContent = '← Restaurants';
  back.addEventListener('click', () => {
    state.selectedRestaurant = state.cart.length ? state.selectedRestaurant : null;
    renderRestaurants();
  });

  toolbar.append(heading, back);
  grid.appendChild(toolbar);

  if (!state.menu.length) {
    const empty = document.createElement('div');
    empty.className = 'eat-api-message';
    empty.innerHTML = '<strong>No available menu items.</strong><span>Check back later.</span>';
    grid.appendChild(empty);
    return;
  }

  for (const item of state.menu) {
    const card = document.createElement('article');
    card.className = 'menu-item-card';

    const name = document.createElement('h3');
    name.textContent = item.name || 'Menu item';

    const description = document.createElement('p');
    description.textContent = item.description || '';

    const price = document.createElement('strong');
    price.textContent = moneyCents(item.priceCents);

    const add = document.createElement('button');
    add.type = 'button';
    add.textContent = 'Add to cart';
    add.addEventListener('click', () => addItem(item));

    card.append(name, description, price, add);
    grid.appendChild(card);
  }
}

function renderActiveOrder() {
  const host = document.querySelector('.order-status-card');
  if (!host) return;

  if (!state.activeOrder) {
    host.className = 'order-status-card';
    host.innerHTML = '<i class="bi bi-bicycle"></i><div><strong>Live delivery tracking</strong><span>Track preparation, pickup, and driver arrival after checkout.</span></div>';
    return;
  }

  const order = state.activeOrder;
  const status = String(order.status || order.tracking?.stage || 'pending').toLowerCase();
  host.className = 'order-live-panel';
  host.dataset.state = status;
  host.innerHTML = '';

  const title = document.createElement('strong');
  title.textContent = 'Order ' + order.id;

  const stage = document.createElement('span');
  stage.textContent = 'Status: ' + status.replaceAll('_', ' ');

  const eta = document.createElement('span');
  const etaMinutes = Number(order.tracking?.etaMinutes);
  eta.textContent = Number.isFinite(etaMinutes) && etaMinutes > 0 ? 'ETA: ' + etaMinutes + ' min' : 'Tracking live';

  host.append(title, stage, eta);

  if (['pending', 'accepted'].includes(status)) {
    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.textContent = 'Cancel order';
    cancel.addEventListener('click', cancelActiveOrder);
    host.appendChild(cancel);
  }
}

async function checkout() {
  if (!state.cart.length || !state.selectedRestaurant) return;

  const session = getSession();
  if (!session.token || String(session.user?.role || '').toLowerCase() !== 'rider') {
    showToast('Please sign in as a rider before checkout.');
    return;
  }

  const checkoutButton = document.getElementById('checkout-button');
  if (checkoutButton) checkoutButton.disabled = true;

  try {
    const data = await fetchJson('/api/orders/food', {
      method: 'POST',
      body: JSON.stringify({
        restaurantId: state.selectedRestaurant.id,
        items: state.cart.map(item => ({ itemId: item.itemId, quantity: item.quantity }))
      })
    }, true);

    state.activeOrder = data.order;
    state.cart = [];
    renderCart();
    renderActiveOrder();
    startOrderTracking();
    showToast('Order placed successfully.');
  } catch (error) {
    showToast(error.message || 'Could not place order.');
    renderCart();
  }
}

async function refreshActiveOrder() {
  if (!state.activeOrder?.id) return;

  try {
    const data = await fetchJson('/api/orders/food/' + encodeURIComponent(state.activeOrder.id) + '/track', {}, true);
    state.activeOrder = {
      ...state.activeOrder,
      status: data.status,
      tracking: data.tracking
    };
    renderActiveOrder();

    if (['completed', 'canceled', 'rejected', 'refunded'].includes(String(data.status || '').toLowerCase())) {
      stopOrderTracking();
    }
  } catch (error) {
    if (error.status === 401 || error.status === 403) stopOrderTracking();
  }
}

function startOrderTracking() {
  stopOrderTracking();
  refreshActiveOrder();
  state.trackingTimer = window.setInterval(refreshActiveOrder, 5000);
}

function stopOrderTracking() {
  if (state.trackingTimer) {
    window.clearInterval(state.trackingTimer);
    state.trackingTimer = null;
  }
}

async function cancelActiveOrder() {
  if (!state.activeOrder?.id) return;
  try {
    const data = await fetchJson('/api/orders/food/' + encodeURIComponent(state.activeOrder.id) + '/cancel', {
      method: 'PUT',
      body: JSON.stringify({ reason: 'rider_canceled' })
    }, true);
    state.activeOrder = data.order || { ...state.activeOrder, status: 'canceled' };
    renderActiveOrder();
    stopOrderTracking();
    showToast('Order canceled.');
  } catch (error) {
    showToast(error.message || 'Could not cancel order.');
  }
}

async function restoreActiveOrder() {
  const session = getSession();
  if (!session.token || !session.user?.id || String(session.user.role || '').toLowerCase() !== 'rider') return;

  try {
    const data = await fetchJson('/api/orders/food/active', {}, true);
    const orders = Array.isArray(data?.orders) ? data.orders : [];
    state.activeOrder = orders[0] || null;
    renderActiveOrder();
    if (state.activeOrder) startOrderTracking();
  } catch (_error) {
    // Rider can still browse restaurants if order restore fails.
  }
}

document.querySelectorAll('.category-chip').forEach(button => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.category-chip').forEach(item => item.classList.remove('active'));
    button.classList.add('active');
    state.category = button.dataset.category || 'all';
    if (!state.selectedRestaurant) renderRestaurants();
  });
});

document.getElementById('food-search')?.addEventListener('input', event => {
  state.search = String(event.target.value || '').trim().toLowerCase();
  state.selectedRestaurant = null;
  renderRestaurants();
});

document.getElementById('checkout-button')?.addEventListener('click', checkout);

document.getElementById('location-button')?.addEventListener('click', () => {
  if (!navigator.geolocation) {
    showToast('Location is not available in this browser.');
    return;
  }

  showToast('Finding your location...');
  navigator.geolocation.getCurrentPosition(
    position => {
      state.location = {
        lat: Number(position.coords.latitude),
        lng: Number(position.coords.longitude)
      };
      const node = document.getElementById('delivery-location');
      if (node) node.textContent = state.location.lat.toFixed(4) + ', ' + state.location.lng.toFixed(4);
      showToast('Delivery location updated.');
      loadRestaurants();
    },
    () => showToast('Could not access your location.'),
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 }
  );
});

window.addEventListener('beforeunload', stopOrderTracking);

renderCart();
renderActiveOrder();
loadRestaurants();
restoreActiveOrder();