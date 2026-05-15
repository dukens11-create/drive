import { createHash } from 'crypto';
import {
  getActiveSurgeMultiplier,
  makeId,
  markStoreDirty,
  pushWalletTx,
  store,
  timestamp,
  type MarketConfig,
  type Promo,
  type ReferralCode,
  type ReferralEvent,
  type SurgeConfig
} from './data.store';

const REFERRAL_BONUS_CENTS = 500; // $5.00 referral bonus

// ─── Same-day delivery (existing) ──────────────────────────────────────────

export async function same_day_dispatch(body: any, _params?: any, _query?: any) {
  const delivery = {
    id: makeId('mktd'),
    orderId: body?.orderId || makeId('order'),
    status: 'assigned' as const,
    etaMinutes: Number(body?.etaMinutes || 45),
    createdAt: timestamp()
  };
  store.marketplaceDeliveries.set(delivery.id, delivery);
  return { module: 'marketplace', action: 'same-day-dispatch', ok: true, delivery };
}

export async function delivery_options(body: any, _params?: any, _query?: any) {
  const distanceMiles = Number(body?.distanceMiles || 5);
  return {
    module: 'marketplace',
    action: 'delivery-options',
    ok: true,
    options: [
      { type: 'same_day', etaMinutes: Math.round(distanceMiles * 8), feeCents: 799 },
      { type: 'express', etaMinutes: Math.round(distanceMiles * 5), feeCents: 1299 }
    ]
  };
}

// ─── Surge / Dynamic Pricing ────────────────────────────────────────────────

export async function get_surge(_body?: any, _params?: any, _query?: any) {
  const multiplier = getActiveSurgeMultiplier();
  const cfg = store.surgeConfig.get('global');
  return { module: 'marketplace', action: 'get-surge', ok: true, multiplier, reason: cfg?.reason, updatedAt: cfg?.updatedAt };
}

export async function set_surge(body: any, _params?: any, _query?: any) {
  const multiplier = Number(body?.multiplier);
  if (!Number.isFinite(multiplier) || multiplier < 1.0 || multiplier > 10.0) {
    return { module: 'marketplace', action: 'set-surge', error: 'multiplier must be a number between 1.0 and 10.0' };
  }
  const cfg: SurgeConfig = { multiplier, reason: body?.reason || undefined, updatedAt: timestamp() };
  store.surgeConfig.set('global', cfg);
  return { module: 'marketplace', action: 'set-surge', ok: true, surgeConfig: cfg };
}

// ─── Promotions / Discounts ─────────────────────────────────────────────────

export async function create_promo(body: any, _params?: any, _query?: any) {
  const code = (body?.code || '').trim().toUpperCase();
  if (!code || code.length < 3 || code.length > 32) {
    return { module: 'marketplace', action: 'create-promo', error: 'code must be 3-32 characters' };
  }
  if (store.promos.has(code)) {
    return { module: 'marketplace', action: 'create-promo', error: 'promo code already exists' };
  }
  const discountType: 'flat' | 'percent' = body?.discountType === 'percent' ? 'percent' : 'flat';
  const discountValue = Number(body?.discountValue);
  if (!Number.isFinite(discountValue) || discountValue <= 0) {
    return { module: 'marketplace', action: 'create-promo', error: 'discountValue must be a positive number' };
  }
  if (discountType === 'percent' && (discountValue > 100)) {
    return { module: 'marketplace', action: 'create-promo', error: 'percent discount cannot exceed 100' };
  }
  const promo: Promo = {
    id: makeId('promo'),
    code,
    discountType,
    discountValue,
    minFareCents: body?.minFareCents != null ? Number(body.minFareCents) : undefined,
    maxUsages: body?.maxUsages != null ? Number(body.maxUsages) : undefined,
    usageCount: 0,
    expiresAt: body?.expiresAt || undefined,
    createdAt: timestamp()
  };
  store.promos.set(code, promo);
  return { module: 'marketplace', action: 'create-promo', ok: true, promo };
}

export async function list_promos(_body?: any, _params?: any, _query?: any) {
  const promos = Array.from(store.promos.values());
  return { module: 'marketplace', action: 'list-promos', ok: true, promos };
}

// ─── Referrals ──────────────────────────────────────────────────────────────

function generateReferralCode(userId: string): string {
  return 'REF' + createHash('sha256').update(userId).digest('hex').slice(0, 7).toUpperCase();
}

export async function get_referral_code(body: any, _params?: any, _query?: any) {
  const userId = body?.actor?.id || body?.userId;
  if (!userId) return { module: 'marketplace', action: 'get-referral-code', error: 'userId is required' };

  // Check if user already has a referral code
  const existing = Array.from(store.referralCodes.values()).find(rc => rc.userId === userId);
  if (existing) {
    return { module: 'marketplace', action: 'get-referral-code', ok: true, referralCode: existing.code };
  }

  // Generate and store a new referral code
  const code = generateReferralCode(userId);
  const ref: ReferralCode = { code, userId, createdAt: timestamp() };
  store.referralCodes.set(code, ref);
  return { module: 'marketplace', action: 'get-referral-code', ok: true, referralCode: code };
}

export async function register_referral(body: any, _params?: any, _query?: any) {
  const referredUserId = body?.actor?.id || body?.userId || body?.referredUserId;
  const code = (body?.referralCode || '').trim().toUpperCase();
  if (!referredUserId) return { module: 'marketplace', action: 'register-referral', error: 'userId is required' };
  if (!code) return { module: 'marketplace', action: 'register-referral', error: 'referralCode is required' };

  const refCode = store.referralCodes.get(code);
  if (!refCode) return { module: 'marketplace', action: 'register-referral', error: 'referral code not found' };
  if (refCode.userId === referredUserId) {
    return { module: 'marketplace', action: 'register-referral', error: 'cannot use your own referral code' };
  }

  // Prevent duplicate referral events for the same referred user
  const alreadyReferred = store.referralEvents.some(ev => ev.referredUserId === referredUserId);
  if (alreadyReferred) {
    return { module: 'marketplace', action: 'register-referral', error: 'user has already been referred' };
  }

  const event: ReferralEvent = {
    id: makeId('ref'),
    referrerUserId: refCode.userId,
    referredUserId,
    bonusCents: REFERRAL_BONUS_CENTS,
    paid: false,
    createdAt: timestamp()
  };
  store.referralEvents.push(event);
  return { module: 'marketplace', action: 'register-referral', ok: true, referralEvent: event };
}

export async function list_referrals(body: any, _params?: any, _query?: any) {
  const userId = body?.actor?.id || body?.userId;
  if (!userId) return { module: 'marketplace', action: 'list-referrals', error: 'userId is required' };
  const events = store.referralEvents.filter(ev => ev.referrerUserId === userId);
  const totalBonusCents = events.filter(ev => ev.paid).reduce((sum, ev) => sum + ev.bonusCents, 0);
  return { module: 'marketplace', action: 'list-referrals', ok: true, referrals: events, totalBonusCents };
}

// ─── Market / City Config ────────────────────────────────────────────────────

export async function create_market(body: any, _params?: any, _query?: any) {
  const name = (body?.name || '').trim();
  const city = (body?.city || '').trim();
  const country = (body?.country || '').trim();
  if (!name || !city || !country) {
    return { module: 'marketplace', action: 'create-market', error: 'name, city, and country are required' };
  }
  const market: MarketConfig = {
    id: makeId('mkt'),
    name,
    city,
    country,
    status: 'pre_launch',
    createdAt: timestamp(),
    updatedAt: timestamp()
  };
  store.markets.set(market.id, market);
  return { module: 'marketplace', action: 'create-market', ok: true, market };
}

export async function list_markets(_body?: any, _params?: any, _query?: any) {
  const markets = Array.from(store.markets.values());
  return { module: 'marketplace', action: 'list-markets', ok: true, markets };
}

export async function update_market_status(body: any, _params?: any, _query?: any) {
  const marketId = body?.marketId || body?.id;
  if (!marketId) return { module: 'marketplace', action: 'update-market-status', error: 'marketId is required' };
  const market = store.markets.get(marketId);
  if (!market) return { module: 'marketplace', action: 'update-market-status', error: 'market not found' };

  const validStatuses = ['pre_launch', 'active', 'paused', 'sunset'] as const;
  const status = body?.status;
  if (!validStatuses.includes(status)) {
    return { module: 'marketplace', action: 'update-market-status', error: `status must be one of: ${validStatuses.join(', ')}` };
  }
  if (status === 'active' && !market.launchedAt) {
    market.launchedAt = timestamp();
  }
  market.status = status;
  market.updatedAt = timestamp();
  markStoreDirty();
  return { module: 'marketplace', action: 'update-market-status', ok: true, market };
}

