import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import { test } from 'node:test';
import { createApp } from '../src/app';
import { makeId, store, timestamp } from '../src/database/data.store';
import { emailTemplates } from '../src/utils/email-templates';

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

async function signup(baseUrl: string, role: 'rider' | 'driver') {
  const response = await fetch(`${baseUrl}/api/auth/signup`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: `${role}-${randomUUID()}@example.com`,
      password: 'Password123!',
      role
    })
  });
  assert.equal(response.status, 200);
  return response.json() as Promise<{ user: { id: string }; accessToken: string }>;
}

async function get(baseUrl: string, path: string, token: string) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { authorization: 'Bearer ' + token }
  });
  return { status: response.status, body: await response.json() as any };
}

async function post(baseUrl: string, path: string, token: string, body: Record<string, unknown>) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      authorization: 'Bearer ' + token,
      'content-type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  return { status: response.status, body: await response.json() as any };
}

async function del(baseUrl: string, path: string, token: string) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'DELETE',
    headers: { authorization: 'Bearer ' + token }
  });
  return { status: response.status, body: await response.json() as any };
}

test('search endpoints support filtering, saved searches, and branded email templates', async () => {
  await withServer(async baseUrl => {
    const rider = await signup(baseUrl, 'rider');
    const driver = await signup(baseUrl, 'driver');

    const driverProfile = store.drivers.get(driver.user.id)!;
    driverProfile.status = 'approved';
    driverProfile.rating = 4.9;
    driverProfile.earningsCents = 185000;
    driverProfile.available = true;
    driverProfile.lastLocationUpdatedAt = timestamp();

    const vehicleId = makeId('vehicle');
    driverProfile.primaryVehicleId = vehicleId;
    store.vehicles.set(vehicleId, {
      vehicleId,
      driverId: driver.user.id,
      make: 'Toyota',
      model: 'Camry',
      year: 2024,
      licensePlate: `DRV-${randomUUID().slice(0, 6)}`,
      color: 'Blue',
      seats: 4,
      vehicleType: 'comfort',
      insuranceExpiry: '2030-12-31',
      registrationExpiry: '2030-12-31',
      status: 'active',
      verificationDocuments: [],
      createdAt: timestamp()
    });
    store.drivers.set(driver.user.id, driverProfile);

    const rideId = makeId('ride');
    store.rides.set(rideId, {
      id: rideId,
      riderId: rider.user.id,
      driverId: driver.user.id,
      pickupLat: 40.7,
      pickupLng: -74,
      pickupAddress: '123 Main Street, Midtown',
      dropoffLat: 40.8,
      dropoffLng: -73.95,
      dropoffAddress: '500 Park Avenue, Uptown',
      miles: 8,
      minutes: 18,
      fareEstimate: 15.5,
      vehicleType: 'comfort',
      status: 'completed',
      rating: 5,
      createdAt: timestamp(),
      updatedAt: timestamp(),
      completedAt: timestamp(),
      fareDetails: {
        currency: 'USD',
        baseFare: 5,
        distanceFare: 6,
        timeFare: 2,
        meterFare: 0,
        surgeMultiplier: 1,
        surgeFare: 13,
        serviceFeePercent: 0.12,
        serviceFee: 1,
        taxes: 1.5,
        tolls: 0,
        discounts: 0,
        tips: 0,
        subtotal: 14.5,
        total: 15.5,
        driverEarnings: 12
      }
    });

    const driversSearch = await get(baseUrl, '/api/search/drivers?vehicleType=comfort&minRating=4.5&sort=rating', rider.accessToken);
    assert.equal(driversSearch.status, 200);
    assert.equal(driversSearch.body.total >= 1, true);
    assert.equal(driversSearch.body.drivers[0].vehicleType, 'comfort');

    const ridesSearch = await get(baseUrl, '/api/search/rides?status=completed&minFare=1000&q=main&sort=price', rider.accessToken);
    assert.equal(ridesSearch.status, 200);
    assert.equal(ridesSearch.body.total >= 1, true);
    assert.equal(ridesSearch.body.rides[0].pickupAddress, '123 Main Street, Midtown');

    const saved = await post(baseUrl, '/api/search/saved', rider.accessToken, {
      name: 'Top comfort drivers',
      resource: 'drivers',
      filters: { vehicleType: 'comfort', minRating: '4.5' }
    });
    assert.equal(saved.status, 200);
    assert.equal(saved.body.savedSearch.name, 'Top comfort drivers');

    const recent = await get(baseUrl, '/api/search/recent', rider.accessToken);
    assert.equal(recent.status, 200);
    assert.equal(recent.body.recent.length >= 2, true);
    assert.equal(recent.body.saved.some((entry: any) => entry.name === 'Top comfort drivers'), true);

    const confirmation = emailTemplates.RIDE_CONFIRMATION({
      riderName: 'Alex',
      driverName: 'Jordan',
      fareEstimate: 1599,
      trackingLink: 'https://app.drive.com/rides/demo'
    });
    assert.match(confirmation.html, /Manage notification preferences or unsubscribe/);
    assert.match(confirmation.html, /Ride confirmed/);

    const report = emailTemplates.ADMIN_DAILY_REPORT({ reportDate: '2026-06-07', revenue: 250000 });
    assert.match(report.subject, /Daily platform report/);
    assert.match(report.html, /Daily operations report/);
  });
});

test('notifications hub supports category filters, read state, unread counters, and 30-day cleanup', async () => {
  await withServer(async baseUrl => {
    const rider = await signup(baseUrl, 'rider');
    const now = Date.now();
    const staleId = makeId('notif');
    const unreadId = makeId('notif');
    const supportId = makeId('notif');

    store.notificationLogs.push({
      id: staleId,
      userId: rider.user.id,
      channel: 'push',
      recipient: 'device-token-1',
      template: 'ride_completed',
      status: 'sent',
      provider: 'fcm',
      createdAt: new Date(now - (31 * 24 * 60 * 60 * 1000)).toISOString()
    });
    store.notificationLogs.push({
      id: unreadId,
      userId: rider.user.id,
      channel: 'email',
      recipient: 'rider@example.com',
      template: 'payment_receipt',
      status: 'sent',
      provider: 'sendgrid',
      createdAt: timestamp()
    });
    store.notificationLogs.push({
      id: supportId,
      userId: rider.user.id,
      channel: 'push',
      recipient: 'device-token-2',
      template: 'support_reply',
      status: 'sent',
      provider: 'fcm',
      readAt: timestamp(),
      createdAt: timestamp()
    });

    const hub = await get(baseUrl, '/api/notifications/hub?category=rides&limit=20', rider.accessToken);
    assert.equal(hub.status, 200);
    assert.equal(hub.body.notifications.some((entry: any) => entry.id === staleId), true);
    assert.equal(hub.body.notifications.every((entry: any) => entry.category === 'rides'), true);

    const unreadCount = await get(baseUrl, '/api/notifications/unread-count', rider.accessToken);
    assert.equal(unreadCount.status, 200);
    assert.equal(unreadCount.body.unreadCount >= 2, true);

    const markRead = await post(baseUrl, `/api/notifications/${unreadId}/read`, rider.accessToken, {});
    assert.equal(markRead.status, 200);
    assert.ok(markRead.body.notification.readAt);

    const readAll = await post(baseUrl, '/api/notifications/read-all', rider.accessToken, {});
    assert.equal(readAll.status, 200);
    assert.equal(readAll.body.updatedCount >= 1, true);

    const cleanup = await del(baseUrl, '/api/notifications/delete-all', rider.accessToken);
    assert.equal(cleanup.status, 200);
    assert.equal(cleanup.body.deletedCount, 1);

    const refreshedHub = await get(baseUrl, '/api/notifications/hub?limit=20', rider.accessToken);
    assert.equal(refreshedHub.status, 200);
    assert.equal(refreshedHub.body.notifications.some((entry: any) => entry.id === staleId), false);
  });
});
