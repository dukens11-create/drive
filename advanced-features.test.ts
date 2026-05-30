import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { AddressInfo } from 'node:net';
import { randomUUID } from 'node:crypto';
import { createApp } from './app';

async function withServer(run: (baseUrl: string) => Promise<void>) {
  const { httpServer } = createApp();
  await new Promise<void>(resolve => {
    httpServer.listen(0, '127.0.0.1', () => resolve());
  });
  try {
    const address = httpServer.address() as AddressInfo;
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve, reject) => {
      httpServer.close(err => (err ? reject(err) : resolve()));
    });
  }
}

async function signup(baseUrl: string, role: string = 'rider') {
  const email = `${role}-${randomUUID()}@example.com`;
  const res = await fetch(`${baseUrl}/api/auth/signup`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: 'password123', role }),
  });
  const body = await res.json() as any;
  return { userId: body.user?.id as string, token: body.accessToken as string };
}

async function loginAdmin(baseUrl: string) {
  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'admin@drive.com', password: 'change_me_admin_password' }),
  });
  const body = await res.json() as any;
  return body.accessToken as string;
}

async function get(baseUrl: string, path: string, token?: string) {
  const headers: Record<string, string> = {};
  if (token) headers['authorization'] = 'Bearer ' + token;
  const res = await fetch(baseUrl + path, { headers });
  return { status: res.status, body: await res.json() as any };
}

async function post(baseUrl: string, path: string, data: unknown, token?: string) {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (token) headers['authorization'] = 'Bearer ' + token;
  const res = await fetch(baseUrl + path, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });
  return { status: res.status, body: await res.json() as any };
}

// ─── Scheduled Rides ──────────────────────────────────────────────────────────

test('GET /api/scheduled/health returns ok', async () => {
  await withServer(async baseUrl => {
    const { status, body } = await get(baseUrl, '/api/scheduled/health');
    assert.equal(status, 200);
    assert.equal(body.module, 'scheduled');
  });
});

test('scheduled: book, list, cancel a future ride', async () => {
  await withServer(async baseUrl => {
    const { token } = await signup(baseUrl, 'rider');
    const scheduledAt = new Date(Date.now() + 2 * 3600 * 1000).toISOString();

    const book = await post(baseUrl, '/api/scheduled/book', {
      pickupAddress: '1 Main St', dropoffAddress: '99 Park Ave',
      pickupLat: 40.7, pickupLng: -74.0, dropoffLat: 40.75, dropoffLng: -73.99,
      scheduledAt, rideType: 'standard',
    }, token);
    assert.equal(book.status, 201, JSON.stringify(book.body));
    assert.ok(book.body.id);
    assert.equal(book.body.status, 'scheduled');
    const id = book.body.id as string;

    const list = await get(baseUrl, '/api/scheduled/mine', token);
    assert.equal(list.status, 200);
    assert.ok(Array.isArray(list.body));
    assert.ok(list.body.some((r: any) => r.id === id));

    const cancel = await post(baseUrl, `/api/scheduled/${id}/cancel`, {}, token);
    assert.equal(cancel.status, 200);
    assert.equal(cancel.body.status, 'canceled');
  });
});

// ─── Subscriptions ────────────────────────────────────────────────────────────

test('GET /api/subscriptions/health returns ok', async () => {
  await withServer(async baseUrl => {
    const { status } = await get(baseUrl, '/api/subscriptions/health');
    assert.equal(status, 200);
  });
});

test('GET /api/subscriptions/plans returns seeded plans', async () => {
  await withServer(async baseUrl => {
    const { status, body } = await get(baseUrl, '/api/subscriptions/plans');
    assert.equal(status, 200);
    assert.ok(Array.isArray(body));
    assert.ok(body.length >= 1);
  });
});

test('subscriptions: subscribe, read, cancel lifecycle', async () => {
  await withServer(async baseUrl => {
    const { token } = await signup(baseUrl, 'rider');

    const plans = await get(baseUrl, '/api/subscriptions/plans');
    const planId = plans.body[0].id as string;

    const sub = await post(baseUrl, '/api/subscriptions/subscribe', {
      planId, paymentMethodId: 'pm_test_123',
    }, token);
    assert.equal(sub.status, 201, JSON.stringify(sub.body));
    assert.ok(sub.body.id);
    assert.equal(sub.body.status, 'active');

    const mine = await get(baseUrl, '/api/subscriptions/mine', token);
    assert.equal(mine.status, 200);
    assert.equal(mine.body.id, sub.body.id);

    const cancel = await post(baseUrl, '/api/subscriptions/cancel', {}, token);
    assert.equal(cancel.status, 200);
    assert.equal(cancel.body.status, 'canceled');
  });
});

// ─── Loyalty ──────────────────────────────────────────────────────────────────

test('GET /api/loyalty/health returns ok', async () => {
  await withServer(async baseUrl => {
    const { status } = await get(baseUrl, '/api/loyalty/health');
    assert.equal(status, 200);
  });
});

test('loyalty: get account auto-creates with 0 points', async () => {
  await withServer(async baseUrl => {
    const { token } = await signup(baseUrl, 'rider');

    const mine = await get(baseUrl, '/api/loyalty/mine', token);
    assert.equal(mine.status, 200);
    assert.ok(typeof mine.body.points === 'number');
    assert.ok(mine.body.tier);

    const txns = await get(baseUrl, '/api/loyalty/transactions', token);
    assert.equal(txns.status, 200);
    assert.ok(Array.isArray(txns.body));
  });
});

// ─── Corporate Accounts ───────────────────────────────────────────────────────

test('GET /api/corporate/health returns ok', async () => {
  await withServer(async baseUrl => {
    const { status } = await get(baseUrl, '/api/corporate/health');
    assert.equal(status, 200);
  });
});

test('corporate: create account and list', async () => {
  await withServer(async baseUrl => {
    const adminToken = await loginAdmin(baseUrl);

    const create = await post(baseUrl, '/api/corporate/accounts', {
      companyName: 'Acme Corp', billingEmail: 'billing@acme.com',
      billingAddress: '100 Business Blvd, NY', monthlyBudget: 5000,
      allowedRideTypes: ['standard', 'premium'],
    }, adminToken);
    assert.equal(create.status, 201, JSON.stringify(create.body));
    assert.ok(create.body.id);
    assert.equal(create.body.companyName, 'Acme Corp');

    const list = await get(baseUrl, '/api/corporate/accounts', adminToken);
    assert.equal(list.status, 200);
    assert.ok(Array.isArray(list.body));
    assert.ok(list.body.some((a: any) => a.id === create.body.id));
  });
});

// ─── Carpool ──────────────────────────────────────────────────────────────────

test('GET /api/carpool/health returns ok', async () => {
  await withServer(async baseUrl => {
    const { status } = await get(baseUrl, '/api/carpool/health');
    assert.equal(status, 200);
  });
});

test('carpool: create ride and list available', async () => {
  await withServer(async baseUrl => {
    const { token } = await signup(baseUrl, 'rider');

    const create = await post(baseUrl, '/api/carpool/rides', {
      pickupAddress: '1 Main St', dropoffAddress: '99 Park Ave',
      pickupLat: 40.7, pickupLng: -74.0, dropoffLat: 40.75, dropoffLng: -73.99,
      maxPassengers: 3, scheduledAt: new Date(Date.now() + 3600000).toISOString(),
    }, token);
    assert.equal(create.status, 201, JSON.stringify(create.body));
    assert.ok(create.body.id);
    assert.equal(create.body.maxPassengers, 3);

    const available = await get(baseUrl, '/api/carpool/rides/available', token);
    assert.equal(available.status, 200);
    assert.ok(Array.isArray(available.body));
  });
});

// ─── Fraud Detection ──────────────────────────────────────────────────────────

test('GET /api/fraud/health returns ok', async () => {
  await withServer(async baseUrl => {
    const { status } = await get(baseUrl, '/api/fraud/health');
    assert.equal(status, 200);
  });
});

test('fraud: risk check returns score and riskLevel', async () => {
  await withServer(async baseUrl => {
    const adminToken = await loginAdmin(baseUrl);

    const check = await post(baseUrl, '/api/fraud/check', {
      userId: 'some-user-id', eventType: 'ride_request',
    }, adminToken);
    assert.equal(check.status, 200, JSON.stringify(check.body));
    assert.ok(typeof check.body.score === 'number');
    assert.ok(check.body.riskLevel);

    const alerts = await get(baseUrl, '/api/fraud/alerts', adminToken);
    assert.equal(alerts.status, 200);
    assert.ok(Array.isArray(alerts.body));
  });
});

// ─── Analytics ────────────────────────────────────────────────────────────────

test('GET /api/analytics/health returns ok', async () => {
  await withServer(async baseUrl => {
    const { status } = await get(baseUrl, '/api/analytics/health');
    assert.equal(status, 200);
  });
});

test('analytics: overview, KPIs and churn endpoints return expected fields', async () => {
  await withServer(async baseUrl => {
    const adminToken = await loginAdmin(baseUrl);

    const overview = await get(baseUrl, '/api/analytics/overview', adminToken);
    assert.equal(overview.status, 200);
    assert.ok(typeof overview.body.totalUsers === 'number');
    assert.ok(typeof overview.body.totalRides === 'number');

    const kpis = await get(baseUrl, '/api/analytics/kpis', adminToken);
    assert.equal(kpis.status, 200);
    assert.ok(typeof kpis.body.activeDrivers === 'number');

    const churn = await get(baseUrl, '/api/analytics/churn', adminToken);
    assert.equal(churn.status, 200);
    assert.ok(typeof churn.body.churnRate === 'number');
  });
});

// ─── 2FA ──────────────────────────────────────────────────────────────────────

test('GET /api/2fa/health returns ok', async () => {
  await withServer(async baseUrl => {
    const { status } = await get(baseUrl, '/api/2fa/health');
    assert.equal(status, 200);
  });
});

test('2fa: setup TOTP returns secret and qrCodeUrl', async () => {
  await withServer(async baseUrl => {
    const { token, userId } = await signup(baseUrl, 'rider');

    const setup = await post(baseUrl, '/api/2fa/setup', { userId }, token);
    assert.equal(setup.status, 200, JSON.stringify(setup.body));
    assert.ok(setup.body.secret);
    assert.ok(setup.body.qrCodeUrl);

    const status = await post(baseUrl, '/api/2fa/status', { userId }, token);
    assert.equal(status.status, 200);
    assert.equal(status.body.enabled, false);
  });
});
