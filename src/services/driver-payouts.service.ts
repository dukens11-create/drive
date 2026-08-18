import { env } from '../config/env';
import {
  markStoreDirty,
  pushWalletTx,
  store,
  timestamp,
  type Ride
} from '../database/data.store';
import { getStripeClient, isStripeEnabled } from './stripe-client';

function appUrl(pathname: string) {
  const base = String(env.appBaseUrl || 'http://localhost:8080').replace(/\/+$/, '');
  return `${base}${pathname.startsWith('/') ? pathname : `/${pathname}`}`;
}

function publicConnectProfile(profile: any) {
  return {
    connected: Boolean(profile?.stripeConnectedAccountId),
    accountId: profile?.stripeConnectedAccountId,
    onboardingComplete: Boolean(profile?.stripeConnectOnboardingComplete),
    chargesEnabled: Boolean(profile?.stripeChargesEnabled),
    payoutsEnabled: Boolean(profile?.stripePayoutsEnabled),
    updatedAt: profile?.stripeConnectUpdatedAt
  };
}

async function refreshAccountState(userId: string) {
  const profile = store.drivers.get(userId);
  if (!profile) throw new Error('driver not found');
  if (!profile.stripeConnectedAccountId) return publicConnectProfile(profile);
  if (!isStripeEnabled()) throw new Error('Stripe is not configured');

  const stripe = getStripeClient() as any;
  const account = await stripe.accounts.retrieve(profile.stripeConnectedAccountId);

  profile.stripeConnectOnboardingComplete = Boolean(account.details_submitted);
  profile.stripeChargesEnabled = Boolean(account.charges_enabled);
  profile.stripePayoutsEnabled = Boolean(account.payouts_enabled);
  profile.stripeConnectUpdatedAt = timestamp();
  markStoreDirty();

  return {
    ...publicConnectProfile(profile),
    requirements: {
      currentlyDue: Array.isArray(account.requirements?.currently_due)
        ? account.requirements.currently_due
        : [],
      pastDue: Array.isArray(account.requirements?.past_due)
        ? account.requirements.past_due
        : [],
      disabledReason: account.requirements?.disabled_reason || null
    }
  };
}

export async function connectStatus(userId: string) {
  const profile = store.drivers.get(userId);
  if (!profile) return { module: 'driver-payouts', action: 'status', error: 'driver not found' };

  if (!profile.stripeConnectedAccountId) {
    return {
      module: 'driver-payouts',
      action: 'status',
      ok: true,
      connect: publicConnectProfile(profile)
    };
  }

  try {
    return {
      module: 'driver-payouts',
      action: 'status',
      ok: true,
      connect: await refreshAccountState(userId)
    };
  } catch (error: any) {
    return {
      module: 'driver-payouts',
      action: 'status',
      error: String(error?.message || 'could not load Stripe Connect status')
    };
  }
}

export async function createOnboardingLink(userId: string) {
  const profile = store.drivers.get(userId);
  if (!profile) return { module: 'driver-payouts', action: 'onboarding', error: 'driver not found' };
  if (!isStripeEnabled()) {
    return { module: 'driver-payouts', action: 'onboarding', error: 'Stripe is not configured' };
  }

  const stripe = getStripeClient() as any;
  let accountId = profile.stripeConnectedAccountId;

  if (!accountId) {
    const user = store.users.get(userId);
    const account = await stripe.accounts.create({
      type: 'express',
      email: user?.email,
      capabilities: {
        transfers: { requested: true }
      },
      business_profile: {
        product_description: 'Independent driver providing transportation services through FlupFlap.'
      },
      metadata: {
        userId,
        role: 'driver',
        platform: 'flupflap'
      }
    });

    accountId = account.id;
    profile.stripeConnectedAccountId = accountId;
    profile.stripeConnectOnboardingComplete = Boolean(account.details_submitted);
    profile.stripeChargesEnabled = Boolean(account.charges_enabled);
    profile.stripePayoutsEnabled = Boolean(account.payouts_enabled);
    profile.stripeConnectUpdatedAt = timestamp();
    markStoreDirty();
  }

  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: appUrl('/driver-payouts/connect/refresh'),
    return_url: appUrl('/driver-payouts/connect/return'),
    type: 'account_onboarding'
  });

  return {
    module: 'driver-payouts',
    action: 'onboarding',
    ok: true,
    url: link.url,
    expiresAt: link.expires_at,
    connect: publicConnectProfile(profile)
  };
}

export async function createDashboardLink(userId: string) {
  const profile = store.drivers.get(userId);
  if (!profile?.stripeConnectedAccountId) {
    return { module: 'driver-payouts', action: 'dashboard', error: 'Stripe Connect onboarding is required' };
  }
  if (!isStripeEnabled()) {
    return { module: 'driver-payouts', action: 'dashboard', error: 'Stripe is not configured' };
  }

  const stripe = getStripeClient() as any;
  const link = await stripe.accounts.createLoginLink(profile.stripeConnectedAccountId);
  return { module: 'driver-payouts', action: 'dashboard', ok: true, url: link.url };
}

function alreadyDebitedForTransfer(rideId: string) {
  return store.walletTx.some(tx =>
    tx.kind === 'debit' &&
    tx.reason === `ride:${rideId}:stripe_transfer`
  );
}

export async function transferRideEarnings(ride: Ride) {
  if (!ride.driverId) {
    return { ok: false, status: 'failed' as const, reason: 'ride has no driver' };
  }
  if (!ride.driverPayout || ride.driverPayout <= 0) {
    return { ok: false, status: 'failed' as const, reason: 'ride payout amount is invalid' };
  }
  if (ride.stripeTransferId) {
    return { ok: true, status: 'processed' as const, transferId: ride.stripeTransferId, idempotent: true };
  }
  if (!isStripeEnabled()) {
    return { ok: false, status: 'pending' as const, reason: 'Stripe is not configured' };
  }

  const profile = store.drivers.get(ride.driverId);
  if (!profile?.stripeConnectedAccountId) {
    return { ok: false, status: 'pending' as const, reason: 'driver has not connected Stripe payouts' };
  }

  try {
    const state: any = await refreshAccountState(ride.driverId);
    if (!state.onboardingComplete || !state.payoutsEnabled) {
      return { ok: false, status: 'pending' as const, reason: 'driver Stripe account is not payout-ready' };
    }

    const payment = Array.from(store.payments.values()).find(item =>
      item.rideId === ride.id &&
      item.provider === 'stripe' &&
      item.status === 'captured'
    );

    const stripe = getStripeClient() as any;
    const transferPayload: any = {
      amount: Math.round(ride.driverPayout),
      currency: String(payment?.currency || 'usd').toLowerCase(),
      destination: profile.stripeConnectedAccountId,
      metadata: {
        rideId: ride.id,
        driverId: ride.driverId,
        platform: 'flupflap'
      }
    };

    if (payment?.stripeChargeId) {
      transferPayload.source_transaction = payment.stripeChargeId;
    }

    const transfer = await stripe.transfers.create(
      transferPayload,
      { idempotencyKey: `flupflap_ride_transfer_${ride.id}` }
    );

    ride.stripeTransferId = transfer.id;
    ride.payoutStatus = 'processed';
    ride.payoutFailureReason = undefined;

    if (!alreadyDebitedForTransfer(ride.id)) {
      pushWalletTx(
        ride.driverId,
        'debit',
        Math.round(ride.driverPayout),
        `ride:${ride.id}:stripe_transfer`
      );
    }

    markStoreDirty();
    return { ok: true, status: 'processed' as const, transferId: transfer.id };
  } catch (error: any) {
    const message = String(error?.message || 'Stripe transfer failed');
    ride.payoutStatus = 'pending';
    ride.payoutFailureReason = message.slice(0, 500);
    markStoreDirty();
    return { ok: false, status: 'pending' as const, reason: message };
  }
}

export async function reconcilePendingRideTransfers(limit = 50) {
  if (!isStripeEnabled()) return { ok: true, attempted: 0, processed: 0, skipped: true };

  const pending = Array.from(store.rides.values())
    .filter(ride =>
      ride.status === 'completed' &&
      Boolean(ride.driverId) &&
      Number(ride.driverPayout || 0) > 0 &&
      !ride.stripeTransferId &&
      ride.payoutStatus !== 'processed'
    )
    .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt))
    .slice(0, Math.max(1, Math.min(200, limit)));

  let processed = 0;
  for (const ride of pending) {
    const result = await transferRideEarnings(ride);
    if (result.ok) processed += 1;
  }

  return { ok: true, attempted: pending.length, processed };
}

export async function syncConnectedAccountFromWebhook(account: any) {
  const userId = String(account?.metadata?.userId || '').trim();
  if (!userId) return { handled: false, reason: 'missing userId metadata' };

  const profile = store.drivers.get(userId);
  if (!profile) return { handled: false, reason: 'driver not found' };

  profile.stripeConnectedAccountId = String(account.id || profile.stripeConnectedAccountId || '');
  profile.stripeConnectOnboardingComplete = Boolean(account.details_submitted);
  profile.stripeChargesEnabled = Boolean(account.charges_enabled);
  profile.stripePayoutsEnabled = Boolean(account.payouts_enabled);
  profile.stripeConnectUpdatedAt = timestamp();
  markStoreDirty();

  return { handled: true, userId, connect: publicConnectProfile(profile) };
}