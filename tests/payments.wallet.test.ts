import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import { test } from 'node:test';
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

async function signupAndToken(baseUrl: string, role: 'rider' | 'driver') {
  const response = await fetch(`${baseUrl}/api/auth/signup`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: `${role}-${randomUUID()}@example.com`,
      password: 'password123',
      role
    })
  });
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.ok, true);
  return { token: payload.accessToken as string, userId: payload.user.id as string };
}

test('payment capture updates rider and driver wallet balances', async () => {
  await withServer(async baseUrl => {
    const rider = await signupAndToken(baseUrl, 'rider');
    const driver = await signupAndToken(baseUrl, 'driver');

    const createIntentRes = await fetch(`${baseUrl}/api/payments/create-intent`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${rider.token}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        riderId: rider.userId,
        driverId: driver.userId,
        amountCents: 2500
      })
    });
    assert.equal(createIntentRes.status, 200);
    const created = await createIntentRes.json();
    assert.equal(created.ok, true);
    assert.equal(typeof created.paymentIntent.id, 'string');
    assert.equal(typeof created.paymentIntent.checkoutSessionId, 'string');

    const captureRes = await fetch(`${baseUrl}/api/payments/capture`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${rider.token}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify({ paymentId: created.payment.id })
    });
    assert.equal(captureRes.status, 200);
    const captured = await captureRes.json();
    assert.equal(captured.ok, true);
    assert.equal(captured.payment.status, 'captured');

    const riderBalanceRes = await fetch(`${baseUrl}/api/wallet/balance`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${rider.token}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify({ userId: rider.userId })
    });
    const riderBalance = await riderBalanceRes.json();
    assert.equal(riderBalance.balanceCents, -2500);

    const driverBalanceRes = await fetch(`${baseUrl}/api/wallet/balance`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${driver.token}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify({ userId: driver.userId })
    });
    const driverBalance = await driverBalanceRes.json();
    assert.equal(driverBalance.balanceCents, 2000);
  });
});

test('stripe webhook captures payment by payment intent and is idempotent', async () => {
  await withServer(async baseUrl => {
    const rider = await signupAndToken(baseUrl, 'rider');
    const driver = await signupAndToken(baseUrl, 'driver');

    const createIntentRes = await fetch(`${baseUrl}/api/payments/create-intent`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${rider.token}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        riderId: rider.userId,
        driverId: driver.userId,
        amountCents: 1000
      })
    });
    const created = await createIntentRes.json();

    const webhookPayload = {
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: created.payment.providerIntentId
        }
      }
    };

    const firstWebhook = await fetch(`${baseUrl}/api/payments/stripe-webhook`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(webhookPayload)
    });
    const firstBody = await firstWebhook.json();
    assert.equal(firstBody.ok, true);
    assert.equal(firstBody.result.action, 'mark_payment_captured');

    const secondWebhook = await fetch(`${baseUrl}/api/payments/stripe-webhook`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(webhookPayload)
    });
    const secondBody = await secondWebhook.json();
    assert.equal(secondBody.ok, true);
    assert.equal(secondBody.result.action, 'capture_already_applied');

    const riderLedgerRes = await fetch(`${baseUrl}/api/wallet/ledger`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${rider.token}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify({ userId: rider.userId })
    });
    const riderLedger = await riderLedgerRes.json();
    const captureEntries = riderLedger.entries.filter((entry: any) => entry.reason.endsWith(':capture'));
    assert.equal(captureEntries.length, 1);
  });
});

test('stripe webhook rejects invalid payloads', async () => {
  await withServer(async baseUrl => {
    const webhookRes = await fetch(`${baseUrl}/api/payments/stripe-webhook`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ noType: true })
    });
    assert.equal(webhookRes.status, 200);
    const body = await webhookRes.json();
    assert.equal(body.error, 'invalid stripe event payload');
  });
});
