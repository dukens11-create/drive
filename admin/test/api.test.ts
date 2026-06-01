import test from 'node:test';
import assert from 'node:assert/strict';

import { adminApi, decodeToken, loginAdmin } from '../lib/api';

function createToken(payload: Record<string, unknown>) {
  return `header.${Buffer.from(JSON.stringify(payload)).toString('base64')}.signature`;
}

test('decodeToken returns the expected session user payload', () => {
  const user = decodeToken(createToken({
    sub: 'admin-1',
    email: 'admin@example.com',
    phone: '+14155550100',
    role: 'admin'
  }));

  assert.deepEqual(user, {
    id: 'admin-1',
    email: 'admin@example.com',
    phone: '+14155550100',
    role: 'admin'
  });
});

test('loginAdmin rejects non-admin accounts even when authentication succeeds', async () => {
  const accessToken = createToken({
    sub: 'rider-1',
    email: 'rider@example.com',
    role: 'rider'
  });

  globalThis.fetch = async () => new Response(JSON.stringify({
    accessToken,
    user: {
      id: 'rider-1',
      email: 'rider@example.com',
      role: 'rider'
    }
  }), {
    status: 200,
    headers: {
      'content-type': 'application/json'
    }
  });

  await assert.rejects(() => loginAdmin('rider@example.com', 'password123'), {
    message: 'This account does not have admin access'
  });
});

test('adminApi retries retryable failures before returning a successful response', async () => {
  let attempts = 0;
  const fixedTimestamp = '2025-01-01T00:00:00.000Z';

  globalThis.fetch = async () => {
    attempts += 1;

    if (attempts < 3) {
      return new Response(JSON.stringify({ error: 'temporary outage' }), {
        status: 503,
        headers: {
          'content-type': 'application/json'
        }
      });
    }

    return new Response(JSON.stringify({
      ok: true,
      stats: {
        totalUsers: 0,
        riders: 0,
        drivers: 0,
        merchants: 0,
        totalRides: 0,
        activeRides: 0,
        completedRides: 0,
        totalPayments: 0,
        totalRevenueCents: 0,
        openTickets: 0,
        openIncidents: 0,
        pendingDrivers: 0
      },
      realtime: {
        activeDrivers: 0,
        activeRides: 0,
        highPriorityIncidents: 0,
        newTickets: 0
      },
      settings: {
        maintenanceMode: false,
        appVersion: '1.0.0',
        commissionRatePercent: 20,
        surgeMultiplier: 1,
        featureFlags: [],
        updatedAt: fixedTimestamp
      },
      drivers: [],
      riders: [],
      users: [],
      rides: [],
      tickets: [],
      incidents: [],
      payments: [],
      refunds: [],
      walletLedger: [],
      walletBalances: [],
      promos: [],
      markets: [],
      referralEvents: [],
      apiKeys: [],
      auditLogs: [],
      analytics: {
        revenueByDay: [],
        revenueByWeek: [],
        revenueByMonth: [],
        tripVolumeByDay: [],
        userGrowthByDay: [],
        driverLeaderboard: [],
        riderLeaderboard: [],
        support: { open: 0, pending: 0, resolved: 0, avgResolutionHours: 0, satisfactionScore: 0 },
        safety: { open: 0, underReview: 0, resolved: 0, dismissed: 0 },
        finance: { capturedRevenueCents: 0, pendingSettlementCents: 0, refundedCents: 0, walletExposureCents: 0 }
      }
    }), {
      status: 200,
      headers: {
        'content-type': 'application/json'
      }
    });
  };

  const response = await adminApi.fetchOverview('admin-token');

  assert.equal(attempts, 3);
  assert.equal(response.ok, true);
});

test('adminApi.approveDriver sends review notes and checklist payload', async () => {
  let requestBody = '';

  globalThis.fetch = async (_input, init) => {
    requestBody = String(init?.body || '');
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: {
        'content-type': 'application/json'
      }
    });
  };

  await adminApi.approveDriver('admin-token', 'driver-1', true, 'Approved after review', ['License scan reviewed', 'Selfie verification matched']);

  assert.match(requestBody, /"userId":"driver-1"/);
  assert.match(requestBody, /"notes":"Approved after review"/);
  assert.match(requestBody, /"checklist":\["License scan reviewed","Selfie verification matched"\]/);
});
