import assert from 'node:assert/strict';
import { test } from 'node:test';
import { env } from '../src/config/env';
import { getSeedCredentials } from '../src/database/seeds';

function isCompliantPassword(password: string) {
  return (
    password.length >= 12 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /\d/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
}

test('seed credentials output reflects active env passwords', () => {
  const credentials = getSeedCredentials();

  assert.equal(credentials.adminPassword, env.adminSeedPassword);
  assert.equal(credentials.riderPassword, env.testRiderSeedPassword);
  assert.equal(credentials.driverPassword, env.testDriverSeedPassword);
});

test('seed credentials are consistent and password-policy compliant', () => {
  const credentials = getSeedCredentials();

  assert.equal(credentials.adminPassword, 'Test123!Drive');
  assert.equal(credentials.riderPassword, 'Test123!Drive');
  assert.equal(credentials.driverPassword, 'Test123!Drive');
  assert.equal(isCompliantPassword(credentials.adminPassword), true);
});
