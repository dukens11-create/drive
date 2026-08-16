import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

function read(rel: string) {
  return fs.readFileSync(path.join(process.cwd(), rel), 'utf8');
}

test('rider production UI contains no hard-coded demo driver identity', () => {
  const source = read('public/rider-dashboard.js');
  const backend = read('src/services/rides.service.ts');

  assert.equal(source.includes('driver_demo_1'), false);
  assert.equal(source.includes('John Smith'), false);
  assert.equal(source.includes('555-555-5555'), false);
  assert.equal(source.includes('FLP-123'), false);
  assert.equal(source.includes('MOCK_DRIVER_POOL'), false);

  assert.equal(backend.includes('driver_demo_1'), false);
  assert.equal(backend.includes('John Smith'), false);
  assert.equal(backend.includes('FLP-123'), false);
});

test('rider pricing UI exposes meter fare and service fee', () => {
  const html = read('public/rider-dashboard.html');
  const js = read('public/rider-dashboard.js');

  assert.match(html, /fare-meter-fare/);
  assert.match(html, /fare-service-fee/);
  assert.match(js, /estimate\.fareBreakdown\.meterFare/);
  assert.match(js, /estimate\.fareBreakdown\.serviceFee/);
});

test('promo preview is server authoritative', () => {
  const source = read('public/rider-dashboard.js');
  const routes = read('src/routes/promos.routes.ts');
  const app = read('src/app.ts');

  assert.equal(source.includes('MOCK_PROMO_CODES'), false);
  assert.match(source, /\/api\/promos\/validate/);
  assert.match(routes, /requireRole\('rider'\)/);
  assert.match(app, /app\.use\('\/api\/promos', promosRoutes\)/);
});

test('ride discount is incorporated before payment amount is derived', () => {
  const rides = read('src/services/rides.service.ts');
  const payments = read('src/services/payments.service.ts');

  assert.match(rides, /const discountedFare = buildFareDetails/);
  assert.match(rides, /estimated\.fareBreakdown = discountedFare/);
  assert.match(payments, /ride\.fareDetails\?\.total/);
});

test('scheduled card rides cannot be falsely marked dispatched while payment is pending', () => {
  const dispatcher = read('src/jobs/scheduled-rides-dispatcher.ts');

  assert.match(dispatcher, /payment_pending/);
  assert.match(dispatcher, /Payment confirmation required before driver dispatch/);
});