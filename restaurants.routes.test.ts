import test from 'node:test';
import assert from 'node:assert/strict';
import { AddressInfo } from 'node:net';
import { createApp } from './src/app';
import { store } from './src/database/data.store';

async function withServer(run: (baseUrl: string) => Promise<void>) {
  const { httpServer } = createApp();
  await new Promise<void>(resolve => httpServer.listen(0, resolve));
  const { port } = httpServer.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${port}`;
  try {
    await run(baseUrl);
  } finally {
    await new Promise<void>((resolve, reject) => httpServer.close(error => (error ? reject(error) : resolve())));
  }
}

async function json(baseUrl: string, path: string, method: string = 'GET', body?: unknown, token?: string) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(body ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: 'Bearer ' + token } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  return { status: response.status, body: await response.json() as any };
}

let seq = 0;
function email(prefix: string) {
  seq += 1;
  return `${prefix}-${Date.now()}-${seq}@example.com`;
}

test('restaurant auth + menu + food-order flow works', async () => {
  await withServer(async baseUrl => {
    const register = await json(baseUrl, '/api/restaurants/register', 'POST', {
      email: email('merchant'),
      password: 'Secret123!',
      name: 'Nile Bites'
    });

    assert.equal(register.status, 200);
    assert.equal(register.body.ok, true);

    const merchantToken = register.body.accessToken as string;
    const restaurantId = register.body.restaurant.id as string;

    const verifyStatus = await json(baseUrl, '/api/restaurants/verify-status', 'GET', undefined, merchantToken);
    assert.equal(verifyStatus.status, 200);
    assert.equal(verifyStatus.body.restaurantId, restaurantId);

    const category = await json(baseUrl, `/api/restaurants/${restaurantId}/menu/categories`, 'POST', { name: 'Mains' }, merchantToken);
    assert.equal(category.status, 200);

    const item = await json(baseUrl, `/api/restaurants/${restaurantId}/menu/items`, 'POST', {
      name: 'Jollof Rice',
      priceCents: 1200,
      categoryId: category.body.category.id
    }, merchantToken);
    assert.equal(item.status, 200);

    const riderSignup = await json(baseUrl, '/api/auth/signup', 'POST', {
      email: email('rider'),
      password: 'Secret123!',
      role: 'rider'
    });
    assert.equal(riderSignup.status, 200);
    const riderId = riderSignup.body.user.id as string;

    const order = await json(baseUrl, '/api/orders/food', 'POST', {
      restaurantId,
      userId: riderId,
      items: [{ itemId: item.body.item.id, quantity: 2 }]
    });
    assert.equal(order.status, 200);
    assert.equal(order.body.order.status, 'pending');

    const accept = await json(baseUrl, `/api/restaurants/${restaurantId}/orders/${order.body.order.id}/accept`, 'POST', {}, merchantToken);
    assert.equal(accept.status, 200);
    assert.equal(accept.body.order.status, 'accepted');

    const track = await json(baseUrl, `/api/orders/food/${order.body.order.id}/track`);
    assert.equal(track.status, 200);
    assert.equal(track.body.status, 'accepted');
  });
});

test('restaurant search/discovery endpoints return created restaurant', async () => {
  await withServer(async baseUrl => {
    const register = await json(baseUrl, '/api/restaurants/register', 'POST', {
      email: email('merchant-search'),
      password: 'Secret123!',
      name: 'Lagos Kitchen'
    });
    assert.equal(register.status, 200);

    const token = register.body.accessToken as string;
    const restaurantId = register.body.restaurant.id as string;

    const update = await json(baseUrl, `/api/restaurants/${restaurantId}`, 'PUT', {
      cuisine: 'Nigerian',
      city: 'Lagos',
      featured: true,
      location: { lat: 6.45, lng: 3.39 }
    }, token);
    assert.equal(update.status, 200);

    const search = await json(baseUrl, '/api/restaurants/search?q=lagos');
    assert.equal(search.status, 200);
    assert.ok(search.body.restaurants.some((entry: any) => entry.id === restaurantId));

    const byCuisine = await json(baseUrl, '/api/restaurants/by-cuisine/Nigerian');
    assert.equal(byCuisine.status, 200);
    assert.ok(byCuisine.body.restaurants.some((entry: any) => entry.id === restaurantId));

    const nearby = await json(baseUrl, '/api/restaurants/nearby?lat=6.5&lng=3.4');
    assert.equal(nearby.status, 200);
    assert.ok(nearby.body.restaurants.some((entry: any) => entry.id === restaurantId));
  });
});

test('admin restaurant endpoints require admin and can verify restaurant', async () => {
  await withServer(async baseUrl => {
    const register = await json(baseUrl, '/api/restaurants/register', 'POST', {
      email: email('merchant-admin'),
      password: 'Secret123!',
      name: 'Abuja Grill'
    });
    assert.equal(register.status, 200);
    const restaurantId = register.body.restaurant.id as string;

    const adminEmail = email('admin');
    const adminSignup = await json(baseUrl, '/api/auth/signup', 'POST', {
      email: adminEmail,
      password: 'Secret123!'
    });
    assert.equal(adminSignup.status, 200);
    const adminId = adminSignup.body.user.id as string;
    const adminRecord = store.users.get(adminId);
    assert.ok(adminRecord);
    adminRecord!.role = 'admin';
    const adminLogin = await json(baseUrl, '/api/auth/login', 'POST', { email: adminEmail, password: 'Secret123!' });
    assert.equal(adminLogin.status, 200);
    const adminToken = adminLogin.body.accessToken as string;

    const forbidden = await json(baseUrl, '/api/admin/restaurants', 'GET');
    assert.equal(forbidden.status, 401);

    const list = await json(baseUrl, '/api/admin/restaurants', 'GET', undefined, adminToken);
    assert.equal(list.status, 200);
    assert.ok(list.body.restaurants.some((entry: any) => entry.id === restaurantId));

    const verify = await json(baseUrl, `/api/admin/restaurants/${restaurantId}/verify`, 'POST', {}, adminToken);
    assert.equal(verify.status, 200);
    assert.equal(verify.body.restaurant.verificationStatus, 'verified');
  });
});
