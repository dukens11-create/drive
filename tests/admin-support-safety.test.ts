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

async function signupAndLogin(baseUrl: string, role: string = 'rider') {
  const email = `${role}-${randomUUID()}@example.com`;
  const res = await fetch(`${baseUrl}/api/auth/signup`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: 'password123', role })
  });
  const body = await res.json() as any;
  return { userId: body.user?.id, token: body.accessToken as string };
}

async function loginAdmin(baseUrl: string) {
  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'admin@drive.com', password: 'change_me_admin_password' })
  });
  const body = await res.json() as any;
  return body.accessToken as string;
}

// ─── Admin tests ─────────────────────────────────────────────────────────────

test('GET /api/admin/health returns ok', async () => {
  await withServer(async baseUrl => {
    const res = await fetch(`${baseUrl}/api/admin/health`);
    assert.equal(res.status, 200);
    const body = await res.json() as any;
    assert.equal(body.module, 'admin');
    assert.equal(body.ok, true);
  });
});

test('GET /api/admin/stats requires admin token', async () => {
  await withServer(async baseUrl => {
    const { token } = await signupAndLogin(baseUrl, 'rider');
    const res = await fetch(`${baseUrl}/api/admin/stats`, {
      headers: { authorization: `Bearer ${token}` }
    });
    assert.equal(res.status, 403);
  });
});

test('GET /api/admin/stats returns platform statistics', async () => {
  await withServer(async baseUrl => {
    const adminToken = await loginAdmin(baseUrl);
    const res = await fetch(`${baseUrl}/api/admin/stats`, {
      headers: { authorization: `Bearer ${adminToken}` }
    });
    assert.equal(res.status, 200);
    const body = await res.json() as any;
    assert.equal(body.ok, true);
    assert.equal(body.action, 'platform-stats');
    assert.ok(typeof body.stats.totalUsers === 'number');
    assert.ok(typeof body.stats.totalRides === 'number');
    assert.ok(typeof body.stats.openTickets === 'number');
    assert.ok(typeof body.stats.openIncidents === 'number');
  });
});

test('GET /api/admin/overview returns operations snapshot', async () => {
  await withServer(async baseUrl => {
    const adminToken = await loginAdmin(baseUrl);
    const { userId, token } = await signupAndLogin(baseUrl, 'rider');
    await fetch(`${baseUrl}/api/support/create-ticket`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer ' + token },
      body: JSON.stringify({ userId, type: 'general', message: 'Need help' })
    });

    const res = await fetch(`${baseUrl}/api/admin/overview`, {
      headers: { authorization: 'Bearer ' + adminToken }
    });
    assert.equal(res.status, 200);
    const body = await res.json() as any;
    assert.equal(body.ok, true);
    assert.equal(body.action, 'overview');
    assert.ok(Array.isArray(body.drivers));
    assert.ok(Array.isArray(body.users));
    assert.ok(Array.isArray(body.tickets));
    assert.ok(Array.isArray(body.analytics.revenueByDay));
    assert.ok(typeof body.settings.commissionRatePercent === 'number');
  });
});

test('POST /api/admin/list-users returns user list', async () => {
  await withServer(async baseUrl => {
    const adminToken = await loginAdmin(baseUrl);
    await signupAndLogin(baseUrl, 'rider');
    const res = await fetch(`${baseUrl}/api/admin/list-users`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ role: 'rider' })
    });
    assert.equal(res.status, 200);
    const body = await res.json() as any;
    assert.equal(body.ok, true);
    assert.ok(Array.isArray(body.users));
    // Passwords must not be returned
    for (const user of body.users) {
      assert.equal(user.password, undefined);
    }
  });
});

test('POST /api/admin/update-settings and create-api-key manage admin configuration', async () => {
  await withServer(async baseUrl => {
    const adminToken = await loginAdmin(baseUrl);

    const updateRes = await fetch(`${baseUrl}/api/admin/update-settings`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer ' + adminToken },
      body: JSON.stringify({
        maintenanceMode: true,
        commissionRatePercent: 18,
        surgeMultiplier: 1.75,
        featureFlags: [{ key: 'walletOps', label: 'Wallet operations', enabled: false }]
      })
    });
    assert.equal(updateRes.status, 200);
    const updateBody = await updateRes.json() as any;
    assert.equal(updateBody.ok, true);
    assert.equal(updateBody.settings.maintenanceMode, true);
    assert.equal(updateBody.settings.commissionRatePercent, 18);
    assert.equal(updateBody.settings.surgeMultiplier, 1.75);
    assert.equal(updateBody.settings.featureFlags[0].enabled, false);

    const createKeyRes = await fetch(`${baseUrl}/api/admin/create-api-key`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer ' + adminToken },
      body: JSON.stringify({ name: 'reporting-service' })
    });
    assert.equal(createKeyRes.status, 200);
    const createKeyBody = await createKeyRes.json() as any;
    assert.equal(createKeyBody.ok, true);
    assert.ok(createKeyBody.plainTextKey.startsWith('drv_admin_'));
    assert.equal(typeof createKeyBody.apiKey.keyPreview, 'string');
    assert.equal(createKeyBody.apiKey.keyHash, undefined);

    const revokeRes = await fetch(`${baseUrl}/api/admin/revoke-api-key`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer ' + adminToken },
      body: JSON.stringify({ apiKeyId: createKeyBody.apiKey.id })
    });
    assert.equal(revokeRes.status, 200);
    const revokeBody = await revokeRes.json() as any;
    assert.equal(revokeBody.ok, true);
    assert.ok(revokeBody.apiKey.revokedAt);
  });
});

test('POST /api/admin/suspend-user suspends and unsuspends a user', async () => {
  await withServer(async baseUrl => {
    const adminToken = await loginAdmin(baseUrl);
    const { userId } = await signupAndLogin(baseUrl, 'rider');

    // Suspend
    const suspendRes = await fetch(`${baseUrl}/api/admin/suspend-user`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ userId, suspend: true })
    });
    assert.equal(suspendRes.status, 200);
    const suspendBody = await suspendRes.json() as any;
    assert.equal(suspendBody.ok, true);
    assert.equal(suspendBody.suspended, true);

    // Unsuspend
    const unsuspendRes = await fetch(`${baseUrl}/api/admin/suspend-user`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ userId, suspend: false })
    });
    const unsuspendBody = await unsuspendRes.json() as any;
    assert.equal(unsuspendBody.suspended, false);
  });
});

test('POST /api/admin/suspend-user returns error for unknown user', async () => {
  await withServer(async baseUrl => {
    const adminToken = await loginAdmin(baseUrl);
    const res = await fetch(`${baseUrl}/api/admin/suspend-user`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ userId: 'nonexistent_user', suspend: true })
    });
    assert.equal(res.status, 200);
    const body = await res.json() as any;
    assert.equal(body.error, 'user not found');
  });
});

test('GET /api/admin/audit-log returns audit entries', async () => {
  await withServer(async baseUrl => {
    const adminToken = await loginAdmin(baseUrl);
    const { userId } = await signupAndLogin(baseUrl, 'rider');

    // Generate an audit event
    await fetch(`${baseUrl}/api/admin/suspend-user`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ userId, suspend: true })
    });

    const res = await fetch(`${baseUrl}/api/admin/audit-log`, {
      headers: { authorization: `Bearer ${adminToken}` }
    });
    assert.equal(res.status, 200);
    const body = await res.json() as any;
    assert.equal(body.ok, true);
    assert.ok(Array.isArray(body.logs));
    assert.ok(body.logs.length > 0);
    const entry = body.logs[0];
    assert.ok(entry.id);
    assert.ok(entry.action);
    assert.ok(entry.createdAt);
  });
});

test('POST /api/admin/update-ticket updates a support ticket status', async () => {
  await withServer(async baseUrl => {
    const adminToken = await loginAdmin(baseUrl);
    const { userId, token } = await signupAndLogin(baseUrl, 'rider');

    // Create a ticket as a rider
    const createRes = await fetch(`${baseUrl}/api/support/create-ticket`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ userId, type: 'billing', message: 'I was charged twice' })
    });
    const createBody = await createRes.json() as any;
    const ticketId = createBody.ticket.id;

    // Admin updates ticket to in_review
    const updateRes = await fetch(`${baseUrl}/api/admin/update-ticket`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ ticketId, status: 'in_review' })
    });
    assert.equal(updateRes.status, 200);
    const updateBody = await updateRes.json() as any;
    assert.equal(updateBody.ok, true);
    assert.equal(updateBody.ticket.status, 'in_review');
  });
});

// ─── Support tests ───────────────────────────────────────────────────────────

test('POST /api/support/create-ticket creates a ticket with open status', async () => {
  await withServer(async baseUrl => {
    const { userId, token } = await signupAndLogin(baseUrl, 'rider');
    const res = await fetch(`${baseUrl}/api/support/create-ticket`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ userId, type: 'general', message: 'Help needed' })
    });
    assert.equal(res.status, 200);
    const body = await res.json() as any;
    assert.equal(body.ok, true);
    assert.equal(body.ticket.status, 'open');
    assert.ok(Array.isArray(body.ticket.replies));
    assert.ok(body.ticket.createdAt);
    assert.ok(body.ticket.updatedAt);
  });
});

test('POST /api/support/get-ticket retrieves a single ticket', async () => {
  await withServer(async baseUrl => {
    const { userId, token } = await signupAndLogin(baseUrl, 'rider');
    const createRes = await fetch(`${baseUrl}/api/support/create-ticket`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ userId, type: 'general', message: 'My issue' })
    });
    const createBody = await createRes.json() as any;
    const ticketId = createBody.ticket.id;

    const getRes = await fetch(`${baseUrl}/api/support/get-ticket`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ ticketId })
    });
    assert.equal(getRes.status, 200);
    const getBody = await getRes.json() as any;
    assert.equal(getBody.ok, true);
    assert.equal(getBody.ticket.id, ticketId);
  });
});

test('POST /api/support/get-ticket returns error for unknown ticket', async () => {
  await withServer(async baseUrl => {
    const { token } = await signupAndLogin(baseUrl, 'rider');
    const res = await fetch(`${baseUrl}/api/support/get-ticket`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ ticketId: 'nonexistent' })
    });
    const body = await res.json() as any;
    assert.equal(body.error, 'ticket not found');
  });
});

test('POST /api/support/reply-ticket adds a reply and moves ticket to in_review for admin reply', async () => {
  await withServer(async baseUrl => {
    const adminToken = await loginAdmin(baseUrl);
    const { userId, token } = await signupAndLogin(baseUrl, 'rider');

    // Create ticket
    const createRes = await fetch(`${baseUrl}/api/support/create-ticket`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ userId, type: 'general', message: 'Need help' })
    });
    const { ticket } = await createRes.json() as any;

    // Admin replies (moves ticket to in_review)
    const replyRes = await fetch(`${baseUrl}/api/support/reply-ticket`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ ticketId: ticket.id, message: 'We are looking into this.' })
    });
    assert.equal(replyRes.status, 200);
    const replyBody = await replyRes.json() as any;
    assert.equal(replyBody.ok, true);
    assert.equal(replyBody.ticket.status, 'in_review');
    assert.equal(replyBody.reply.message, 'We are looking into this.');
    assert.equal(replyBody.reply.authorRole, 'admin');
  });
});

test('POST /api/support/reply-ticket blocks replies on closed tickets', async () => {
  await withServer(async baseUrl => {
    const { userId, token } = await signupAndLogin(baseUrl, 'rider');

    const createRes = await fetch(`${baseUrl}/api/support/create-ticket`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ userId, type: 'general', message: 'Help' })
    });
    const { ticket } = await createRes.json() as any;

    // Close the ticket
    await fetch(`${baseUrl}/api/support/close-ticket`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ ticketId: ticket.id, resolution: 'resolved' })
    });

    // Attempt to reply to closed ticket
    const replyRes = await fetch(`${baseUrl}/api/support/reply-ticket`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ ticketId: ticket.id, message: 'Follow-up' })
    });
    const replyBody = await replyRes.json() as any;
    assert.equal(replyBody.error, 'ticket is closed');
  });
});

test('POST /api/support/close-ticket closes ticket with resolution', async () => {
  await withServer(async baseUrl => {
    const { userId, token } = await signupAndLogin(baseUrl, 'rider');

    const createRes = await fetch(`${baseUrl}/api/support/create-ticket`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ userId, type: 'billing', message: 'Double charge' })
    });
    const { ticket } = await createRes.json() as any;

    const closeRes = await fetch(`${baseUrl}/api/support/close-ticket`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ ticketId: ticket.id, resolution: 'Refund issued' })
    });
    assert.equal(closeRes.status, 200);
    const closeBody = await closeRes.json() as any;
    assert.equal(closeBody.ok, true);
    assert.equal(closeBody.ticket.status, 'closed');
    assert.equal(closeBody.ticket.resolution, 'Refund issued');
  });
});

test('POST /api/support/list-tickets filters by status', async () => {
  await withServer(async baseUrl => {
    const { userId, token } = await signupAndLogin(baseUrl, 'rider');

    // Create two tickets
    const t1 = await fetch(`${baseUrl}/api/support/create-ticket`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ userId, type: 'general', message: 'Issue 1' })
    }).then(r => r.json()) as any;

    await fetch(`${baseUrl}/api/support/close-ticket`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ ticketId: t1.ticket.id })
    });

    await fetch(`${baseUrl}/api/support/create-ticket`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ userId, type: 'general', message: 'Issue 2' })
    });

    const listRes = await fetch(`${baseUrl}/api/support/list-tickets`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ userId, status: 'open' })
    });
    const listBody = await listRes.json() as any;
    assert.ok(listBody.tickets.every((t: any) => t.status === 'open'));
  });
});

// ─── Safety tests ─────────────────────────────────────────────────────────────

test('POST /api/safety/sos creates an incident with status open', async () => {
  await withServer(async baseUrl => {
    const { userId, token } = await signupAndLogin(baseUrl, 'rider');
    const res = await fetch(`${baseUrl}/api/safety/sos`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ userId, rideId: 'ride_123', lat: 37.77, lng: -122.41 })
    });
    assert.equal(res.status, 200);
    const body = await res.json() as any;
    assert.equal(body.ok, true);
    assert.equal(body.incident.type, 'sos');
    assert.equal(body.incident.status, 'open');
    assert.ok(body.incident.id);
  });
});

test('POST /api/safety/incident-report creates a report with status open', async () => {
  await withServer(async baseUrl => {
    const { userId, token } = await signupAndLogin(baseUrl, 'rider');
    const res = await fetch(`${baseUrl}/api/safety/incident-report`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ userId, type: 'harassment', details: 'Driver was rude' })
    });
    assert.equal(res.status, 200);
    const body = await res.json() as any;
    assert.equal(body.ok, true);
    assert.equal(body.incident.status, 'open');
    assert.equal(body.incident.type, 'harassment');
  });
});

test('POST /api/safety/list-incidents requires admin role', async () => {
  await withServer(async baseUrl => {
    const { token } = await signupAndLogin(baseUrl, 'rider');
    const res = await fetch(`${baseUrl}/api/safety/list-incidents`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({})
    });
    assert.equal(res.status, 403);
  });
});

test('POST /api/safety/list-incidents returns all incidents for admin', async () => {
  await withServer(async baseUrl => {
    const adminToken = await loginAdmin(baseUrl);
    const { userId, token } = await signupAndLogin(baseUrl, 'rider');

    // Create two incidents
    await fetch(`${baseUrl}/api/safety/sos`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ userId })
    });
    await fetch(`${baseUrl}/api/safety/incident-report`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ userId, type: 'accident' })
    });

    const res = await fetch(`${baseUrl}/api/safety/list-incidents`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({})
    });
    assert.equal(res.status, 200);
    const body = await res.json() as any;
    assert.equal(body.ok, true);
    assert.ok(Array.isArray(body.incidents));
    assert.ok(body.incidents.length >= 2);
  });
});

test('POST /api/safety/list-incidents filters by status', async () => {
  await withServer(async baseUrl => {
    const adminToken = await loginAdmin(baseUrl);
    const { userId, token } = await signupAndLogin(baseUrl, 'rider');

    const sosRes = await fetch(`${baseUrl}/api/safety/sos`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ userId })
    });
    const { incident } = await sosRes.json() as any;

    // Resolve the incident
    await fetch(`${baseUrl}/api/safety/update-incident`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ incidentId: incident.id, status: 'resolved' })
    });

    // Filter for open incidents only
    const openRes = await fetch(`${baseUrl}/api/safety/list-incidents`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ status: 'open' })
    });
    const openBody = await openRes.json() as any;
    assert.ok(openBody.incidents.every((i: any) => i.status === 'open'));
  });
});

test('POST /api/safety/update-incident transitions incident through lifecycle', async () => {
  await withServer(async baseUrl => {
    const adminToken = await loginAdmin(baseUrl);
    const { userId, token } = await signupAndLogin(baseUrl, 'rider');

    const sosRes = await fetch(`${baseUrl}/api/safety/sos`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ userId, rideId: 'ride_abc' })
    });
    const { incident } = await sosRes.json() as any;
    assert.equal(incident.status, 'open');

    // Move to under_review
    const reviewRes = await fetch(`${baseUrl}/api/safety/update-incident`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ incidentId: incident.id, status: 'under_review' })
    });
    const reviewBody = await reviewRes.json() as any;
    assert.equal(reviewBody.ok, true);
    assert.equal(reviewBody.incident.status, 'under_review');
    assert.equal(reviewBody.incident.resolvedAt, undefined);

    // Resolve
    const resolveRes = await fetch(`${baseUrl}/api/safety/update-incident`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ incidentId: incident.id, status: 'resolved' })
    });
    const resolveBody = await resolveRes.json() as any;
    assert.equal(resolveBody.incident.status, 'resolved');
    assert.ok(resolveBody.incident.resolvedAt);
  });
});

test('POST /api/safety/update-incident returns error for unknown incident', async () => {
  await withServer(async baseUrl => {
    const adminToken = await loginAdmin(baseUrl);
    const res = await fetch(`${baseUrl}/api/safety/update-incident`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ incidentId: 'nonexistent', status: 'resolved' })
    });
    const body = await res.json() as any;
    assert.equal(body.error, 'incident not found');
  });
});
