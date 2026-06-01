import assert from 'node:assert/strict';
import { test } from 'node:test';
import { store } from '../src/database/data.store';
import * as admin from '../src/services/admin.service';
import * as marketplace from '../src/services/marketplace.service';
import * as rides from '../src/services/rides.service';
import * as drivers from '../src/services/drivers.service';
import * as kyc from '../src/services/kyc.service';

function resetStores() {
  store.rides.clear();
  store.drivers.clear();
  store.kycStatus.clear();
  store.walletTx.splice(0, store.walletTx.length);
  store.walletBalances.clear();
  store.surgeConfig.clear();
  store.promos.clear();
  store.referralCodes.clear();
  store.referralEvents.splice(0, store.referralEvents.length);
  store.markets.clear();
}

async function setupVerifiedDriver(driverId: string) {
  await drivers.apply({ userId: driverId });
  await drivers.documents({
    userId: driverId,
    documents: [
      { type: 'Driver License', fileName: `${driverId}-license.jpg`, expiryDate: '2030-08-31' },
      { type: 'Selfie Photo', fileName: `${driverId}-selfie.jpg`, selfieMatchScore: 0.9 }
    ]
  });
  await kyc.webhook({ userId: driverId, status: 'verified' });
  const approval = await admin.approve_driver({
    userId: driverId,
    approved: true,
    __actor: { id: 'admin_test', sub: 'admin_test', role: 'admin' }
  });
  assert.equal(approval.ok, true);
  await drivers.location({ userId: driverId, lat: 10, lng: 10 });
  await drivers.availability({ userId: driverId, status: 'online' });
}

// ─── Surge Pricing ───────────────────────────────────────────────────────────

test('get_surge returns multiplier 1.0 when no surge is configured', async () => {
  resetStores();
  const result = await marketplace.get_surge();
  assert.equal(result.ok, true);
  assert.equal(result.multiplier, 1.0);
});

test('set_surge rejects invalid multiplier values', async () => {
  resetStores();
  const tooLow = await marketplace.set_surge({ multiplier: 0.5 });
  assert.ok(tooLow.error);

  const tooHigh = await marketplace.set_surge({ multiplier: 11 });
  assert.ok(tooHigh.error);

  const notNumber = await marketplace.set_surge({ multiplier: null });
  assert.ok(notNumber.error);
});

test('set_surge persists multiplier and get_surge returns it', async () => {
  resetStores();
  const set = await marketplace.set_surge({ multiplier: 1.5, reason: 'evening peak' });
  assert.equal(set.ok, true);
  assert.equal(set.surgeConfig.multiplier, 1.5);
  assert.equal(set.surgeConfig.reason, 'evening peak');

  const get = await marketplace.get_surge();
  assert.equal(get.multiplier, 1.5);
  assert.equal(get.reason, 'evening peak');
});

test('fare estimate includes surge multiplier in fareEstimate', async () => {
  resetStores();
  // No surge: get baseline
  const baseline = await rides.estimate({ miles: 5, minutes: 10 });
  assert.equal(baseline.surgeMultiplier, 1.0);
  const baseFare = baseline.fareEstimate;

  // Set 2x surge
  await marketplace.set_surge({ multiplier: 2.0 });
  const surged = await rides.estimate({ miles: 5, minutes: 10 });
  assert.equal(surged.surgeMultiplier, 2.0);
  assert.equal(Math.abs(surged.fareEstimate - baseFare * 2.0) < 0.02, true);
});

test('surge multiplier is recorded on ride at request time', async () => {
  resetStores();
  await setupVerifiedDriver('driver_surge_1');
  await marketplace.set_surge({ multiplier: 1.5 });

  const result = await rides.request({ riderId: 'rider_surge_1', pickupLat: 10.01, pickupLng: 10.01, miles: 4, minutes: 8 });
  assert.equal(result.ok, true);
  assert.equal(result.ride.surgeMultiplier, 1.5);
});

// ─── Promos / Discounts ──────────────────────────────────────────────────────

test('create_promo validates required fields', async () => {
  resetStores();
  const noCode = await marketplace.create_promo({ discountType: 'flat', discountValue: 200 });
  assert.ok(noCode.error);

  const noValue = await marketplace.create_promo({ code: 'SAVE10', discountType: 'flat' });
  assert.ok(noValue.error);

  const badPercent = await marketplace.create_promo({ code: 'BIG', discountType: 'percent', discountValue: 110 });
  assert.ok(badPercent.error);
});

test('create_promo creates a valid flat-discount promo', async () => {
  resetStores();
  const result = await marketplace.create_promo({ code: 'SAVE200', discountType: 'flat', discountValue: 200 });
  assert.equal(result.ok, true);
  assert.equal(result.promo.code, 'SAVE200');
  assert.equal(result.promo.discountType, 'flat');
  assert.equal(result.promo.discountValue, 200);
  assert.equal(result.promo.usageCount, 0);
});

test('create_promo rejects duplicate codes', async () => {
  resetStores();
  await marketplace.create_promo({ code: 'DUP', discountType: 'flat', discountValue: 100 });
  const dup = await marketplace.create_promo({ code: 'DUP', discountType: 'flat', discountValue: 50 });
  assert.ok(dup.error);
});

test('list_promos returns all created promos', async () => {
  resetStores();
  await marketplace.create_promo({ code: 'AAA', discountType: 'flat', discountValue: 100 });
  await marketplace.create_promo({ code: 'BBB', discountType: 'percent', discountValue: 10 });
  const result = await marketplace.list_promos();
  assert.equal(result.ok, true);
  assert.equal(result.promos.length, 2);
});

test('flat promo discount reduces rider charge on ride completion', async () => {
  resetStores();
  await setupVerifiedDriver('driver_promo_1');
  await marketplace.create_promo({ code: 'FLAT100', discountType: 'flat', discountValue: 100 });

  const req = await rides.request({
    riderId: 'rider_promo_1',
    pickupLat: 10.01, pickupLng: 10.01,
    miles: 5, minutes: 10,
    promoCode: 'FLAT100'
  });
  assert.equal(req.ok, true);
  assert.equal(req.ride.promoId != null, true);
  assert.equal(req.ride.discountCents, 100);
  assert.equal(req.discountCents, 100);

  const rideId = req.ride.id;
  await rides.start({ rideId, driverId: 'driver_promo_1' });
  const done = await rides.complete({ rideId, driverId: 'driver_promo_1' });
  assert.equal(done.ok, true);
  assert.equal(done.discountCents, 100);
  assert.equal(done.amountCents, done.grossCents - 100);
});

test('percent promo discount applies correctly', async () => {
  resetStores();
  await setupVerifiedDriver('driver_pct_1');
  await marketplace.create_promo({ code: 'PCT20', discountType: 'percent', discountValue: 20 });

  const req = await rides.request({
    riderId: 'rider_pct_1',
    pickupLat: 10.01, pickupLng: 10.01,
    miles: 5, minutes: 10,
    promoCode: 'PCT20'
  });
  assert.equal(req.ok, true);
  const grossCents = Math.round(req.ride.fareEstimate * 100);
  const expectedDiscount = Math.round(grossCents * 20 / 100);
  assert.equal(req.discountCents, expectedDiscount);
});

test('promo usage count increments on each use', async () => {
  resetStores();
  await setupVerifiedDriver('driver_usage_1');
  await setupVerifiedDriver('driver_usage_2');
  await marketplace.create_promo({ code: 'MULTI', discountType: 'flat', discountValue: 50, maxUsages: 5 });

  await rides.request({ riderId: 'rider_u1', pickupLat: 10.01, pickupLng: 10.01, miles: 3, minutes: 6, promoCode: 'MULTI' });
  const list = await marketplace.list_promos();
  const promo = list.promos.find((p: any) => p.code === 'MULTI');
  assert.ok(promo, 'promo MULTI should be in the list');
  assert.equal(promo.usageCount, 1);
});

test('promo code is rejected when max usages reached', async () => {
  resetStores();
  await setupVerifiedDriver('driver_limit_1');
  await marketplace.create_promo({ code: 'LIMITED', discountType: 'flat', discountValue: 100, maxUsages: 1 });

  // First use succeeds
  await rides.request({ riderId: 'rider_l1', pickupLat: 10.01, pickupLng: 10.01, miles: 3, minutes: 6, promoCode: 'LIMITED' });

  await setupVerifiedDriver('driver_limit_2');
  const second = await rides.request({ riderId: 'rider_l2', pickupLat: 10.01, pickupLng: 10.01, miles: 3, minutes: 6, promoCode: 'LIMITED' });
  assert.ok(second.error);
  assert.ok(second.error.includes('usage limit'));
});

test('rider cannot reuse the same promo code on a second ride', async () => {
  resetStores();
  await setupVerifiedDriver('driver_reuse_1');
  await marketplace.create_promo({ code: 'ONCE', discountType: 'flat', discountValue: 100 });

  await rides.request({ riderId: 'rider_reuse', pickupLat: 10.01, pickupLng: 10.01, miles: 3, minutes: 6, promoCode: 'ONCE' });

  await setupVerifiedDriver('driver_reuse_2');
  const second = await rides.request({ riderId: 'rider_reuse', pickupLat: 10.01, pickupLng: 10.01, miles: 3, minutes: 6, promoCode: 'ONCE' });
  assert.ok(second.error);
  assert.ok(second.error.includes('already used'));
});

test('invalid promo code returns error on ride request', async () => {
  resetStores();
  await setupVerifiedDriver('driver_inv_1');
  const result = await rides.request({
    riderId: 'rider_inv',
    pickupLat: 10.01, pickupLng: 10.01,
    miles: 3, minutes: 6,
    promoCode: 'DOESNOTEXIST'
  });
  assert.ok(result.error);
  assert.ok(result.error.includes('not found'));
});

// ─── Referrals ────────────────────────────────────────────────────────────────

test('get_referral_code generates code for user and returns same code on repeat calls', async () => {
  resetStores();
  const first = await marketplace.get_referral_code({ actor: { id: 'user_ref_1' } });
  assert.equal(first.ok, true);
  assert.ok(typeof first.referralCode === 'string');
  assert.ok(first.referralCode.startsWith('REF'));

  const second = await marketplace.get_referral_code({ actor: { id: 'user_ref_1' } });
  assert.equal(second.referralCode, first.referralCode);
});

test('register_referral links referrer to referred user', async () => {
  resetStores();
  const refCode = await marketplace.get_referral_code({ actor: { id: 'referrer_user' } });
  const result = await marketplace.register_referral({ actor: { id: 'new_user' }, referralCode: refCode.referralCode });
  assert.equal(result.ok, true);
  assert.equal(result.referralEvent.referrerUserId, 'referrer_user');
  assert.equal(result.referralEvent.referredUserId, 'new_user');
  assert.equal(result.referralEvent.paid, false);
});

test('register_referral rejects own referral code', async () => {
  resetStores();
  const refCode = await marketplace.get_referral_code({ actor: { id: 'self_user' } });
  const result = await marketplace.register_referral({ actor: { id: 'self_user' }, referralCode: refCode.referralCode });
  assert.ok(result.error);
  assert.ok(result.error.includes('own referral'));
});

test('register_referral rejects duplicate referral for same user', async () => {
  resetStores();
  const refCode1 = await marketplace.get_referral_code({ actor: { id: 'ref_a' } });
  const refCode2 = await marketplace.get_referral_code({ actor: { id: 'ref_b' } });
  await marketplace.register_referral({ actor: { id: 'new_rider' }, referralCode: refCode1.referralCode });
  const dup = await marketplace.register_referral({ actor: { id: 'new_rider' }, referralCode: refCode2.referralCode });
  assert.ok(dup.error);
  assert.ok(dup.error.includes('already been referred'));
});

test('referral bonus is credited to referrer on referred user first completed ride', async () => {
  resetStores();
  await setupVerifiedDriver('driver_ref_bonus');

  const refCode = await marketplace.get_referral_code({ actor: { id: 'referrer_bonus' } });
  await marketplace.register_referral({ actor: { id: 'referred_rider' }, referralCode: refCode.referralCode });

  const req = await rides.request({ riderId: 'referred_rider', pickupLat: 10.01, pickupLng: 10.01, miles: 4, minutes: 8 });
  await rides.start({ rideId: req.ride.id, driverId: 'driver_ref_bonus' });
  await rides.complete({ rideId: req.ride.id, driverId: 'driver_ref_bonus' });

  // Referral event should now be paid
  const event = store.referralEvents.find(ev => ev.referredUserId === 'referred_rider');
  assert.ok(event);
  assert.equal(event!.paid, true);

  // Referrer should have received a bonus credit
  const referrerTxs = store.walletTx.filter(tx => tx.userId === 'referrer_bonus' && tx.kind === 'credit');
  assert.equal(referrerTxs.length, 1);
  assert.equal(referrerTxs[0].amountCents, 500); // $5.00 bonus
  assert.ok(referrerTxs[0].reason.startsWith('referral:'));
});

test('referral bonus is not paid twice on second completed ride', async () => {
  resetStores();
  await setupVerifiedDriver('driver_ref_once_1');

  const refCode = await marketplace.get_referral_code({ actor: { id: 'referrer_once' } });
  await marketplace.register_referral({ actor: { id: 'referred_once' }, referralCode: refCode.referralCode });

  // First ride - pays bonus
  const req1 = await rides.request({ riderId: 'referred_once', pickupLat: 10.01, pickupLng: 10.01, miles: 3, minutes: 6 });
  await rides.start({ rideId: req1.ride.id, driverId: 'driver_ref_once_1' });
  await rides.complete({ rideId: req1.ride.id, driverId: 'driver_ref_once_1' });

  await setupVerifiedDriver('driver_ref_once_2');
  // Second ride - no bonus
  const req2 = await rides.request({ riderId: 'referred_once', pickupLat: 10.01, pickupLng: 10.01, miles: 3, minutes: 6 });
  await rides.start({ rideId: req2.ride.id, driverId: 'driver_ref_once_2' });
  await rides.complete({ rideId: req2.ride.id, driverId: 'driver_ref_once_2' });

  const referrerTxs = store.walletTx.filter(tx => tx.userId === 'referrer_once' && tx.reason.startsWith('referral:'));
  assert.equal(referrerTxs.length, 1);
});

test('list_referrals returns referral events and total paid bonus for referrer', async () => {
  resetStores();
  await setupVerifiedDriver('driver_list_ref');

  const refCode = await marketplace.get_referral_code({ actor: { id: 'referrer_list' } });
  await marketplace.register_referral({ actor: { id: 'referred_list' }, referralCode: refCode.referralCode });

  const beforeRide = await marketplace.list_referrals({ actor: { id: 'referrer_list' } });
  assert.equal(beforeRide.ok, true);
  assert.equal(beforeRide.referrals.length, 1);
  assert.equal(beforeRide.totalBonusCents, 0);

  const req = await rides.request({ riderId: 'referred_list', pickupLat: 10.01, pickupLng: 10.01, miles: 3, minutes: 6 });
  await rides.start({ rideId: req.ride.id, driverId: 'driver_list_ref' });
  await rides.complete({ rideId: req.ride.id, driverId: 'driver_list_ref' });

  const afterRide = await marketplace.list_referrals({ actor: { id: 'referrer_list' } });
  assert.equal(afterRide.totalBonusCents, 500);
});

// ─── Driver Earnings ─────────────────────────────────────────────────────────

test('driver earnings returns per-ride breakdown after completing rides', async () => {
  resetStores();
  await setupVerifiedDriver('driver_earn_1');

  const req = await rides.request({ riderId: 'rider_earn_1', pickupLat: 10.01, pickupLng: 10.01, miles: 5, minutes: 10 });
  await rides.start({ rideId: req.ride.id, driverId: 'driver_earn_1' });
  await rides.complete({ rideId: req.ride.id, driverId: 'driver_earn_1' });

  const result = await drivers.earnings({ userId: 'driver_earn_1' });
  assert.equal(result.ok, true);
  assert.equal(result.earningsCents > 0, true);
  assert.equal(result.rideCount, 1);
  assert.equal(result.rideEarnings.length, 1);
  assert.equal(result.rideEarnings[0].rideId, req.ride.id);
  assert.equal(result.rideEarnings[0].amountCents > 0, true);
});

test('driver earnings accumulates across multiple rides', async () => {
  resetStores();
  await setupVerifiedDriver('driver_earn_multi');

  const req1 = await rides.request({ riderId: 'rider_em1', pickupLat: 10.01, pickupLng: 10.01, miles: 3, minutes: 6 });
  await rides.start({ rideId: req1.ride.id, driverId: 'driver_earn_multi' });
  await rides.complete({ rideId: req1.ride.id, driverId: 'driver_earn_multi' });

  await drivers.availability({ userId: 'driver_earn_multi', status: 'online' });

  const req2 = await rides.request({ riderId: 'rider_em2', pickupLat: 10.01, pickupLng: 10.01, miles: 4, minutes: 8 });
  await rides.start({ rideId: req2.ride.id, driverId: 'driver_earn_multi' });
  await rides.complete({ rideId: req2.ride.id, driverId: 'driver_earn_multi' });

  const result = await drivers.earnings({ userId: 'driver_earn_multi' });
  assert.equal(result.rideCount, 2);
  assert.equal(result.rideEarnings.length, 2);
});

// ─── Market Config ────────────────────────────────────────────────────────────

test('create_market requires name, city, and country', async () => {
  resetStores();
  const missing = await marketplace.create_market({ name: 'Austin', city: 'Austin' });
  assert.ok(missing.error);
});

test('create_market creates a market with pre_launch status', async () => {
  resetStores();
  const result = await marketplace.create_market({ name: 'Austin', city: 'Austin', country: 'US' });
  assert.equal(result.ok, true);
  assert.equal(result.market.name, 'Austin');
  assert.equal(result.market.city, 'Austin');
  assert.equal(result.market.country, 'US');
  assert.equal(result.market.status, 'pre_launch');
  assert.equal(result.market.launchedAt, undefined);
});

test('list_markets returns all created markets', async () => {
  resetStores();
  await marketplace.create_market({ name: 'Austin', city: 'Austin', country: 'US' });
  await marketplace.create_market({ name: 'Denver', city: 'Denver', country: 'US' });
  const result = await marketplace.list_markets();
  assert.equal(result.ok, true);
  assert.equal(result.markets.length, 2);
});

test('update_market_status transitions market through valid statuses', async () => {
  resetStores();
  const created = await marketplace.create_market({ name: 'Seattle', city: 'Seattle', country: 'US' });
  const marketId = created.market.id;

  const launched = await marketplace.update_market_status({ marketId, status: 'active' });
  assert.equal(launched.ok, true);
  assert.equal(launched.market.status, 'active');
  assert.ok(launched.market.launchedAt);

  const paused = await marketplace.update_market_status({ marketId, status: 'paused' });
  assert.equal(paused.market.status, 'paused');

  const sunset = await marketplace.update_market_status({ marketId, status: 'sunset' });
  assert.equal(sunset.market.status, 'sunset');
});

test('update_market_status rejects invalid status values', async () => {
  resetStores();
  const created = await marketplace.create_market({ name: 'Miami', city: 'Miami', country: 'US' });
  const result = await marketplace.update_market_status({ marketId: created.market.id, status: 'live' });
  assert.ok(result.error);
});

test('update_market_status returns error for unknown market', async () => {
  resetStores();
  const result = await marketplace.update_market_status({ marketId: 'mkt_doesnotexist', status: 'active' });
  assert.ok(result.error);
  assert.ok(result.error.includes('not found'));
});
