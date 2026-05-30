import {
  awardLoyaltyPoints,
  getOrCreateLoyaltyAccount,
  getLoyaltyTier,
  makeId,
  markStoreDirty,
  store,
  timestamp,
  type LoyaltyTransaction
} from './data.store';

const POINTS_PER_RIDE = 10;
const POINTS_PER_DOLLAR = 1;

// Tier thresholds for display
export const TIER_THRESHOLDS = {
  bronze: 0,
  silver: 750,
  gold: 3000,
  platinum: 10000
};

function getUserId(body: any) {
  return body?.actor?.id || body?.userId;
}

export async function getAccount(body: any) {
  const userId = getUserId(body);
  if (!userId) return { module: 'loyalty', action: 'get', error: 'userId required' };

  const acct = getOrCreateLoyaltyAccount(userId);
  const nextTier = getNextTierInfo(acct.lifetimePoints);
  return { module: 'loyalty', ok: true, account: acct, nextTier, tierThresholds: TIER_THRESHOLDS };
}

function getNextTierInfo(lifetimePoints: number) {
  if (lifetimePoints >= 10000) return { tier: 'platinum', pointsNeeded: 0, message: 'You are at the highest tier!' };
  if (lifetimePoints >= 3000) return { tier: 'platinum', pointsNeeded: 10000 - lifetimePoints };
  if (lifetimePoints >= 750) return { tier: 'gold', pointsNeeded: 3000 - lifetimePoints };
  return { tier: 'silver', pointsNeeded: 750 - lifetimePoints };
}

export async function earnPointsForRide(userId: string, fareAmountCents: number, rideId: string) {
  const dollarAmount = Math.floor(fareAmountCents / 100);
  const rideBonus = POINTS_PER_RIDE;
  const farePoints = dollarAmount * POINTS_PER_DOLLAR;
  const totalPoints = rideBonus + farePoints;

  return awardLoyaltyPoints(userId, totalPoints, 'ride_completed', rideId);
}

export async function redeemPoints(body: any) {
  const userId = getUserId(body);
  if (!userId) return { module: 'loyalty', action: 'redeem', error: 'userId required' };

  const pointsToRedeem = Number(body?.points);
  if (!pointsToRedeem || pointsToRedeem <= 0) return { module: 'loyalty', action: 'redeem', error: 'points must be positive' };

  const acct = getOrCreateLoyaltyAccount(userId);
  if (acct.points < pointsToRedeem) {
    return { module: 'loyalty', action: 'redeem', error: 'insufficient points', available: acct.points };
  }

  // 100 points = $1 credit
  const creditCents = Math.floor(pointsToRedeem / 100) * 100;
  if (creditCents === 0) return { module: 'loyalty', action: 'redeem', error: 'minimum 100 points to redeem' };

  acct.points -= pointsToRedeem;
  acct.updatedAt = timestamp();
  store.loyaltyAccounts.set(userId, acct);

  const tx: LoyaltyTransaction = {
    id: makeId('ltx'),
    userId,
    points: -pointsToRedeem,
    type: 'redeem',
    reason: 'ride_credit',
    createdAt: timestamp()
  };
  store.loyaltyTransactions.push(tx);
  markStoreDirty();

  return {
    module: 'loyalty',
    action: 'redeem',
    ok: true,
    pointsRedeemed: pointsToRedeem,
    creditCents,
    remainingPoints: acct.points,
    transaction: tx
  };
}

export async function getTransactionHistory(body: any) {
  const userId = getUserId(body);
  if (!userId) return { module: 'loyalty', action: 'history', error: 'userId required' };

  const limit = Math.min(Number(body?.limit || 20), 100);
  const txs = store.loyaltyTransactions
    .filter(t => t.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);

  return { module: 'loyalty', ok: true, total: txs.length, transactions: txs };
}

export async function awardBonusPoints(body: any) {
  const userId = body?.userId;
  const points = Number(body?.points);
  const reason = body?.reason || 'admin_bonus';

  if (!userId || !points || points <= 0) {
    return { module: 'loyalty', action: 'award', error: 'userId and positive points required' };
  }

  const tx = awardLoyaltyPoints(userId, points, reason);
  return { module: 'loyalty', action: 'award', ok: true, transaction: tx };
}
