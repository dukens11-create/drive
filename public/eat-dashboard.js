const state = {
  category: 'all',
  search: '',
  cart: []
};

const DELIVERY_FEE = 2.49;
const TAX_RATE = 0.0825;

function money(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function showToast(message) {
  const toast = document.getElementById('eat-toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  window.setTimeout(() => toast.classList.remove('show'), 1800);
}

function filterRestaurants() {
  const cards = Array.from(document.querySelectorAll('.restaurant-card'));
  let visibleCount = 0;
  cards.forEach(card => {
    const categoryMatch = state.category === 'all' || card.dataset.category === state.category;
    const haystack = String(card.dataset.search || '').toLowerCase();
    const searchMatch = !state.search || haystack.includes(state.search);
    const visible = categoryMatch && searchMatch;
    card.classList.toggle('hidden', !visible);
    if (visible) visibleCount++;
  });

  const countNode = document.getElementById('restaurant-count');
  if (countNode) countNode.textContent = `${visibleCount} ${visibleCount === 1 ? 'place' : 'places'}`;
  document.getElementById('no-results')?.classList.toggle('hidden', visibleCount !== 0);
}

function renderCart() {
  const itemsNode = document.getElementById('cart-items');
  const emptyNode = document.getElementById('cart-empty');
  if (!itemsNode || !emptyNode) return;

  itemsNode.innerHTML = '';
  state.cart.forEach((item, index) => {
    const row = document.createElement('div');
    row.className = 'cart-item';

    const left = document.createElement('div');
    const name = document.createElement('div');
    name.className = 'cart-item-name';
    name.textContent = item.name;
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.textContent = 'Remove';
    remove.addEventListener('click', () => {
      state.cart.splice(index, 1);
      renderCart();
    });
    left.append(name, remove);

    const price = document.createElement('div');
    price.className = 'cart-item-price';
    price.textContent = money(item.price);

    row.append(left, price);
    itemsNode.appendChild(row);
  });

  const subtotal = state.cart.reduce((sum, item) => sum + item.price, 0);
  const delivery = state.cart.length ? DELIVERY_FEE : 0;
  const tax = subtotal * TAX_RATE;
  const total = subtotal + delivery + tax;

  emptyNode.classList.toggle('hidden', state.cart.length > 0);
  document.getElementById('cart-count').textContent = String(state.cart.length);
  document.getElementById('cart-subtotal').textContent = money(subtotal);
  document.getElementById('cart-delivery').textContent = money(delivery);
  document.getElementById('cart-tax').textContent = money(tax);
  document.getElementById('cart-total').textContent = money(total);

  const checkout = document.getElementById('checkout-button');
  if (checkout) checkout.disabled = state.cart.length === 0;
}

document.querySelectorAll('.category-chip').forEach(button => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.category-chip').forEach(item => item.classList.remove('active'));
    button.classList.add('active');
    state.category = button.dataset.category || 'all';
    filterRestaurants();
  });
});

document.getElementById('food-search')?.addEventListener('input', event => {
  state.search = String(event.target.value || '').trim().toLowerCase();
  filterRestaurants();
});

document.querySelectorAll('.add-demo-item').forEach(button => {
  button.addEventListener('click', () => {
    const name = String(button.dataset.item || 'Menu item');
    const price = Number(button.dataset.price || 0);
    state.cart.push({ name, price });
    renderCart();
    showToast(`${name} added to cart`);
  });
});

document.getElementById('checkout-button')?.addEventListener('click', () => {
  showToast('Checkout flow is ready for the next step.');
});

document.getElementById('location-button')?.addEventListener('click', () => {
  if (!navigator.geolocation) {
    showToast('Location is not available in this browser.');
    return;
  }

  showToast('Finding your location...');
  navigator.geolocation.getCurrentPosition(
    position => {
      const lat = Number(position.coords.latitude).toFixed(4);
      const lng = Number(position.coords.longitude).toFixed(4);
      const node = document.getElementById('delivery-location');
      if (node) node.textContent = `${lat}, ${lng}`;
      showToast('Delivery location updated.');
    },
    () => showToast('Could not access your location.')
  );
});

filterRestaurants();
renderCart();
