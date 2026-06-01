import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { AddressInfo } from 'node:net';
import { randomUUID } from 'node:crypto';
import { createApp } from '../src/app';

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
    body: JSON.stringify({ email, password: 'Password123!', role }),
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

async function patch(baseUrl: string, path: string, data: unknown, token?: string) {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (token) headers['authorization'] = 'Bearer ' + token;
  const res = await fetch(baseUrl + path, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(data),
  });
  return { status: res.status, body: await res.json() as any };
}

async function del(baseUrl: string, path: string, token?: string) {
  const headers: Record<string, string> = {};
  if (token) headers['authorization'] = 'Bearer ' + token;
  const res = await fetch(baseUrl + path, {
    method: 'DELETE',
    headers,
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

// ─── Chat / Messaging ─────────────────────────────────────────────────────────

test('GET /api/chat/health returns ok', async () => {
  await withServer(async baseUrl => {
    const { status, body } = await get(baseUrl, '/api/chat/health');
    assert.equal(status, 200);
    assert.equal(body.module, 'chat');
    assert.equal(body.realtime, true);
  });
});

test('chat: create conversation, send/edit/react/read/search/delete message', async () => {
  await withServer(async baseUrl => {
    const rider = await signup(baseUrl, 'rider');
    const driver = await signup(baseUrl, 'driver');

    const conversation = await post(baseUrl, '/api/chat/conversations', {
      participantIds: [driver.userId],
      type: 'direct',
    }, rider.token);
    assert.equal(conversation.status, 201, JSON.stringify(conversation.body));
    assert.ok(conversation.body.id);

    const sent = await post(baseUrl, `/api/chat/conversations/${conversation.body.id}/messages`, {
      content: 'Driver is on the way',
    }, rider.token);
    assert.equal(sent.status, 201, JSON.stringify(sent.body));
    assert.equal(sent.body.content, 'Driver is on the way');

    const edited = await patch(baseUrl, `/api/chat/messages/${sent.body.id}`, {
      content: 'Driver is arriving now',
    }, rider.token);
    assert.equal(edited.status, 200);
    assert.equal(edited.body.content, 'Driver is arriving now');
    assert.ok(edited.body.editedAt);

    const reacted = await post(baseUrl, `/api/chat/messages/${sent.body.id}/reactions`, {
      emoji: '👍',
    }, driver.token);
    assert.equal(reacted.status, 200);
    assert.equal(reacted.body.reactions[0].emoji, '👍');

    const messages = await get(baseUrl, `/api/chat/conversations/${conversation.body.id}/messages`, driver.token);
    assert.equal(messages.status, 200);
    assert.ok(Array.isArray(messages.body.messages));
    assert.equal(messages.body.messages.length, 1);

    const read = await post(baseUrl, `/api/chat/conversations/${conversation.body.id}/read`, {}, driver.token);
    assert.equal(read.status, 200);
    assert.equal(read.body.updatedCount, 1);

    const search = await get(baseUrl, '/api/chat/search?q=arriving', driver.token);
    assert.equal(search.status, 200);
    assert.equal(search.body.total, 1);

    const deleted = await del(baseUrl, `/api/chat/messages/${sent.body.id}`, rider.token);
    assert.equal(deleted.status, 200);
    assert.ok(deleted.body.deletedAt);
  });
});

test('chat: voice note message with transcription', async () => {
  await withServer(async baseUrl => {
    const rider = await signup(baseUrl, 'rider');
    const driver = await signup(baseUrl, 'driver');

    const conversation = await post(baseUrl, '/api/chat/conversations', {
      participantIds: [driver.userId],
      type: 'direct',
    }, rider.token);
    assert.equal(conversation.status, 201);

    const voiceNote = await post(baseUrl, `/api/chat/conversations/${conversation.body.id}/messages`, {
      voiceNoteUrl: 'https://example.com/audio/voice-note-001.m4a',
      voiceNoteDurationSecs: 12,
      transcription: 'I am on my way to pick you up',
    }, rider.token);
    assert.equal(voiceNote.status, 201, JSON.stringify(voiceNote.body));
    assert.equal(voiceNote.body.voiceNoteUrl, 'https://example.com/audio/voice-note-001.m4a');
    assert.equal(voiceNote.body.voiceNoteDurationSecs, 12);
    assert.equal(voiceNote.body.transcription, 'I am on my way to pick you up');
  });
});

test('chat: translate a message to multiple locales', async () => {
  await withServer(async baseUrl => {
    const rider = await signup(baseUrl, 'rider');
    const driver = await signup(baseUrl, 'driver');

    const conversation = await post(baseUrl, '/api/chat/conversations', {
      participantIds: [driver.userId],
      type: 'direct',
    }, rider.token);
    assert.equal(conversation.status, 201);

    const sent = await post(baseUrl, `/api/chat/conversations/${conversation.body.id}/messages`, {
      content: 'I have arrived',
    }, rider.token);
    assert.equal(sent.status, 201);

    const translated = await post(baseUrl, `/api/chat/messages/${sent.body.id}/translate`, {
      targetLocale: 'es',
    }, driver.token);
    assert.equal(translated.status, 200, JSON.stringify(translated.body));
    assert.equal(translated.body.targetLocale, 'es');
    assert.ok(typeof translated.body.translatedContent === 'string');

    const translatedFr = await post(baseUrl, `/api/chat/messages/${sent.body.id}/translate`, {
      targetLocale: 'fr',
    }, driver.token);
    assert.equal(translatedFr.status, 200);
    assert.equal(translatedFr.body.targetLocale, 'fr');

    const badLocale = await post(baseUrl, `/api/chat/messages/${sent.body.id}/translate`, {
      targetLocale: 'xx-INVALID',
    }, driver.token);
    assert.equal(badLocale.status, 400);
  });
});

test('chat: quick reply templates CRUD', async () => {
  await withServer(async baseUrl => {
    const driver = await signup(baseUrl, 'driver');

    const list = await get(baseUrl, '/api/chat/quick-replies', driver.token);
    assert.equal(list.status, 200, JSON.stringify(list.body));
    assert.ok(Array.isArray(list.body));

    const created = await post(baseUrl, '/api/chat/quick-replies', {
      label: 'On my way',
      content: 'I am on my way to pick you up.',
    }, driver.token);
    assert.equal(created.status, 201, JSON.stringify(created.body));
    assert.equal(created.body.label, 'On my way');
    assert.equal(created.body.content, 'I am on my way to pick you up.');
    assert.ok(created.body.id);

    const listAfter = await get(baseUrl, '/api/chat/quick-replies', driver.token);
    assert.equal(listAfter.status, 200);
    assert.equal(listAfter.body.length, 1);

    const deleted = await del(baseUrl, `/api/chat/quick-replies/${created.body.id}`, driver.token);
    assert.equal(deleted.status, 200);
    assert.equal(deleted.body.ok, true);

    const listFinal = await get(baseUrl, '/api/chat/quick-replies', driver.token);
    assert.equal(listFinal.body.length, 0);
  });
});

test('chat: call session initiate, get, and update status', async () => {
  await withServer(async baseUrl => {
    const driver = await signup(baseUrl, 'driver');
    const rider = await signup(baseUrl, 'rider');

    const call = await post(baseUrl, '/api/chat/calls', {
      calleeId: rider.userId,
      callType: 'voip',
    }, driver.token);
    assert.equal(call.status, 201, JSON.stringify(call.body));
    assert.equal(call.body.callerId, driver.userId);
    assert.equal(call.body.calleeId, rider.userId);
    assert.equal(call.body.status, 'ringing');
    assert.equal(call.body.callType, 'voip');
    assert.ok(call.body.id);

    const fetched = await get(baseUrl, `/api/chat/calls/${call.body.id}`, rider.token);
    assert.equal(fetched.status, 200);
    assert.equal(fetched.body.id, call.body.id);

    const answered = await post(baseUrl, `/api/chat/calls/${call.body.id}/status`, {
      status: 'active',
    }, rider.token);
    assert.equal(answered.status, 200);
    assert.equal(answered.body.status, 'active');
    assert.ok(answered.body.startedAt);

    const ended = await post(baseUrl, `/api/chat/calls/${call.body.id}/status`, {
      status: 'ended',
    }, driver.token);
    assert.equal(ended.status, 200);
    assert.equal(ended.body.status, 'ended');
    assert.ok(ended.body.endedAt);
    assert.ok(typeof ended.body.durationSecs === 'number');
  });
});

test('chat: call to unknown callee returns 404', async () => {
  await withServer(async baseUrl => {
    const driver = await signup(baseUrl, 'driver');
    const res = await post(baseUrl, '/api/chat/calls', {
      calleeId: 'nonexistent-user-id',
      callType: 'voip',
    }, driver.token);
    assert.equal(res.status, 404);
  });
});

// ─── Notifications ────────────────────────────────────────────────────────────

test('GET /api/notifications/health returns ok', async () => {
  await withServer(async baseUrl => {
    const { status } = await get(baseUrl, '/api/notifications/health');
    assert.equal(status, 200);
  });
});

test('notifications: preferences, device tokens, push/email/sms, and logs work', async () => {
  await withServer(async baseUrl => {
    const rider = await signup(baseUrl, 'rider');

    const prefs = await post(baseUrl, '/api/notifications/preferences', {
      pushOptIn: true,
      frequency: 'daily',
      categories: ['rides', 'promotions'],
      timezone: 'America/New_York',
    }, rider.token);
    assert.equal(prefs.status, 200);
    assert.equal(prefs.body.frequency, 'daily');

    const token = await post(baseUrl, '/api/notifications/device-tokens', {
      token: 'device-token-123',
      platform: 'ios',
      topics: ['rides'],
    }, rider.token);
    assert.equal(token.status, 200);
    assert.equal(token.body.token, 'device-token-123');

    const push = await post(baseUrl, '/api/notifications/push', {
      userId: rider.userId,
      title: 'Ride accepted',
      body: 'Your driver is heading to pickup.',
    }, rider.token);
    assert.equal(push.status, 200, JSON.stringify(push.body));
    assert.equal(push.body.delivered, 1);

    const email = await post(baseUrl, '/api/notifications/email', {
      userId: rider.userId,
      subject: 'Welcome to Drive',
      html: '<p>Hello there</p>',
    }, rider.token);
    assert.equal(email.status, 200);

    const sms = await post(baseUrl, '/api/notifications/sms', {
      phone: '+15555550123',
      message: 'Your order is ready for pickup.',
    }, rider.token);
    assert.equal(sms.status, 200);

    const logs = await get(baseUrl, '/api/notifications/logs', rider.token);
    assert.equal(logs.status, 200);
    assert.ok(Array.isArray(logs.body));
    assert.ok(logs.body.length >= 3);
  });
});

// ─── Machine Learning ─────────────────────────────────────────────────────────

test('GET /api/ml/health returns ok', async () => {
  await withServer(async baseUrl => {
    const { status } = await get(baseUrl, '/api/ml/health');
    assert.equal(status, 200);
  });
});

test('ml: surge, demand, churn, and recommendations endpoints return predictions', async () => {
  await withServer(async baseUrl => {
    const rider = await signup(baseUrl, 'rider');
    const adminToken = await loginAdmin(baseUrl);

    const surge = await post(baseUrl, '/api/ml/surge/predict', {
      demand: 18,
      availableDrivers: 4,
      weatherSeverity: 0.5,
      specialEvent: true,
      area: 'downtown',
    }, rider.token);
    assert.equal(surge.status, 200, JSON.stringify(surge.body));
    assert.ok(surge.body.multiplier >= 1);
    assert.ok(surge.body.confidence >= 0.55);

    const apply = await post(baseUrl, '/api/ml/surge/apply', {
      multiplier: 2.1,
      reason: 'Concert traffic',
    }, adminToken);
    assert.equal(apply.status, 200);
    assert.equal(apply.body.surgeConfig.multiplier, 2.1);

    const demand = await post(baseUrl, '/api/ml/demand/predict', {
      area: 'downtown',
      horizonHours: 2,
    }, rider.token);
    assert.equal(demand.status, 200);
    assert.ok(typeof demand.body.predictedDemand === 'number');
    assert.ok(typeof demand.body.confidenceInterval.low === 'number');

    const churn = await post(baseUrl, '/api/ml/churn/predict', {
      userId: rider.userId,
      windowDays: 30,
    }, rider.token);
    assert.equal(churn.status, 200);
    assert.ok(typeof churn.body.churnProbability === 'number');

    const recommendations = await get(baseUrl, '/api/ml/recommendations', rider.token);
    assert.equal(recommendations.status, 200);
    assert.ok(Array.isArray(recommendations.body.rideRecommendations));
    assert.ok(Array.isArray(recommendations.body.restaurantRecommendations));
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
