import {
  makeId,
  markStoreDirty,
  store,
  timestamp,
  getActiveSubscription,
  type SubscriptionPlan,
  type SubscriptionTier,
  type UserSubscription
} from './data.store';

// ─── Seed default plans ───────────────────────────────────────────────────────

function seedDefaultPlans() {
  if (store.subscriptionPlans.size > 0) return;

  const plans: SubscriptionPlan[] = [
    {
      id: makeId('plan'),
      name: 'Basic',
      tier: 'basic',
      priceCents: 999,
      billingCycleDays: 30,
      ridesIncluded: 10,
      discountPercent: 5,
      features: ['10 rides/month', '5% discount on rides', 'Priority support'],
      active: true,
      createdAt: timestamp()
    },
    {
      id: makeId('plan'),
      name: 'Premium',
      tier: 'premium',
      priceCents: 2499,
      billingCycleDays: 30,
      ridesIncluded: 30,
      discountPercent: 15,
      features: ['30 rides/month', '15% discount on rides', 'Priority dispatch', 'Free cancellations'],
      active: true,
      createdAt: timestamp()
    },
    {
      id: makeId('plan'),
      name: 'Unlimited',
      tier: 'unlimited',
      priceCents: 4999,
      billingCycleDays: 30,
      ridesIncluded: 'unlimited',
      discountPercent: 25,
      features: ['Unlimited rides', '25% discount', 'Priority dispatch', 'Free cancellations', 'Premium vehicles'],
      active: true,
      createdAt: timestamp()
    }
  ];

  for (const plan of plans) store.subscriptionPlans.set(plan.id, plan);
  markStoreDirty();
}

seedDefaultPlans();

// ─── Service functions ────────────────────────────────────────────────────────

export async function listPlans() {
  const plans = Array.from(store.subscriptionPlans.values()).filter(p => p.active);
  return { module: 'subscription', ok: true, plans };
}

export async function subscribe(body: any) {
  const userId = body?.actor?.id || body?.userId;
  if (!userId) return { module: 'subscription', action: 'subscribe', error: 'userId required' };

  const planId = body?.planId;
  if (!planId) return { module: 'subscription', action: 'subscribe', error: 'planId required' };

  const plan = store.subscriptionPlans.get(planId);
  if (!plan || !plan.active) return { module: 'subscription', action: 'subscribe', error: 'plan not found or inactive' };

  const existing = getActiveSubscription(userId);
  if (existing) return { module: 'subscription', action: 'subscribe', error: 'user already has an active subscription' };

  const now = new Date();
  const periodEnd = new Date(now.getTime() + plan.billingCycleDays * 24 * 60 * 60 * 1000);

  const sub: UserSubscription = {
    id: makeId('sub'),
    userId,
    planId,
    tier: plan.tier,
    status: 'active',
    ridesUsedThisCycle: 0,
    currentPeriodStart: now.toISOString(),
    currentPeriodEnd: periodEnd.toISOString(),
    createdAt: timestamp(),
    updatedAt: timestamp()
  };

  store.userSubscriptions.set(sub.id, sub);
  markStoreDirty();

  return { module: 'subscription', action: 'subscribe', ok: true, subscription: sub, plan };
}

export async function cancelSubscription(body: any) {
  const userId = body?.actor?.id || body?.userId;
  if (!userId) return { module: 'subscription', action: 'cancel', error: 'userId required' };

  const sub = getActiveSubscription(userId);
  if (!sub) return { module: 'subscription', action: 'cancel', error: 'no active subscription found' };

  sub.status = 'canceled';
  sub.canceledAt = timestamp();
  sub.updatedAt = timestamp();
  store.userSubscriptions.set(sub.id, sub);
  markStoreDirty();

  return { module: 'subscription', action: 'cancel', ok: true, subscription: sub };
}

export async function getMySubscription(body: any) {
  const userId = body?.actor?.id || body?.userId;
  if (!userId) return { module: 'subscription', action: 'get', error: 'userId required' };

  const sub = getActiveSubscription(userId);
  if (!sub) return { module: 'subscription', ok: true, subscription: null };

  const plan = store.subscriptionPlans.get(sub.planId);
  return { module: 'subscription', ok: true, subscription: sub, plan: plan || null };
}

export async function getSubscriptionDiscount(userId: string): Promise<number> {
  const sub = getActiveSubscription(userId);
  if (!sub) return 0;
  const plan = store.subscriptionPlans.get(sub.planId);
  return plan?.discountPercent || 0;
}
