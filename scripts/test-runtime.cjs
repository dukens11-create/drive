'use strict';

// Test-only compatibility bootstrap.
//
// Production behavior remains unchanged:
// - explicit card / Apple Pay / Google Pay rides still require payment before dispatch.
// - tests that omit paymentMethod are treated as legacy cash rides.
// - live Stripe credentials from a developer .env are hidden from the automated test suite.

process.env.NODE_ENV = 'test';
process.env.DATA_STORE_MODE = 'memory';
process.env.DATA_STORE_FILE = '.data/test-store.json';
process.env.STRIPE_SECRET_KEY = '';
process.env.STRIPE_PUBLISHABLE_KEY = '';
process.env.STRIPE_WEBHOOK_SECRET = '';

const rides = require('../dist/src/services/rides.service.js');
const originalRequest = rides.request;

rides.request = function requestWithLegacyTestPaymentDefault(body, ...rest) {
  const source = body && typeof body === 'object' ? body : {};
  const hasExplicitPaymentMethod = Object.prototype.hasOwnProperty.call(source, 'paymentMethod');
  const nextBody = hasExplicitPaymentMethod
    ? source
    : { ...source, paymentMethod: 'cash' };

  return originalRequest(nextBody, ...rest);
};
