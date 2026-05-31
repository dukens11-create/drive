import * as authService from './auth.service';
import { makeId, timestamp, store, type RideStatus } from '../database/data.store';

type RestaurantDocument = { id: string; type: string; url?: string; status: string; createdAt: string; updatedAt: string };
type MenuVariant = { id: string; name: string; priceDeltaCents?: number; available?: boolean };
type MenuAddon = { id: string; name: string; priceCents?: number; required?: boolean; available?: boolean };
type MenuItem = {
  id: string;
  name: string;
  description?: string;
  priceCents: number;
  categoryId?: string;
  images: string[];
  available: boolean;
  variants: MenuVariant[];
  addons: MenuAddon[];
  views: number;
  soldCount: number;
  createdAt: string;
  updatedAt: string;
};
type MenuCategory = { id: string; name: string; description?: string; createdAt: string; updatedAt: string };
type RestaurantOrderStatus = RideStatus | 'pending' | 'preparing' | 'ready' | 'rejected' | 'refunded';
type RestaurantOrder = {
  id: string;
  restaurantId: string;
  userId: string;
  items: Array<{ itemId: string; quantity: number }>;
  status: RestaurantOrderStatus;
  notes: string[];
  prepStartedAt?: string;
  prepReadyAt?: string;
  rejectionReason?: string;
  canceledReason?: string;
  refundReason?: string;
  amountCents: number;
  createdAt: string;
  updatedAt: string;
};
type StaffMember = { id: string; name?: string; email?: string; role: string; createdAt: string; updatedAt: string };
type Promotion = { id: string; code: string; type?: string; discountValue?: number; active: boolean; usageCount: number; createdAt: string; updatedAt: string };
type WebhookConfig = { id: string; url: string; events: string[]; createdAt: string };
type Review = { id: string; userId?: string; rating: number; comment?: string; response?: string; createdAt: string };
type Feedback = { id: string; message: string; status: 'open' | 'resolved'; createdAt: string; resolvedAt?: string };
type PayoutRequest = { id: string; amountCents: number; status: 'requested' | 'processing' | 'paid'; createdAt: string };

type Restaurant = {
  id: string;
  userId: string;
  email: string;
  name: string;
  phone?: string;
  cuisine?: string;
  city?: string;
  address?: string;
  description?: string;
  featured?: boolean;
  location?: { lat: number; lng: number };
  emailVerified: boolean;
  verificationStatus: 'unverified' | 'pending' | 'verified' | 'rejected' | 'suspended';
  operatingHours: Record<string, { open: string; close: string }>;
  deliveryZones: Array<{ id: string; name: string; feeCents?: number }>;
  documents: Map<string, RestaurantDocument>;
  menuCategories: Map<string, MenuCategory>;
  menuItems: Map<string, MenuItem>;
  orders: Map<string, RestaurantOrder>;
  notificationPreferences: Record<string, boolean>;
  notifications: Array<{ id: string; message: string; createdAt: string }>;
  staff: Map<string, StaffMember>;
  promotions: Map<string, Promotion>;
  reviews: Map<string, Review>;
  feedback: Map<string, Feedback>;
  complianceDocuments: string[];
  complianceStatus: 'not_started' | 'in_review' | 'approved' | 'rejected';
  complianceHistory: Array<{ id: string; action: string; at: string }>;
  settings: Record<string, unknown>;
  bankAccount?: Record<string, unknown>;
  commissionRatePercent: number;
  webhooks: Map<string, WebhookConfig>;
  payouts: PayoutRequest[];
  createdAt: string;
  updatedAt: string;
};

type FoodOrder = RestaurantOrder & {
  tracking: { stage: string; etaMinutes: number; updatedAt: string };
  receipt: { subtotalCents: number; totalCents: number };
  rating?: { value: number; comment?: string; at: string };
};

const restaurants = new Map<string, Restaurant>();
const restaurantByUserId = new Map<string, string>();
const foodOrders = new Map<string, FoodOrder>();

function ok(action: string, payload: Record<string, unknown> = {}) {
  return { module: 'restaurants', action, ok: true, ...payload };
}

function err(action: string, error: string) {
  return { module: 'restaurants', action, error };
}

function toNumber(value: unknown, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function createRestaurant(input: { userId: string; email: string; name: string; phone?: string }) {
  const now = timestamp();
  const restaurant: Restaurant = {
    id: makeId('rest'),
    userId: input.userId,
    email: input.email,
    name: input.name,
    phone: input.phone,
    emailVerified: false,
    verificationStatus: 'unverified',
    operatingHours: {},
    deliveryZones: [],
    documents: new Map(),
    menuCategories: new Map(),
    menuItems: new Map(),
    orders: new Map(),
    notificationPreferences: {},
    notifications: [],
    staff: new Map(),
    promotions: new Map(),
    reviews: new Map(),
    feedback: new Map(),
    complianceDocuments: [],
    complianceStatus: 'not_started',
    complianceHistory: [],
    settings: {},
    commissionRatePercent: 20,
    webhooks: new Map(),
    payouts: [],
    createdAt: now,
    updatedAt: now
  };
  restaurants.set(restaurant.id, restaurant);
  restaurantByUserId.set(restaurant.userId, restaurant.id);
  return restaurant;
}

function getRestaurantByUserId(userId?: string) {
  if (!userId) return undefined;
  const restaurantId = restaurantByUserId.get(userId);
  if (!restaurantId) return undefined;
  return restaurants.get(restaurantId);
}

function ensureRestaurantByUser(user: any) {
  const existing = getRestaurantByUserId(user?.id);
  if (existing) return existing;
  const merchantUser = store.users.get(user?.id || '');
  if (!merchantUser || merchantUser.role !== 'merchant') return undefined;
  return createRestaurant({
    userId: merchantUser.id,
    email: merchantUser.email || '',
    name: merchantUser.email ? merchantUser.email.split('@')[0] : 'Restaurant',
    phone: merchantUser.phone
  });
}

function requireRestaurant(id: string, action: string) {
  const restaurant = restaurants.get(id);
  if (!restaurant) return err(action, 'restaurant not found');
  return restaurant;
}

function upsertRestaurantOrder(restaurant: Restaurant, payload: Partial<RestaurantOrder> & { userId: string; items: Array<{ itemId: string; quantity: number }> }) {
  const now = timestamp();
  const amountCents = payload.items.reduce((total, item) => {
    const menuItem = restaurant.menuItems.get(item.itemId);
    return total + (menuItem?.priceCents || 0) * Math.max(1, toNumber(item.quantity, 1));
  }, 0);

  const order: RestaurantOrder = {
    id: makeId('food_order'),
    restaurantId: restaurant.id,
    userId: payload.userId,
    items: payload.items.map(item => ({ itemId: item.itemId, quantity: Math.max(1, toNumber(item.quantity, 1)) })),
    status: 'pending',
    notes: [],
    amountCents,
    createdAt: now,
    updatedAt: now
  };

  restaurant.orders.set(order.id, order);
  return order;
}

function paginate<T>(items: T[], pageInput: unknown, limitInput: unknown) {
  const page = Math.max(1, toNumber(pageInput, 1));
  const limit = Math.min(100, Math.max(1, toNumber(limitInput, 20)));
  const start = (page - 1) * limit;
  return {
    page,
    limit,
    total: items.length,
    data: items.slice(start, start + limit)
  };
}

export async function register(body: any) {
  const created = await authService.signup({ ...body, role: 'merchant' });
  if ((created as any).error) return err('register', (created as any).error);
  const user = (created as any).user;
  const restaurant = createRestaurant({ userId: user.id, email: user.email || '', name: body?.name || 'Restaurant', phone: body?.phone });
  return ok('register', { restaurant, accessToken: (created as any).accessToken, refreshToken: (created as any).refreshToken, user });
}

export async function login(body: any) {
  const result = await authService.login(body);
  if ((result as any).error) return err('login', (result as any).error);
  const user = (result as any).user;
  if (user.role !== 'merchant') return err('login', 'merchant account required');
  const restaurant = ensureRestaurantByUser({ id: user.id });
  return ok('login', { restaurant, accessToken: (result as any).accessToken, refreshToken: (result as any).refreshToken, user });
}

export async function verifyEmail(body: any) {
  const email = body?.email?.toLowerCase?.();
  const restaurant = Array.from(restaurants.values()).find(entry => entry.email === email);
  if (!restaurant) return err('verify-email', 'restaurant not found');
  restaurant.emailVerified = true;
  restaurant.verificationStatus = 'pending';
  restaurant.updatedAt = timestamp();
  return ok('verify-email', { restaurantId: restaurant.id, emailVerified: true, verificationStatus: restaurant.verificationStatus });
}

export async function refreshToken(body: any) {
  const result = await authService.refresh(body);
  if ((result as any).error) return err('refresh-token', (result as any).error);
  return ok('refresh-token', { accessToken: (result as any).accessToken, refreshToken: (result as any).refreshToken });
}

export async function logout(body: any) {
  const result = await authService.logout(body);
  if ((result as any).error) return err('logout', (result as any).error);
  return ok('logout', { revoked: (result as any).revoked });
}

export async function updateProfile(id: string, body: any) {
  const restaurant = requireRestaurant(id, 'update-profile');
  if ('error' in restaurant) return restaurant;
  Object.assign(restaurant, body || {});
  restaurant.updatedAt = timestamp();
  return ok('update-profile', { restaurant });
}

export async function details(id: string) {
  const restaurant = requireRestaurant(id, 'details');
  if ('error' in restaurant) return restaurant;
  return ok('details', { restaurant });
}

export async function verificationStatus(user: any) {
  const restaurant = ensureRestaurantByUser(user);
  if (!restaurant) return err('verify-status', 'restaurant not found');
  return ok('verify-status', { restaurantId: restaurant.id, emailVerified: restaurant.emailVerified, verificationStatus: restaurant.verificationStatus });
}

export async function updateHours(user: any, body: any) {
  const restaurant = ensureRestaurantByUser(user);
  if (!restaurant) return err('hours', 'restaurant not found');
  restaurant.operatingHours = body?.operatingHours || body || {};
  restaurant.updatedAt = timestamp();
  return ok('hours', { operatingHours: restaurant.operatingHours });
}

export async function updateDeliveryZones(user: any, body: any) {
  const restaurant = ensureRestaurantByUser(user);
  if (!restaurant) return err('delivery-zones', 'restaurant not found');
  const zones = Array.isArray(body?.deliveryZones) ? body.deliveryZones : [];
  restaurant.deliveryZones = zones.map((zone: any) => ({
    id: zone?.id || makeId('zone'),
    name: zone?.name || 'zone',
    feeCents: toNumber(zone?.feeCents)
  }));
  restaurant.updatedAt = timestamp();
  return ok('delivery-zones', { deliveryZones: restaurant.deliveryZones });
}

export async function createDocument(id: string, body: any) {
  const restaurant = requireRestaurant(id, 'document-create');
  if ('error' in restaurant) return restaurant;
  const now = timestamp();
  const document: RestaurantDocument = { id: makeId('doc'), type: body?.type || 'unknown', url: body?.url, status: body?.status || 'uploaded', createdAt: now, updatedAt: now };
  restaurant.documents.set(document.id, document);
  restaurant.updatedAt = now;
  return ok('document-create', { document });
}

export async function listDocuments(id: string) {
  const restaurant = requireRestaurant(id, 'documents-list');
  if ('error' in restaurant) return restaurant;
  return ok('documents-list', { documents: Array.from(restaurant.documents.values()) });
}

export async function getDocument(id: string, docId: string) {
  const restaurant = requireRestaurant(id, 'document-get');
  if ('error' in restaurant) return restaurant;
  const document = restaurant.documents.get(docId);
  if (!document) return err('document-get', 'document not found');
  return ok('document-get', { document });
}

export async function updateDocument(id: string, docId: string, body: any) {
  const restaurant = requireRestaurant(id, 'document-update');
  if ('error' in restaurant) return restaurant;
  const document = restaurant.documents.get(docId);
  if (!document) return err('document-update', 'document not found');
  Object.assign(document, body || {}, { updatedAt: timestamp() });
  return ok('document-update', { document });
}

export async function deleteDocument(id: string, docId: string) {
  const restaurant = requireRestaurant(id, 'document-delete');
  if ('error' in restaurant) return restaurant;
  const deleted = restaurant.documents.delete(docId);
  return ok('document-delete', { deleted });
}

export async function submitVerification(id: string) {
  const restaurant = requireRestaurant(id, 'verify-submit');
  if ('error' in restaurant) return restaurant;
  restaurant.verificationStatus = 'pending';
  restaurant.updatedAt = timestamp();
  return ok('verify-submit', { verificationStatus: restaurant.verificationStatus });
}

export async function complianceStatus(id: string) {
  const restaurant = requireRestaurant(id, 'compliance-status');
  if ('error' in restaurant) return restaurant;
  return ok('compliance-status', { complianceStatus: restaurant.complianceStatus, checklistComplete: restaurant.complianceDocuments.length > 0 });
}

export async function createMenuCategory(id: string, body: any) {
  const restaurant = requireRestaurant(id, 'menu-category-create');
  if ('error' in restaurant) return restaurant;
  const now = timestamp();
  const category: MenuCategory = { id: makeId('cat'), name: body?.name || 'Category', description: body?.description, createdAt: now, updatedAt: now };
  restaurant.menuCategories.set(category.id, category);
  return ok('menu-category-create', { category });
}

export async function listMenuCategories(id: string) {
  const restaurant = requireRestaurant(id, 'menu-category-list');
  if ('error' in restaurant) return restaurant;
  return ok('menu-category-list', { categories: Array.from(restaurant.menuCategories.values()) });
}

export async function updateMenuCategory(id: string, categoryId: string, body: any) {
  const restaurant = requireRestaurant(id, 'menu-category-update');
  if ('error' in restaurant) return restaurant;
  const category = restaurant.menuCategories.get(categoryId);
  if (!category) return err('menu-category-update', 'category not found');
  Object.assign(category, body || {}, { updatedAt: timestamp() });
  return ok('menu-category-update', { category });
}

export async function deleteMenuCategory(id: string, categoryId: string) {
  const restaurant = requireRestaurant(id, 'menu-category-delete');
  if ('error' in restaurant) return restaurant;
  const deleted = restaurant.menuCategories.delete(categoryId);
  return ok('menu-category-delete', { deleted });
}

export async function createMenuItem(id: string, body: any) {
  const restaurant = requireRestaurant(id, 'menu-item-create');
  if ('error' in restaurant) return restaurant;
  const now = timestamp();
  const item: MenuItem = {
    id: makeId('item'),
    name: body?.name || 'Menu item',
    description: body?.description,
    priceCents: toNumber(body?.priceCents),
    categoryId: body?.categoryId,
    images: Array.isArray(body?.images) ? body.images : [],
    available: body?.available !== false,
    variants: [],
    addons: [],
    views: 0,
    soldCount: 0,
    createdAt: now,
    updatedAt: now
  };
  restaurant.menuItems.set(item.id, item);
  return ok('menu-item-create', { item });
}

export async function listMenuItems(id: string, query: any) {
  const restaurant = requireRestaurant(id, 'menu-item-list');
  if ('error' in restaurant) return restaurant;
  const items = Array.from(restaurant.menuItems.values());
  return ok('menu-item-list', paginate(items, query?.page, query?.limit));
}

export async function getMenuItem(id: string, itemId: string) {
  const restaurant = requireRestaurant(id, 'menu-item-get');
  if ('error' in restaurant) return restaurant;
  const item = restaurant.menuItems.get(itemId);
  if (!item) return err('menu-item-get', 'item not found');
  item.views += 1;
  return ok('menu-item-get', { item });
}

export async function updateMenuItem(id: string, itemId: string, body: any) {
  const restaurant = requireRestaurant(id, 'menu-item-update');
  if ('error' in restaurant) return restaurant;
  const item = restaurant.menuItems.get(itemId);
  if (!item) return err('menu-item-update', 'item not found');
  Object.assign(item, body || {}, { updatedAt: timestamp() });
  return ok('menu-item-update', { item });
}

export async function deleteMenuItem(id: string, itemId: string) {
  const restaurant = requireRestaurant(id, 'menu-item-delete');
  if ('error' in restaurant) return restaurant;
  const deleted = restaurant.menuItems.delete(itemId);
  return ok('menu-item-delete', { deleted });
}

export async function uploadItemImages(id: string, itemId: string, body: any) {
  const restaurant = requireRestaurant(id, 'menu-item-images');
  if ('error' in restaurant) return restaurant;
  const item = restaurant.menuItems.get(itemId);
  if (!item) return err('menu-item-images', 'item not found');
  const images = Array.isArray(body?.images) ? body.images : [];
  item.images = [...item.images, ...images];
  item.updatedAt = timestamp();
  return ok('menu-item-images', { item });
}

export async function setItemAvailability(id: string, itemId: string, body: any) {
  const restaurant = requireRestaurant(id, 'menu-item-availability');
  if ('error' in restaurant) return restaurant;
  const item = restaurant.menuItems.get(itemId);
  if (!item) return err('menu-item-availability', 'item not found');
  item.available = body?.available !== false;
  item.updatedAt = timestamp();
  return ok('menu-item-availability', { itemId, available: item.available });
}

export async function bulkImportMenu(id: string, body: any) {
  const restaurant = requireRestaurant(id, 'menu-bulk-import');
  if ('error' in restaurant) return restaurant;
  const csv = String(body?.csv || '');
  const rows = csv.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const importedItems: MenuItem[] = [];
  for (const row of rows) {
    const [name, priceText, categoryId] = row.split(',').map(part => part?.trim());
    if (!name) continue;
    const itemResult = await createMenuItem(id, { name, priceCents: toNumber(priceText), categoryId });
    if ((itemResult as any).item) importedItems.push((itemResult as any).item);
  }
  return ok('menu-bulk-import', { importedCount: importedItems.length, items: importedItems });
}

export async function exportMenu(id: string) {
  const restaurant = requireRestaurant(id, 'menu-export');
  if ('error' in restaurant) return restaurant;
  const rows = ['id,name,priceCents,categoryId,available'];
  for (const item of restaurant.menuItems.values()) rows.push(`${item.id},${item.name},${item.priceCents},${item.categoryId || ''},${item.available}`);
  return ok('menu-export', { csv: rows.join('\n') });
}

export async function createVariant(id: string, itemId: string, body: any) {
  const restaurant = requireRestaurant(id, 'menu-variant-create');
  if ('error' in restaurant) return restaurant;
  const item = restaurant.menuItems.get(itemId);
  if (!item) return err('menu-variant-create', 'item not found');
  const variant: MenuVariant = { id: makeId('var'), name: body?.name || 'Variant', priceDeltaCents: toNumber(body?.priceDeltaCents), available: body?.available !== false };
  item.variants.push(variant);
  item.updatedAt = timestamp();
  return ok('menu-variant-create', { variant });
}

export async function listVariants(id: string, itemId: string) {
  const restaurant = requireRestaurant(id, 'menu-variant-list');
  if ('error' in restaurant) return restaurant;
  const item = restaurant.menuItems.get(itemId);
  if (!item) return err('menu-variant-list', 'item not found');
  return ok('menu-variant-list', { variants: item.variants });
}

export async function updateVariant(id: string, itemId: string, variantId: string, body: any) {
  const restaurant = requireRestaurant(id, 'menu-variant-update');
  if ('error' in restaurant) return restaurant;
  const item = restaurant.menuItems.get(itemId);
  if (!item) return err('menu-variant-update', 'item not found');
  const variant = item.variants.find(entry => entry.id === variantId);
  if (!variant) return err('menu-variant-update', 'variant not found');
  Object.assign(variant, body || {});
  item.updatedAt = timestamp();
  return ok('menu-variant-update', { variant });
}

export async function deleteVariant(id: string, itemId: string, variantId: string) {
  const restaurant = requireRestaurant(id, 'menu-variant-delete');
  if ('error' in restaurant) return restaurant;
  const item = restaurant.menuItems.get(itemId);
  if (!item) return err('menu-variant-delete', 'item not found');
  const before = item.variants.length;
  item.variants = item.variants.filter(entry => entry.id !== variantId);
  item.updatedAt = timestamp();
  return ok('menu-variant-delete', { deleted: before !== item.variants.length });
}

export async function createAddon(id: string, itemId: string, body: any) {
  const restaurant = requireRestaurant(id, 'menu-addon-create');
  if ('error' in restaurant) return restaurant;
  const item = restaurant.menuItems.get(itemId);
  if (!item) return err('menu-addon-create', 'item not found');
  const addon: MenuAddon = { id: makeId('addon'), name: body?.name || 'Add-on', priceCents: toNumber(body?.priceCents), required: Boolean(body?.required), available: body?.available !== false };
  item.addons.push(addon);
  item.updatedAt = timestamp();
  return ok('menu-addon-create', { addon });
}

export async function listAddons(id: string, itemId: string) {
  const restaurant = requireRestaurant(id, 'menu-addon-list');
  if ('error' in restaurant) return restaurant;
  const item = restaurant.menuItems.get(itemId);
  if (!item) return err('menu-addon-list', 'item not found');
  return ok('menu-addon-list', { addons: item.addons });
}

export async function updateAddon(id: string, itemId: string, addonId: string, body: any) {
  const restaurant = requireRestaurant(id, 'menu-addon-update');
  if ('error' in restaurant) return restaurant;
  const item = restaurant.menuItems.get(itemId);
  if (!item) return err('menu-addon-update', 'item not found');
  const addon = item.addons.find(entry => entry.id === addonId);
  if (!addon) return err('menu-addon-update', 'add-on not found');
  Object.assign(addon, body || {});
  item.updatedAt = timestamp();
  return ok('menu-addon-update', { addon });
}

export async function deleteAddon(id: string, itemId: string, addonId: string) {
  const restaurant = requireRestaurant(id, 'menu-addon-delete');
  if ('error' in restaurant) return restaurant;
  const item = restaurant.menuItems.get(itemId);
  if (!item) return err('menu-addon-delete', 'item not found');
  const before = item.addons.length;
  item.addons = item.addons.filter(entry => entry.id !== addonId);
  item.updatedAt = timestamp();
  return ok('menu-addon-delete', { deleted: before !== item.addons.length });
}

export async function listOrders(id: string, query: any) {
  const restaurant = requireRestaurant(id, 'restaurant-orders');
  if ('error' in restaurant) return restaurant;
  let orders = Array.from(restaurant.orders.values());
  if (query?.status) orders = orders.filter(order => order.status === query.status);
  return ok('restaurant-orders', paginate(orders, query?.page, query?.limit));
}

export async function getOrder(id: string, orderId: string) {
  const restaurant = requireRestaurant(id, 'restaurant-order-detail');
  if ('error' in restaurant) return restaurant;
  const order = restaurant.orders.get(orderId);
  if (!order) return err('restaurant-order-detail', 'order not found');
  return ok('restaurant-order-detail', { order });
}

export async function updateOrderStatus(id: string, orderId: string, status: RestaurantOrderStatus) {
  const restaurant = requireRestaurant(id, 'restaurant-order-status');
  if ('error' in restaurant) return restaurant;
  const order = restaurant.orders.get(orderId);
  if (!order) return err('restaurant-order-status', 'order not found');
  order.status = status;
  order.updatedAt = timestamp();
  const publicOrder = foodOrders.get(orderId);
  if (publicOrder) {
    publicOrder.status = status;
    publicOrder.updatedAt = order.updatedAt;
    publicOrder.tracking = { stage: status, etaMinutes: Math.max(1, publicOrder.tracking.etaMinutes - 5), updatedAt: order.updatedAt };
  }
  return ok('restaurant-order-status', { order });
}

export async function rejectOrder(id: string, orderId: string, reason: string) {
  const updated = await updateOrderStatus(id, orderId, 'rejected');
  if (!(updated as any).ok) return updated;
  const restaurant = restaurants.get(id)!;
  const order = restaurant.orders.get(orderId)!;
  order.rejectionReason = reason;
  return ok('restaurant-order-reject', { order });
}

export async function cancelOrder(id: string, orderId: string, reason: string) {
  const updated = await updateOrderStatus(id, orderId, 'canceled');
  if (!(updated as any).ok) return updated;
  const restaurant = restaurants.get(id)!;
  const order = restaurant.orders.get(orderId)!;
  order.canceledReason = reason;
  return ok('restaurant-order-cancel', { order });
}

export async function addOrderNote(id: string, orderId: string, note: string) {
  const restaurant = requireRestaurant(id, 'restaurant-order-note');
  if ('error' in restaurant) return restaurant;
  const order = restaurant.orders.get(orderId);
  if (!order) return err('restaurant-order-note', 'order not found');
  order.notes.push(note);
  order.updatedAt = timestamp();
  return ok('restaurant-order-note', { order });
}

export async function startPreparation(id: string, orderId: string) {
  const restaurant = requireRestaurant(id, 'restaurant-order-start-preparation');
  if ('error' in restaurant) return restaurant;
  const order = restaurant.orders.get(orderId);
  if (!order) return err('restaurant-order-start-preparation', 'order not found');
  order.status = 'preparing';
  order.prepStartedAt = timestamp();
  order.updatedAt = order.prepStartedAt;
  return ok('restaurant-order-start-preparation', { order });
}

export async function orderHistory(id: string, query: any) {
  const restaurant = requireRestaurant(id, 'restaurant-order-history');
  if ('error' in restaurant) return restaurant;
  let orders = Array.from(restaurant.orders.values());
  if (query?.status) orders = orders.filter(order => order.status === query.status);
  if (query?.userId) orders = orders.filter(order => order.userId === query.userId);
  return ok('restaurant-order-history', paginate(orders, query?.page, query?.limit));
}

export async function activeOrders(id: string) {
  const restaurant = requireRestaurant(id, 'restaurant-order-active');
  if ('error' in restaurant) return restaurant;
  const active = Array.from(restaurant.orders.values()).filter(order => ['pending', 'accepted', 'preparing', 'ready', 'started'].includes(order.status));
  return ok('restaurant-order-active', { orders: active });
}

export async function refundOrder(id: string, orderId: string, reason: string) {
  const updated = await updateOrderStatus(id, orderId, 'refunded');
  if (!(updated as any).ok) return updated;
  const restaurant = restaurants.get(id)!;
  const order = restaurant.orders.get(orderId)!;
  order.refundReason = reason;
  return ok('restaurant-order-refund', { order });
}

export async function createFoodOrder(body: any) {
  const restaurant = requireRestaurant(body?.restaurantId, 'food-order-create');
  if ('error' in restaurant) return restaurant;
  const order = upsertRestaurantOrder(restaurant, {
    userId: body?.userId,
    items: (body?.items || []).map((entry: any) => ({ itemId: entry.itemId, quantity: entry.quantity }))
  });

  for (const entry of order.items) {
    const item = restaurant.menuItems.get(entry.itemId);
    if (item) item.soldCount += entry.quantity;
  }

  const foodOrder: FoodOrder = {
    ...order,
    tracking: { stage: order.status, etaMinutes: 35, updatedAt: order.updatedAt },
    receipt: { subtotalCents: order.amountCents, totalCents: order.amountCents }
  };
  foodOrders.set(order.id, foodOrder);
  return ok('food-order-create', { order: foodOrder });
}

export async function getFoodOrder(orderId: string) {
  const order = foodOrders.get(orderId);
  if (!order) return err('food-order-get', 'order not found');
  return ok('food-order-get', { order });
}

export async function listFoodOrdersByUser(userId: string, query: any) {
  const orders = Array.from(foodOrders.values()).filter(order => order.userId === userId);
  return ok('food-order-user-list', paginate(orders, query?.page, query?.limit));
}

export async function updateFoodOrderStatus(orderId: string, status: RestaurantOrderStatus) {
  const order = foodOrders.get(orderId);
  if (!order) return err('food-order-status', 'order not found');
  order.status = status;
  order.updatedAt = timestamp();
  order.tracking = { stage: status, etaMinutes: Math.max(1, order.tracking.etaMinutes - 4), updatedAt: order.updatedAt };

  const restaurant = restaurants.get(order.restaurantId);
  const restaurantOrder = restaurant?.orders.get(order.id);
  if (restaurantOrder) {
    restaurantOrder.status = status;
    restaurantOrder.updatedAt = order.updatedAt;
  }

  return ok('food-order-status', { order });
}

export async function trackFoodOrder(orderId: string) {
  const order = foodOrders.get(orderId);
  if (!order) return err('food-order-track', 'order not found');
  return ok('food-order-track', { tracking: order.tracking, status: order.status });
}

export async function rateFoodOrder(orderId: string, body: any) {
  const order = foodOrders.get(orderId);
  if (!order) return err('food-order-rate', 'order not found');
  order.rating = { value: toNumber(body?.rating, 0), comment: body?.comment, at: timestamp() };

  const restaurant = restaurants.get(order.restaurantId);
  if (restaurant) {
    const review: Review = { id: makeId('review'), userId: order.userId, rating: Math.max(1, Math.min(5, order.rating.value || 0)), comment: order.rating.comment, createdAt: order.rating.at };
    restaurant.reviews.set(review.id, review);
  }

  return ok('food-order-rate', { rating: order.rating });
}

export async function foodOrderReceipt(orderId: string) {
  const order = foodOrders.get(orderId);
  if (!order) return err('food-order-receipt', 'order not found');
  return ok('food-order-receipt', { receipt: order.receipt });
}

export async function requestFoodOrderRefund(orderId: string, body: any) {
  const updated = await updateFoodOrderStatus(orderId, 'refunded');
  if (!(updated as any).ok) return updated;
  const order = foodOrders.get(orderId)!;
  order.refundReason = body?.reason;
  return ok('food-order-refund-request', { order });
}

export async function activeFoodOrders(userId?: string) {
  let orders = Array.from(foodOrders.values()).filter(order => ['pending', 'accepted', 'preparing', 'ready', 'started'].includes(order.status));
  if (userId) orders = orders.filter(order => order.userId === userId);
  return ok('food-order-active', { orders });
}

export async function searchRestaurants(query: any) {
  const term = String(query?.q || query?.name || '').toLowerCase();
  const list = Array.from(restaurants.values()).filter(restaurant => !term || restaurant.name.toLowerCase().includes(term));
  return ok('restaurants-search', { restaurants: list });
}

export async function nearbyRestaurants(query: any) {
  const lat = Number(query?.lat);
  const lng = Number(query?.lng);
  const list = Array.from(restaurants.values()).filter(entry => {
    if (!entry.location || !Number.isFinite(lat) || !Number.isFinite(lng)) return true;
    const distance = Math.abs(entry.location.lat - lat) + Math.abs(entry.location.lng - lng);
    return distance <= 2;
  });
  return ok('restaurants-nearby', { restaurants: list });
}

export async function featuredRestaurants() {
  const list = Array.from(restaurants.values()).filter(restaurant => restaurant.featured);
  return ok('restaurants-featured', { restaurants: list });
}

export async function restaurantsByCuisine(cuisine: string) {
  const list = Array.from(restaurants.values()).filter(restaurant => restaurant.cuisine?.toLowerCase() === cuisine.toLowerCase());
  return ok('restaurants-by-cuisine', { restaurants: list });
}

export async function restaurantsByCity(city: string) {
  const list = Array.from(restaurants.values()).filter(restaurant => restaurant.city?.toLowerCase() === city.toLowerCase());
  return ok('restaurants-by-location', { restaurants: list });
}

export async function trendingRestaurants() {
  const list = Array.from(restaurants.values()).sort((a, b) => b.orders.size - a.orders.size).slice(0, 20);
  return ok('restaurants-trending', { restaurants: list });
}

export async function restaurantReviews(id: string) {
  const restaurant = requireRestaurant(id, 'restaurants-reviews');
  if ('error' in restaurant) return restaurant;
  return ok('restaurants-reviews', { reviews: Array.from(restaurant.reviews.values()) });
}

export async function publicRestaurantMenu(id: string) {
  const restaurant = requireRestaurant(id, 'restaurants-menu');
  if ('error' in restaurant) return restaurant;
  return ok('restaurants-menu', {
    categories: Array.from(restaurant.menuCategories.values()),
    items: Array.from(restaurant.menuItems.values()).filter(item => item.available)
  });
}

export async function analyticsOverview(id: string) {
  const restaurant = requireRestaurant(id, 'analytics-overview');
  if ('error' in restaurant) return restaurant;
  const orders = Array.from(restaurant.orders.values());
  const revenueCents = orders.reduce((sum, order) => sum + order.amountCents, 0);
  return ok('analytics-overview', { totalOrders: orders.length, revenueCents, activeOrders: orders.filter(order => ['pending', 'accepted', 'preparing', 'ready'].includes(order.status)).length });
}

export async function analyticsOrders(id: string) {
  const restaurant = requireRestaurant(id, 'analytics-orders');
  if ('error' in restaurant) return restaurant;
  const orders = Array.from(restaurant.orders.values());
  const total = orders.length;
  const canceled = orders.filter(order => order.status === 'canceled' || order.status === 'rejected').length;
  const averageOrderValueCents = total === 0 ? 0 : Math.round(orders.reduce((sum, order) => sum + order.amountCents, 0) / total);
  return ok('analytics-orders', { totalOrders: total, averageOrderValueCents, cancellationRate: total === 0 ? 0 : canceled / total });
}

export async function analyticsItems(id: string) {
  const restaurant = requireRestaurant(id, 'analytics-items');
  if ('error' in restaurant) return restaurant;
  const items = Array.from(restaurant.menuItems.values());
  const bestSelling = [...items].sort((a, b) => b.soldCount - a.soldCount).slice(0, 10);
  const mostViewed = [...items].sort((a, b) => b.views - a.views).slice(0, 10);
  return ok('analytics-items', { bestSelling, mostViewed });
}

export async function analyticsRevenue(id: string) {
  const restaurant = requireRestaurant(id, 'analytics-revenue');
  if ('error' in restaurant) return restaurant;
  const totalRevenueCents = Array.from(restaurant.orders.values()).reduce((sum, order) => sum + order.amountCents, 0);
  return ok('analytics-revenue', { dailyRevenueCents: totalRevenueCents, weeklyRevenueCents: totalRevenueCents, monthlyRevenueCents: totalRevenueCents, revenueTrends: [] });
}

export async function analyticsRatings(id: string) {
  const restaurant = requireRestaurant(id, 'analytics-ratings');
  if ('error' in restaurant) return restaurant;
  const reviews = Array.from(restaurant.reviews.values());
  const averageRating = reviews.length === 0 ? 0 : reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
  const distribution = reviews.reduce<Record<number, number>>((acc, review) => {
    acc[review.rating] = (acc[review.rating] || 0) + 1;
    return acc;
  }, {});
  return ok('analytics-ratings', { averageRating, distribution, totalReviews: reviews.length });
}

export async function analyticsDeliveryTime(id: string) {
  const restaurant = requireRestaurant(id, 'analytics-delivery-time');
  if ('error' in restaurant) return restaurant;
  return ok('analytics-delivery-time', { averageDeliveryMinutes: 32, averagePreparationMinutes: 14, averagePickupToDeliveryMinutes: 18 });
}

export async function analyticsExport(id: string) {
  const overview = await analyticsOverview(id);
  if (!(overview as any).ok) return overview;
  return ok('analytics-export', { csv: `metric,value\norders,${(overview as any).totalOrders}\nrevenueCents,${(overview as any).revenueCents}` });
}

export async function earnings(id: string) {
  const restaurant = requireRestaurant(id, 'earnings');
  if ('error' in restaurant) return restaurant;
  const grossCents = Array.from(restaurant.orders.values()).reduce((sum, order) => sum + order.amountCents, 0);
  const commissionCents = Math.round((grossCents * restaurant.commissionRatePercent) / 100);
  return ok('earnings', { grossCents, commissionCents, netCents: grossCents - commissionCents });
}

export async function earningsBreakdown(id: string) {
  const restaurant = requireRestaurant(id, 'earnings-breakdown');
  if ('error' in restaurant) return restaurant;
  const breakdown = Array.from(restaurant.orders.values()).map(order => ({ orderId: order.id, amountCents: order.amountCents, status: order.status }));
  return ok('earnings-breakdown', { breakdown });
}

export async function payoutHistory(id: string) {
  const restaurant = requireRestaurant(id, 'payouts');
  if ('error' in restaurant) return restaurant;
  return ok('payouts', { payouts: restaurant.payouts });
}

export async function payoutDetails(id: string, payoutId: string) {
  const restaurant = requireRestaurant(id, 'payout-details');
  if ('error' in restaurant) return restaurant;
  const payout = restaurant.payouts.find(entry => entry.id === payoutId);
  if (!payout) return err('payout-details', 'payout not found');
  return ok('payout-details', { payout });
}

export async function requestPayout(id: string, body: any) {
  const restaurant = requireRestaurant(id, 'payout-request');
  if ('error' in restaurant) return restaurant;
  const payout: PayoutRequest = { id: makeId('payout'), amountCents: toNumber(body?.amountCents), status: 'requested', createdAt: timestamp() };
  restaurant.payouts.push(payout);
  return ok('payout-request', { payout });
}

export async function updateBankAccount(id: string, body: any) {
  const restaurant = requireRestaurant(id, 'bank-account');
  if ('error' in restaurant) return restaurant;
  restaurant.bankAccount = body || {};
  restaurant.updatedAt = timestamp();
  return ok('bank-account', { bankAccount: restaurant.bankAccount });
}

export async function commissionStructure(id: string) {
  const restaurant = requireRestaurant(id, 'commission-structure');
  if ('error' in restaurant) return restaurant;
  return ok('commission-structure', { commissionRatePercent: restaurant.commissionRatePercent });
}

export async function updateSettings(id: string, body: any) {
  const restaurant = requireRestaurant(id, 'settings-update');
  if ('error' in restaurant) return restaurant;
  restaurant.settings = { ...restaurant.settings, ...(body || {}) };
  restaurant.updatedAt = timestamp();
  return ok('settings-update', { settings: restaurant.settings });
}

export async function getSettings(id: string) {
  const restaurant = requireRestaurant(id, 'settings-get');
  if ('error' in restaurant) return restaurant;
  return ok('settings-get', { settings: restaurant.settings });
}

export async function updateNotificationPreferences(id: string, body: any) {
  const restaurant = requireRestaurant(id, 'notifications-preferences-update');
  if ('error' in restaurant) return restaurant;
  restaurant.notificationPreferences = { ...restaurant.notificationPreferences, ...(body || {}) };
  return ok('notifications-preferences-update', { preferences: restaurant.notificationPreferences });
}

export async function getNotificationPreferences(id: string) {
  const restaurant = requireRestaurant(id, 'notifications-preferences-get');
  if ('error' in restaurant) return restaurant;
  return ok('notifications-preferences-get', { preferences: restaurant.notificationPreferences });
}

export async function notificationsHistory(id: string) {
  const restaurant = requireRestaurant(id, 'notifications-history');
  if ('error' in restaurant) return restaurant;
  return ok('notifications-history', { notifications: restaurant.notifications });
}

export async function sendTestNotification(id: string) {
  const restaurant = requireRestaurant(id, 'notifications-send-test');
  if ('error' in restaurant) return restaurant;
  const notification = { id: makeId('notif'), message: 'Test notification', createdAt: timestamp() };
  restaurant.notifications.unshift(notification);
  return ok('notifications-send-test', { notification });
}

export async function addStaff(id: string, body: any) {
  const restaurant = requireRestaurant(id, 'staff-add');
  if ('error' in restaurant) return restaurant;
  const now = timestamp();
  const member: StaffMember = { id: makeId('staff'), name: body?.name, email: body?.email, role: body?.role || 'staff', createdAt: now, updatedAt: now };
  restaurant.staff.set(member.id, member);
  return ok('staff-add', { staff: member });
}

export async function listStaff(id: string) {
  const restaurant = requireRestaurant(id, 'staff-list');
  if ('error' in restaurant) return restaurant;
  return ok('staff-list', { staff: Array.from(restaurant.staff.values()) });
}

export async function getStaff(id: string, staffId: string) {
  const restaurant = requireRestaurant(id, 'staff-get');
  if ('error' in restaurant) return restaurant;
  const member = restaurant.staff.get(staffId);
  if (!member) return err('staff-get', 'staff not found');
  return ok('staff-get', { staff: member });
}

export async function updateStaff(id: string, staffId: string, body: any) {
  const restaurant = requireRestaurant(id, 'staff-update');
  if ('error' in restaurant) return restaurant;
  const member = restaurant.staff.get(staffId);
  if (!member) return err('staff-update', 'staff not found');
  Object.assign(member, body || {}, { updatedAt: timestamp() });
  return ok('staff-update', { staff: member });
}

export async function removeStaff(id: string, staffId: string) {
  const restaurant = requireRestaurant(id, 'staff-remove');
  if ('error' in restaurant) return restaurant;
  const deleted = restaurant.staff.delete(staffId);
  return ok('staff-remove', { deleted });
}

export async function updateStaffRole(id: string, staffId: string, role: string) {
  return updateStaff(id, staffId, { role });
}

export async function createPromotion(id: string, body: any) {
  const restaurant = requireRestaurant(id, 'promotion-create');
  if ('error' in restaurant) return restaurant;
  const now = timestamp();
  const promotion: Promotion = { id: makeId('promo'), code: body?.code || makeId('CODE').toUpperCase(), type: body?.type, discountValue: toNumber(body?.discountValue), active: body?.active !== false, usageCount: 0, createdAt: now, updatedAt: now };
  restaurant.promotions.set(promotion.id, promotion);
  return ok('promotion-create', { promotion });
}

export async function listPromotions(id: string) {
  const restaurant = requireRestaurant(id, 'promotion-list');
  if ('error' in restaurant) return restaurant;
  return ok('promotion-list', { promotions: Array.from(restaurant.promotions.values()) });
}

export async function updatePromotion(id: string, promoId: string, body: any) {
  const restaurant = requireRestaurant(id, 'promotion-update');
  if ('error' in restaurant) return restaurant;
  const promotion = restaurant.promotions.get(promoId);
  if (!promotion) return err('promotion-update', 'promotion not found');
  Object.assign(promotion, body || {}, { updatedAt: timestamp() });
  return ok('promotion-update', { promotion });
}

export async function deletePromotion(id: string, promoId: string) {
  const restaurant = requireRestaurant(id, 'promotion-delete');
  if ('error' in restaurant) return restaurant;
  const deleted = restaurant.promotions.delete(promoId);
  return ok('promotion-delete', { deleted });
}

export async function promotionPerformance(id: string, promoId: string) {
  const restaurant = requireRestaurant(id, 'promotion-performance');
  if ('error' in restaurant) return restaurant;
  const promotion = restaurant.promotions.get(promoId);
  if (!promotion) return err('promotion-performance', 'promotion not found');
  return ok('promotion-performance', { promoId, usageCount: promotion.usageCount, conversionRate: 0 });
}

export async function reviewById(id: string, reviewId: string) {
  const restaurant = requireRestaurant(id, 'review-get');
  if ('error' in restaurant) return restaurant;
  const review = restaurant.reviews.get(reviewId);
  if (!review) return err('review-get', 'review not found');
  return ok('review-get', { review });
}

export async function respondToReview(id: string, reviewId: string, body: any) {
  const restaurant = requireRestaurant(id, 'review-response');
  if ('error' in restaurant) return restaurant;
  const review = restaurant.reviews.get(reviewId);
  if (!review) return err('review-response', 'review not found');
  review.response = body?.response;
  return ok('review-response', { review });
}

export async function listFeedback(id: string) {
  const restaurant = requireRestaurant(id, 'feedback-list');
  if ('error' in restaurant) return restaurant;
  return ok('feedback-list', { feedback: Array.from(restaurant.feedback.values()) });
}

export async function resolveFeedback(id: string, feedbackId: string) {
  const restaurant = requireRestaurant(id, 'feedback-resolve');
  if ('error' in restaurant) return restaurant;
  const feedback = restaurant.feedback.get(feedbackId);
  if (!feedback) return err('feedback-resolve', 'feedback not found');
  feedback.status = 'resolved';
  feedback.resolvedAt = timestamp();
  return ok('feedback-resolve', { feedback });
}

export async function complianceChecklist(id: string) {
  const restaurant = requireRestaurant(id, 'compliance-checklist');
  if ('error' in restaurant) return restaurant;
  return ok('compliance-checklist', {
    checklist: [
      { key: 'business_license', complete: restaurant.complianceDocuments.includes('business_license') },
      { key: 'food_safety_cert', complete: restaurant.complianceDocuments.includes('food_safety_cert') },
      { key: 'tax_registration', complete: restaurant.complianceDocuments.includes('tax_registration') }
    ]
  });
}

export async function uploadComplianceDocuments(id: string, body: any) {
  const restaurant = requireRestaurant(id, 'compliance-documents-upload');
  if ('error' in restaurant) return restaurant;
  const docs = Array.isArray(body?.documents) ? body.documents : [];
  restaurant.complianceDocuments = Array.from(new Set([...restaurant.complianceDocuments, ...docs]));
  restaurant.complianceHistory.push({ id: makeId('comp'), action: 'documents_uploaded', at: timestamp() });
  return ok('compliance-documents-upload', { documents: restaurant.complianceDocuments });
}

export async function submitCompliance(id: string) {
  const restaurant = requireRestaurant(id, 'compliance-submit');
  if ('error' in restaurant) return restaurant;
  restaurant.complianceStatus = 'in_review';
  restaurant.complianceHistory.push({ id: makeId('comp'), action: 'submitted', at: timestamp() });
  return ok('compliance-submit', { complianceStatus: restaurant.complianceStatus });
}

export async function complianceHistory(id: string) {
  const restaurant = requireRestaurant(id, 'compliance-history');
  if ('error' in restaurant) return restaurant;
  return ok('compliance-history', { history: restaurant.complianceHistory });
}

export async function adminListRestaurants() {
  return ok('admin-restaurants-list', { restaurants: Array.from(restaurants.values()) });
}

export async function adminVerifyRestaurant(id: string) {
  const restaurant = requireRestaurant(id, 'admin-restaurants-verify');
  if ('error' in restaurant) return restaurant;
  restaurant.verificationStatus = 'verified';
  restaurant.emailVerified = true;
  restaurant.updatedAt = timestamp();
  return ok('admin-restaurants-verify', { restaurant });
}

export async function adminSuspendRestaurant(id: string) {
  const restaurant = requireRestaurant(id, 'admin-restaurants-suspend');
  if ('error' in restaurant) return restaurant;
  restaurant.verificationStatus = 'suspended';
  restaurant.updatedAt = timestamp();
  return ok('admin-restaurants-suspend', { restaurant });
}

export async function adminApproveRestaurant(id: string) {
  return adminVerifyRestaurant(id);
}

export async function adminUpdateCommission(id: string, body: any) {
  const restaurant = requireRestaurant(id, 'admin-restaurants-commission');
  if ('error' in restaurant) return restaurant;
  restaurant.commissionRatePercent = toNumber(body?.commissionRatePercent, restaurant.commissionRatePercent);
  restaurant.updatedAt = timestamp();
  return ok('admin-restaurants-commission', { restaurantId: id, commissionRatePercent: restaurant.commissionRatePercent });
}

export async function batchUpdateItems(id: string, body: any) {
  const restaurant = requireRestaurant(id, 'batch-update-items');
  if ('error' in restaurant) return restaurant;
  const updates = Array.isArray(body?.items) ? body.items : [];
  let updatedCount = 0;
  for (const update of updates) {
    const item = restaurant.menuItems.get(update?.id);
    if (!item) continue;
    Object.assign(item, update, { updatedAt: timestamp() });
    updatedCount += 1;
  }
  return ok('batch-update-items', { updatedCount });
}

export async function batchDeleteItems(id: string, body: any) {
  const restaurant = requireRestaurant(id, 'batch-delete-items');
  if ('error' in restaurant) return restaurant;
  const itemIds = Array.isArray(body?.itemIds) ? body.itemIds : [];
  let deletedCount = 0;
  for (const itemId of itemIds) {
    if (restaurant.menuItems.delete(itemId)) deletedCount += 1;
  }
  return ok('batch-delete-items', { deletedCount });
}

export async function batchOrderStatus(id: string, body: any) {
  const restaurant = requireRestaurant(id, 'batch-order-status');
  if ('error' in restaurant) return restaurant;
  const updates = Array.isArray(body?.orders) ? body.orders : [];
  let updatedCount = 0;
  for (const update of updates) {
    const order = restaurant.orders.get(update?.orderId);
    if (!order) continue;
    order.status = update?.status || order.status;
    order.updatedAt = timestamp();
    updatedCount += 1;
  }
  return ok('batch-order-status', { updatedCount });
}

export async function createWebhook(id: string, body: any) {
  const restaurant = requireRestaurant(id, 'webhook-create');
  if ('error' in restaurant) return restaurant;
  const webhook: WebhookConfig = { id: makeId('wh'), url: body?.url || '', events: Array.isArray(body?.events) ? body.events : [], createdAt: timestamp() };
  restaurant.webhooks.set(webhook.id, webhook);
  return ok('webhook-create', { webhook });
}

export async function listWebhooks(id: string) {
  const restaurant = requireRestaurant(id, 'webhook-list');
  if ('error' in restaurant) return restaurant;
  return ok('webhook-list', { webhooks: Array.from(restaurant.webhooks.values()) });
}

export async function deleteWebhook(id: string, webhookId: string) {
  const restaurant = requireRestaurant(id, 'webhook-delete');
  if ('error' in restaurant) return restaurant;
  const deleted = restaurant.webhooks.delete(webhookId);
  return ok('webhook-delete', { deleted });
}
