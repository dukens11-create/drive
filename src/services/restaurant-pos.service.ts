import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { env } from '../config/env';
import * as restaurants from './restaurants.service';

type Provider = 'square' | 'toast' | 'clover';

type ProviderMenuItem = {
  providerItemId: string;
  providerGroupId?: string;
  name: string;
  description?: string;
  priceCents: number;
  categoryName: string;
  available: boolean;
  images: string[];
};

type PosConnection = {
  restaurantId: string;
  provider: Provider;
  encryptedCredentials: string;
  createdAt: string;
  updatedAt: string;
  lastTestAt?: string;
  lastTestOk?: boolean;
  lastSyncAt?: string;
  itemMap: Record<string, string>;
  categoryMap: Record<string, string>;
};

type SquareCredentials = {
  accessToken: string;
  locationId: string;
  environment?: 'sandbox' | 'production';
};

type ToastCredentials = {
  clientId: string;
  clientSecret: string;
  restaurantGuid: string;
  apiHost: string;
};

type CloverCredentials = {
  accessToken: string;
  merchantId: string;
  environment?: 'sandbox' | 'production';
  region?: 'na' | 'eu' | 'latam';
};

const connections = new Map<string, PosConnection>();

function now() {
  return new Date().toISOString();
}

function ok(action: string, payload: Record<string, unknown> = {}) {
  return { module: 'restaurant-pos', action, ok: true, ...payload };
}

function err(action: string, error: string, statusCode = 400) {
  return { module: 'restaurant-pos', action, ok: false, error, statusCode };
}

function storePath() {
  const base = path.resolve(process.cwd(), env.dataStoreFile || '.data/store.json');
  return path.join(path.dirname(base), 'restaurant-pos-connections.json');
}

function encryptionSecret() {
  return env.posCredentialsEncryptionKey || env.jwtSecret;
}

function encryptionKey() {
  return crypto.createHash('sha256').update(String(encryptionSecret())).digest();
}

function encrypt(value: unknown) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const plaintext = Buffer.from(JSON.stringify(value), 'utf8');
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    iv.toString('base64url'),
    tag.toString('base64url'),
    encrypted.toString('base64url')
  ].join('.');
}

function decrypt<T>(payload: string): T {
  const [ivText, tagText, encryptedText] = String(payload || '').split('.');
  if (!ivText || !tagText || !encryptedText) {
    throw new Error('invalid encrypted POS credential payload');
  }

  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    encryptionKey(),
    Buffer.from(ivText, 'base64url')
  );
  decipher.setAuthTag(Buffer.from(tagText, 'base64url'));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedText, 'base64url')),
    decipher.final()
  ]);

  return JSON.parse(decrypted.toString('utf8')) as T;
}

function persistConnections() {
  if (env.nodeEnv === 'test') return;

  const file = storePath();
  fs.mkdirSync(path.dirname(file), { recursive: true });

  const serialized = Array.from(connections.values());
  const temp = `${file}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(serialized, null, 2), 'utf8');
  fs.renameSync(temp, file);
}

function hydrateConnections() {
  if (env.nodeEnv === 'test') return;

  const file = storePath();
  if (!fs.existsSync(file)) return;

  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!Array.isArray(parsed)) return;

    for (const entry of parsed) {
      if (
        entry
        && typeof entry.restaurantId === 'string'
        && ['square', 'toast', 'clover'].includes(entry.provider)
        && typeof entry.encryptedCredentials === 'string'
      ) {
        connections.set(entry.restaurantId, {
          ...entry,
          itemMap: entry.itemMap || {},
          categoryMap: entry.categoryMap || {}
        });
      }
    }
  } catch {
    // Do not prevent server startup because a local connector cache is unreadable.
  }
}

hydrateConnections();

function connectionSummary(connection?: PosConnection) {
  if (!connection) {
    return {
      connected: false,
      provider: 'native',
      menuSource: 'flupflap'
    };
  }

  return {
    connected: true,
    provider: connection.provider,
    menuSource: connection.provider,
    createdAt: connection.createdAt,
    updatedAt: connection.updatedAt,
    lastTestAt: connection.lastTestAt,
    lastTestOk: connection.lastTestOk,
    lastSyncAt: connection.lastSyncAt,
    mappedItemCount: Object.keys(connection.itemMap || {}).length
  };
}

function validateCredentials(provider: Provider, credentials: any) {
  if (!credentials || typeof credentials !== 'object') {
    throw new Error('credentials are required');
  }

  if (provider === 'square') {
    const value: SquareCredentials = credentials;
    if (!String(value.accessToken || '').trim()) throw new Error('Square accessToken is required');
    if (!String(value.locationId || '').trim()) throw new Error('Square locationId is required');
    if (value.environment && !['sandbox', 'production'].includes(value.environment)) {
      throw new Error('Square environment must be sandbox or production');
    }
    return;
  }

  if (provider === 'toast') {
    const value: ToastCredentials = credentials;
    if (!String(value.clientId || '').trim()) throw new Error('Toast clientId is required');
    if (!String(value.clientSecret || '').trim()) throw new Error('Toast clientSecret is required');
    if (!String(value.restaurantGuid || '').trim()) throw new Error('Toast restaurantGuid is required');
    const host = String(value.apiHost || '').trim();
    if (!host) throw new Error('Toast apiHost is required');
    const url = new URL(host);
    if (url.protocol !== 'https:' || !url.hostname.toLowerCase().endsWith('.toasttab.com')) {
      throw new Error('Toast apiHost must be an HTTPS toasttab.com hostname');
    }
    return;
  }

  const value: CloverCredentials = credentials;
  if (!String(value.accessToken || '').trim()) throw new Error('Clover accessToken is required');
  if (!String(value.merchantId || '').trim()) throw new Error('Clover merchantId is required');
  if (value.environment && !['sandbox', 'production'].includes(value.environment)) {
    throw new Error('Clover environment must be sandbox or production');
  }
  if (value.region && !['na', 'eu', 'latam'].includes(value.region)) {
    throw new Error('Clover region must be na, eu, or latam');
  }
}

async function ensureRestaurantExists(restaurantId: string) {
  const result = await restaurants.details(restaurantId) as any;
  if (!result?.ok) throw new Error('restaurant not found');
}

async function fetchJson(url: string, init: RequestInit = {}, timeoutMs = 15000) {
  const response = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(timeoutMs)
  });

  const raw = await response.text();
  let data: any = null;

  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch {
      data = { raw: raw.slice(0, 1000) };
    }
  }

  if (!response.ok) {
    const providerMessage = String(
      data?.errors?.[0]?.detail
      || data?.error?.message
      || data?.message
      || data?.details
      || ''
    ).trim();

    throw new Error(
      providerMessage || `provider returned HTTP ${response.status}`
    );
  }

  return data;
}

function squareBase(credentials: SquareCredentials) {
  return credentials.environment === 'sandbox'
    ? 'https://connect.squareupsandbox.com'
    : 'https://connect.squareup.com';
}

function cloverBase(credentials: CloverCredentials) {
  if (credentials.environment === 'sandbox') {
    return 'https://apisandbox.dev.clover.com';
  }

  if (credentials.region === 'eu') return 'https://api.eu.clover.com';
  if (credentials.region === 'latam') return 'https://api.la.clover.com';
  return 'https://api.clover.com';
}

function cleanToastHost(value: string) {
  return value.replace(/\/+$/, '');
}

async function toastToken(credentials: ToastCredentials) {
  const host = cleanToastHost(credentials.apiHost);

  const result = await fetchJson(
    `${host}/authentication/v1/authentication/login`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId: credentials.clientId,
        clientSecret: credentials.clientSecret,
        userAccessType: 'TOAST_MACHINE_CLIENT'
      })
    }
  );

  const accessToken = String(result?.token?.accessToken || '').trim();
  if (!accessToken) throw new Error('Toast authentication did not return an access token');
  return accessToken;
}

async function testSquare(credentials: SquareCredentials) {
  const data = await fetchJson(
    `${squareBase(credentials)}/v2/catalog/list?types=ITEM`,
    {
      headers: {
        Authorization: `Bearer ${credentials.accessToken}`,
        'Square-Version': '2026-07-15'
      }
    }
  );

  return {
    provider: 'square',
    locationId: credentials.locationId,
    catalogReadable: Array.isArray(data?.objects)
  };
}

async function testToast(credentials: ToastCredentials) {
  const token = await toastToken(credentials);
  const host = cleanToastHost(credentials.apiHost);

  const data = await fetchJson(
    `${host}/restaurants/v1/restaurants/${encodeURIComponent(credentials.restaurantGuid)}?includeArchived=false`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Toast-Restaurant-External-ID': credentials.restaurantGuid
      }
    }
  );

  return {
    provider: 'toast',
    restaurantGuid: credentials.restaurantGuid,
    name: data?.general?.name || data?.general?.locationName || undefined
  };
}

async function testClover(credentials: CloverCredentials) {
  const data = await fetchJson(
    `${cloverBase(credentials)}/v3/merchants/${encodeURIComponent(credentials.merchantId)}/items?limit=1`,
    {
      headers: {
        Authorization: `Bearer ${credentials.accessToken}`,
        'User-Agent': 'FlupFlap-Eat/1.0 POS-Connector'
      }
    }
  );

  return {
    provider: 'clover',
    merchantId: credentials.merchantId,
    inventoryReadable: Array.isArray(data?.elements)
  };
}

function moneyAmountToCents(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.max(0, Math.round(numeric)) : 0;
}

async function squareMenu(credentials: SquareCredentials): Promise<ProviderMenuItem[]> {
  const base = squareBase(credentials);
  const objects: any[] = [];
  let cursor = '';

  for (let page = 0; page < 8; page += 1) {
    const url = new URL(`${base}/v2/catalog/list`);
    url.searchParams.set('types', 'ITEM,CATEGORY,IMAGE');
    if (cursor) url.searchParams.set('cursor', cursor);

    const data = await fetchJson(url.toString(), {
      headers: {
        Authorization: `Bearer ${credentials.accessToken}`,
        'Square-Version': '2026-07-15'
      }
    });

    if (Array.isArray(data?.objects)) objects.push(...data.objects);
    cursor = String(data?.cursor || '');
    if (!cursor) break;
  }

  const categoryNames = new Map<string, string>();
  const imageUrls = new Map<string, string>();

  for (const object of objects) {
    if (object?.type === 'CATEGORY' && object?.id) {
      categoryNames.set(
        String(object.id),
        String(object?.category_data?.name || 'Menu')
      );
    }

    if (object?.type === 'IMAGE' && object?.id && object?.image_data?.url) {
      imageUrls.set(String(object.id), String(object.image_data.url));
    }
  }

  const items: ProviderMenuItem[] = [];

  for (const object of objects) {
    if (object?.type !== 'ITEM' || !object?.id) continue;

    const itemData = object?.item_data || {};
    const variations = Array.isArray(itemData.variations)
      ? itemData.variations
      : [];

    const categoryId = String(
      itemData.category_id
      || itemData.categories?.[0]?.id
      || ''
    );
    const categoryName = categoryNames.get(categoryId) || 'Menu';

    const images = (Array.isArray(itemData.image_ids) ? itemData.image_ids : [])
      .map((id: unknown) => imageUrls.get(String(id)))
      .filter((url: unknown): url is string => Boolean(url));

    if (!variations.length) {
      items.push({
        providerItemId: String(object.id),
        name: String(itemData.name || 'Menu item'),
        description: itemData.description ? String(itemData.description) : undefined,
        priceCents: 0,
        categoryName,
        available: !object.is_deleted,
        images
      });
      continue;
    }

    for (const variation of variations) {
      const variationData = variation?.item_variation_data || {};
      const variationName = String(variationData.name || '').trim();
      const baseName = String(itemData.name || 'Menu item').trim();
      const name = variations.length > 1 && variationName
        ? `${baseName} - ${variationName}`
        : baseName;

      items.push({
        providerItemId: String(variation?.id || object.id),
        name,
        description: itemData.description ? String(itemData.description) : undefined,
        priceCents: moneyAmountToCents(variationData?.price_money?.amount),
        categoryName,
        available: !variation?.is_deleted && !object.is_deleted,
        images
      });
    }
  }

  return items;
}

function walkToastGroups(
  groups: any[],
  menuName: string,
  output: ProviderMenuItem[]
) {
  for (const group of groups || []) {
    const categoryName = String(group?.name || menuName || 'Menu');
    const groupGuid = group?.guid ? String(group.guid) : undefined;

    for (const item of Array.isArray(group?.menuItems) ? group.menuItems : []) {
      const providerId = String(item?.guid || '').trim();
      const name = String(item?.name || item?.posName || '').trim();
      if (!providerId || !name) continue;

      const rawPrice = Number(item?.price);
      const priceCents = Number.isFinite(rawPrice)
        ? Math.max(0, Math.round(rawPrice * 100))
        : 0;

      const images = [
        item?.image,
        item?.highResImage,
        ...(Array.isArray(item?.images)
          ? item.images.map((image: any) => image?.url || image)
          : [])
      ].filter(Boolean).map(String);

      output.push({
        providerItemId: providerId,
        providerGroupId: groupGuid,
        name,
        description: item?.description ? String(item.description) : undefined,
        priceCents,
        categoryName,
        available: item?.availability !== 'UNAVAILABLE' && item?.orderableOnline !== 'NO',
        images
      });
    }

    if (Array.isArray(group?.menuGroups)) {
      walkToastGroups(group.menuGroups, categoryName, output);
    }
  }
}

async function toastMenu(credentials: ToastCredentials): Promise<ProviderMenuItem[]> {
  const token = await toastToken(credentials);
  const host = cleanToastHost(credentials.apiHost);

  const data = await fetchJson(`${host}/menus/v3/menus`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Toast-Restaurant-External-ID': credentials.restaurantGuid
    }
  });

  const items: ProviderMenuItem[] = [];

  for (const menu of Array.isArray(data?.menus) ? data.menus : []) {
    walkToastGroups(
      Array.isArray(menu?.menuGroups) ? menu.menuGroups : [],
      String(menu?.name || 'Menu'),
      items
    );
  }

  return items;
}

async function cloverMenu(credentials: CloverCredentials): Promise<ProviderMenuItem[]> {
  const data = await fetchJson(
    `${cloverBase(credentials)}/v3/merchants/${encodeURIComponent(credentials.merchantId)}/items?limit=1000&expand=categories`,
    {
      headers: {
        Authorization: `Bearer ${credentials.accessToken}`,
        'User-Agent': 'FlupFlap-Eat/1.0 POS-Connector'
      }
    }
  );

  const items: ProviderMenuItem[] = [];

  for (const item of Array.isArray(data?.elements) ? data.elements : []) {
    const id = String(item?.id || '').trim();
    const name = String(item?.name || '').trim();
    if (!id || !name) continue;

    const categories = Array.isArray(item?.categories?.elements)
      ? item.categories.elements
      : [];

    items.push({
      providerItemId: id,
      name,
      description: item?.alternateName ? String(item.alternateName) : undefined,
      priceCents: moneyAmountToCents(item?.price),
      categoryName: String(categories?.[0]?.name || 'Menu'),
      available: item?.available !== false && item?.hidden !== true && item?.deleted !== true,
      images: []
    });
  }

  return items;
}

async function providerMenu(connection: PosConnection) {
  if (connection.provider === 'square') {
    return squareMenu(decrypt<SquareCredentials>(connection.encryptedCredentials));
  }
  if (connection.provider === 'toast') {
    return toastMenu(decrypt<ToastCredentials>(connection.encryptedCredentials));
  }
  return cloverMenu(decrypt<CloverCredentials>(connection.encryptedCredentials));
}

export async function configureConnection(
  restaurantId: string,
  body: any
) {
  try {
    await ensureRestaurantExists(restaurantId);

    const provider = String(body?.provider || '').toLowerCase() as Provider;
    if (!['square', 'toast', 'clover'].includes(provider)) {
      return err('connection-configure', 'provider must be square, toast, or clover');
    }

    if (env.nodeEnv === 'production' && !env.posCredentialsEncryptionKey) {
      return err(
        'connection-configure',
        'POS_CREDENTIALS_ENCRYPTION_KEY is required in production before POS credentials can be stored',
        503
      );
    }

    validateCredentials(provider, body?.credentials);

    const existing = connections.get(restaurantId);
    const timestamp = now();

    const connection: PosConnection = {
      restaurantId,
      provider,
      encryptedCredentials: encrypt(body.credentials),
      createdAt: existing?.createdAt || timestamp,
      updatedAt: timestamp,
      lastTestAt: existing?.lastTestAt,
      lastTestOk: existing?.lastTestOk,
      lastSyncAt: existing?.lastSyncAt,
      itemMap: existing?.provider === provider ? existing.itemMap : {},
      categoryMap: existing?.provider === provider ? existing.categoryMap : {}
    };

    connections.set(restaurantId, connection);
    persistConnections();

    return ok('connection-configure', {
      connection: connectionSummary(connection)
    });
  } catch (error: any) {
    return err(
      'connection-configure',
      String(error?.message || 'could not configure restaurant POS connection')
    );
  }
}

export async function connectionStatus(restaurantId: string) {
  try {
    await ensureRestaurantExists(restaurantId);
    return ok('connection-status', {
      connection: connectionSummary(connections.get(restaurantId)),
      supportedProviders: ['square', 'toast', 'clover'],
      nativeFallback: true
    });
  } catch (error: any) {
    return err('connection-status', String(error?.message || 'restaurant not found'), 404);
  }
}

export async function disconnect(restaurantId: string) {
  const deleted = connections.delete(restaurantId);
  if (deleted) persistConnections();

  return ok('connection-disconnect', {
    disconnected: deleted,
    connection: connectionSummary()
  });
}

export async function testConnection(restaurantId: string) {
  const connection = connections.get(restaurantId);
  if (!connection) {
    return err('connection-test', 'restaurant POS is not connected', 404);
  }

  try {
    let providerResult: any;

    if (connection.provider === 'square') {
      providerResult = await testSquare(
        decrypt<SquareCredentials>(connection.encryptedCredentials)
      );
    } else if (connection.provider === 'toast') {
      providerResult = await testToast(
        decrypt<ToastCredentials>(connection.encryptedCredentials)
      );
    } else {
      providerResult = await testClover(
        decrypt<CloverCredentials>(connection.encryptedCredentials)
      );
    }

    connection.lastTestAt = now();
    connection.lastTestOk = true;
    connection.updatedAt = connection.lastTestAt;
    persistConnections();

    return ok('connection-test', {
      provider: connection.provider,
      providerResult,
      connection: connectionSummary(connection)
    });
  } catch (error: any) {
    connection.lastTestAt = now();
    connection.lastTestOk = false;
    connection.updatedAt = connection.lastTestAt;
    persistConnections();

    return err(
      'connection-test',
      String(error?.message || 'restaurant POS connection failed'),
      502
    );
  }
}

export async function syncMenu(restaurantId: string) {
  const connection = connections.get(restaurantId);
  if (!connection) {
    return err('menu-sync', 'restaurant POS is not connected', 404);
  }

  try {
    await ensureRestaurantExists(restaurantId);
    const providerItems = await providerMenu(connection);

    const categories = new Set(
      providerItems.map(item => item.categoryName || 'Menu')
    );

    for (const categoryName of categories) {
      if (connection.categoryMap[categoryName]) continue;

      const created = await restaurants.createMenuCategory(
        restaurantId,
        { name: categoryName }
      ) as any;

      if (created?.category?.id) {
        connection.categoryMap[categoryName] = created.category.id;
      }
    }

    const seenProviderIds = new Set<string>();
    let createdCount = 0;
    let updatedCount = 0;

    for (const item of providerItems) {
      seenProviderIds.add(item.providerItemId);
      const categoryId = connection.categoryMap[item.categoryName || 'Menu'];

      const payload = {
        name: item.name,
        description: item.description,
        priceCents: item.priceCents,
        categoryId,
        images: item.images,
        available: item.available
      };

      const existingLocalId = connection.itemMap[item.providerItemId];

      if (existingLocalId) {
        const updated = await restaurants.updateMenuItem(
          restaurantId,
          existingLocalId,
          payload
        ) as any;

        if (updated?.ok) {
          updatedCount += 1;
          continue;
        }
      }

      const created = await restaurants.createMenuItem(
        restaurantId,
        payload
      ) as any;

      if (created?.item?.id) {
        connection.itemMap[item.providerItemId] = created.item.id;
        createdCount += 1;
      }
    }

    let unavailableCount = 0;

    for (const [providerItemId, localItemId] of Object.entries(connection.itemMap)) {
      if (seenProviderIds.has(providerItemId)) continue;

      const updated = await restaurants.setItemAvailability(
        restaurantId,
        localItemId,
        { available: false }
      ) as any;

      if (updated?.ok) unavailableCount += 1;
    }

    connection.lastSyncAt = now();
    connection.updatedAt = connection.lastSyncAt;
    persistConnections();

    return ok('menu-sync', {
      provider: connection.provider,
      providerItemCount: providerItems.length,
      createdCount,
      updatedCount,
      unavailableCount,
      lastSyncAt: connection.lastSyncAt
    });
  } catch (error: any) {
    return err(
      'menu-sync',
      String(error?.message || 'restaurant POS menu sync failed'),
      502
    );
  }
}

async function submitSquareOrder(
  credentials: SquareCredentials,
  body: any
) {
  if (body?.confirmExternalSubmit !== true) {
    throw new Error('confirmExternalSubmit=true is required');
  }

  const order = body?.providerPayload?.order;
  if (!order || typeof order !== 'object') {
    throw new Error('providerPayload.order is required for Square');
  }

  const payload = {
    idempotency_key:
      String(body?.providerPayload?.idempotency_key || crypto.randomUUID()),
    order: {
      ...order,
      location_id: order.location_id || credentials.locationId
    }
  };

  return fetchJson(
    `${squareBase(credentials)}/v2/orders`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${credentials.accessToken}`,
        'Square-Version': '2026-07-15',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    }
  );
}

async function submitToastOrder(
  credentials: ToastCredentials,
  body: any
) {
  if (body?.confirmExternalSubmit !== true) {
    throw new Error('confirmExternalSubmit=true is required');
  }

  const order = body?.providerPayload;
  if (!order || typeof order !== 'object') {
    throw new Error('providerPayload is required for Toast');
  }

  const token = await toastToken(credentials);
  const host = cleanToastHost(credentials.apiHost);

  return fetchJson(
    `${host}/orders/v2/orders`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Toast-Restaurant-External-ID': credentials.restaurantGuid,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(order)
    }
  );
}

async function submitCloverOrder(
  credentials: CloverCredentials,
  body: any
) {
  if (body?.confirmExternalSubmit !== true) {
    throw new Error('confirmExternalSubmit=true is required');
  }

  const orderCart = body?.providerPayload?.orderCart;
  if (!orderCart || typeof orderCart !== 'object') {
    throw new Error('providerPayload.orderCart is required for Clover atomic orders');
  }

  return fetchJson(
    `${cloverBase(credentials)}/v3/merchants/${encodeURIComponent(credentials.merchantId)}/atomic_order/orders`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${credentials.accessToken}`,
        'User-Agent': 'FlupFlap-Eat/1.0 POS-Connector',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ orderCart })
    }
  );
}

export async function submitProviderOrder(
  restaurantId: string,
  body: any
) {
  const connection = connections.get(restaurantId);

  if (!connection) {
    return err('order-submit', 'restaurant POS is not connected', 404);
  }

  try {
    let providerOrder: any;

    if (connection.provider === 'square') {
      providerOrder = await submitSquareOrder(
        decrypt<SquareCredentials>(connection.encryptedCredentials),
        body
      );
    } else if (connection.provider === 'toast') {
      providerOrder = await submitToastOrder(
        decrypt<ToastCredentials>(connection.encryptedCredentials),
        body
      );
    } else {
      providerOrder = await submitCloverOrder(
        decrypt<CloverCredentials>(connection.encryptedCredentials),
        body
      );
    }

    return ok('order-submit', {
      provider: connection.provider,
      providerOrder
    });
  } catch (error: any) {
    return err(
      'order-submit',
      String(error?.message || 'restaurant POS order submission failed'),
      502
    );
  }
}