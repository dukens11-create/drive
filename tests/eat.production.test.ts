import test from 'node:test';
import assert from 'node:assert/strict';
import { AddressInfo } from 'node:net';
import fs from 'node:fs';
import path from 'node:path';
import { createApp } from '../src/app';

async function withServer(run: (baseUrl: string) => Promise<void>) {
  const { httpServer } = createApp();
  await new Promise<void>(resolve => httpServer.listen(0, resolve));
  const { port } = httpServer.address() as AddressInfo;
  try {
    await run('http://127.0.0.1:' + port);
  } finally {
    await new Promise<void>((resolve, reject) =>
      httpServer.close(error => error ? reject(error) : resolve())
    );
  }
}

async function json(baseUrl: string, route: string, method = 'GET', body?: any, token?: string) {
  const response = await fetch(baseUrl + route, {
    method,
    headers: {
      ...(body ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: 'Bearer ' + token } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  return { status: response.status, body: await response.json() as any };
}

let sequence = 0;
function email(prefix: string) {
  sequence += 1;
  return prefix + '-' + Date.now() + '-' + sequence + '@example.com';
}

test('Eat customer UI is API-driven and no longer demo checkout', () => {
  const js = fs.readFileSync(path.join(process.cwd(), 'public/eat-dashboard.js'), 'utf8');
  const html = fs.readFileSync(path.join(process.cwd(), 'public/eat-dashboard.html'), 'utf8');

  assert.match(js, /\/api\/restaurants\/search/);
  assert.match(js, /\/api\/orders\/food/);
  assert.match(js, /startOrderTracking/);
  assert.equal(js.includes('Checkout flow is ready for the next step.'), false);
  assert.equal(html.includes('add-demo-item'), false);
  assert.equal(html.includes('FlupFlap Burger'), false);
});

test('Eat order API requires a rider and enforces order ownership', async () => {
  await withServer(async baseUrl => {
    const merchant = await json(baseUrl, '/api/restaurants/register', 'POST', {
      email: email('merchant'),
      password: 'Secret123!Drive',
      name: 'Production Kitchen'
    });
    assert.equal(merchant.status, 200);

    const restaurantId = merchant.body.restaurant.id as string;
    const merchantToken = merchant.body.accessToken as string;

    const item = await json(
      baseUrl,
      '/api/restaurants/' + restaurantId + '/menu/items',
      'POST',
      { name: 'Rice Bowl', priceCents: 1400 },
      merchantToken
    );
    assert.equal(item.status, 200);

    const riderA = await json(baseUrl, '/api/auth/signup', 'POST', {
      email: email('rider-a'),
      password: 'Secret123!Drive',
      role: 'rider'
    });
    const riderB = await json(baseUrl, '/api/auth/signup', 'POST', {
      email: email('rider-b'),
      password: 'Secret123!Drive',
      role: 'rider'
    });

    assert.equal(riderA.status, 200);
    assert.equal(riderB.status, 200);

    const unauthenticated = await json(baseUrl, '/api/orders/food', 'POST', {
      restaurantId,
      items: [{ itemId: item.body.item.id, quantity: 1 }]
    });
    assert.equal(unauthenticated.status, 401);

    const created = await json(baseUrl, '/api/orders/food', 'POST', {
      restaurantId,
      userId: riderB.body.user.id,
      items: [{ itemId: item.body.item.id, quantity: 2 }]
    }, riderA.body.accessToken);

    assert.equal(created.status, 200);
    assert.equal(created.body.order.userId, riderA.body.user.id);

    const forbidden = await json(
      baseUrl,
      '/api/orders/food/' + created.body.order.id + '/track',
      'GET',
      undefined,
      riderB.body.accessToken
    );
    assert.equal(forbidden.status, 403);

    const own = await json(
      baseUrl,
      '/api/orders/food/' + created.body.order.id + '/track',
      'GET',
      undefined,
      riderA.body.accessToken
    );
    assert.equal(own.status, 200);
  });
});