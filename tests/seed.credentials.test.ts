import assert from 'node:assert/strict';
import { test } from 'node:test';
import { env } from '../src/config/env';
import { signupSchema } from '../src/schemas/auth.schemas';
import { getSeedCredentials } from '../src/database/seeds';

test('seed credentials output reflects active env passwords', () => {
  const credentials = getSeedCredentials();

  assert.equal(credentials.adminPassword, env.adminSeedPassword);
  assert.equal(credentials.riderPassword, env.testRiderSeedPassword);
  assert.equal(credentials.driverPassword, env.testDriverSeedPassword);
});

test('seed credentials are consistent and password-policy compliant', () => {
  const credentials = getSeedCredentials();

  assert.equal(credentials.adminPassword, credentials.riderPassword);
  assert.equal(credentials.riderPassword, credentials.driverPassword);

  for (const password of [credentials.adminPassword, credentials.riderPassword, credentials.driverPassword]) {
    const parsed = signupSchema.safeParse({ email: 'seed@example.com', password });
    assert.equal(parsed.success, true);
  }
});
