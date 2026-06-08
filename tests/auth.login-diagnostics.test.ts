import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import { test } from 'node:test';
import { createApp } from '../src/app';
import { env } from '../src/config/env';
import * as authService from '../src/services/auth.service';

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

test('auth login returns explicit user-not-found diagnostics', async () => {
  const payload = await authService.login({
    email: `missing-${randomUUID()}@example.com`,
    password: 'Password123!'
  });

  assert.equal(payload.error, 'user not found');
  assert.equal(payload.errorCode, 'AUTH_USER_NOT_FOUND');
});

test('auth login returns explicit wrong-password diagnostics', async () => {
  const email = `known-${randomUUID()}@example.com`;
  await authService.signup({
    email,
    password: 'Password123!'
  });

  const payload = await authService.login({
    email,
    password: 'Password123!different'
  });

  assert.equal(payload.error, 'wrong password');
  assert.equal(payload.errorCode, 'AUTH_INVALID_PASSWORD');
});

test('seeded rider and driver test accounts can login', async () => {
  const rider = await authService.login({
    email: 'rider@test.com',
    password: env.testRiderSeedPassword
  });
  assert.equal(rider.ok, true);
  assert.equal(rider.user?.role, 'rider');

  const driver = await authService.login({
    email: 'driver@test.com',
    password: env.testDriverSeedPassword
  });
  assert.equal(driver.ok, true);
  assert.equal(driver.user?.role, 'driver');
});

test('auth middleware returns explicit missing-token diagnostics', async () => {
  await withServer(async baseUrl => {
    const response = await fetch(`${baseUrl}/api/auth/sessions`);
    assert.equal(response.status, 401);
    const payload = await response.json() as { error: string; errorCode: string; message: string };
    assert.equal(payload.error, 'Missing token');
    assert.equal(payload.errorCode, 'AUTH_TOKEN_MISSING');
  });
});

test('cors allows credentialed local browser origins', async () => {
  await withServer(async baseUrl => {
    const response = await fetch(`${baseUrl}/health`, {
      headers: {
        Origin: 'http://localhost:8080'
      }
    });

    assert.equal(response.status, 200);
    assert.equal(response.headers.get('access-control-allow-origin'), 'http://localhost:8080');
    assert.equal(response.headers.get('access-control-allow-credentials'), 'true');
  });
});
