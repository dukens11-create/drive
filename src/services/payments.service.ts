import { timingSafeEqual } from 'crypto';
import { handleStripeWebhook } from '../utils/stripe.webhook';
import { env } from '../config/env';
import { makeId, markStoreDirty, pushWalletTx, store, timestamp } from '../database/data.store';
import { DRIVER_PAYOUT_RATE } from '../constants/payments.constants';

export async function create_intent(body: any, _params?: any, _query?: any) {
  const amountCents = Number(body?.amountCents || body?.amount || 0);
  if (!amountCents || amountCents <= 0) return { module: 'payments', action: 'create-intent', error: 'amountCents must be positive' };

  const providerIntentId = body?.providerIntentId || makeId('pi');
  const providerCheckoutSessionId = body?.checkoutSessionId || makeId('cs');
  const payment = {
    id: makeId('pay'),
    rideId: body?.rideId,
    riderId: body?.riderId,
    driverId: body?.driverId,
    provider: 'stripe_mock' as const,
    providerIntentId,
    providerCheckoutSessionId,
    clientSecret: `${providerIntentId}_secret_${makeId('cs')}`,
    amountCents,
    currency: body?.currency || 'USD',
    status: 'requires_capture' as const,
    createdAt: timestamp(),
    updatedAt: timestamp()
  };
  store.payments.set(payment.id, payment);

  return {
    module: 'payments',
    action: 'create-intent',
    ok: true,
    payment,
    paymentIntent: {
      id: payment.providerIntentId,
      clientSecret: payment.clientSecret,
      checkoutSessionId: payment.providerCheckoutSessionId,
      amountCents: payment.amountCents,
      currency: payment.currency
    }
  };
}

export async function capture(body: any, _params?: any, _query?: any) {
  const payment = store.payments.get(body?.paymentId);
  if (!payment) return { module: 'payments', action: 'capture', error: 'payment not found' };
  if (payment.status === 'captured') return { module: 'payments', action: 'capture', ok: true, payment, idempotent: true };
  if (payment.status !== 'requires_capture') return { module: 'payments', action: 'capture', error: 'payment not capturable' };

  payment.status = 'captured';
  payment.capturedAt = timestamp();
  payment.updatedAt = timestamp();
  markStoreDirty();

  if (payment.riderId) pushWalletTx(payment.riderId, 'debit', payment.amountCents, `payment:${payment.id}:capture`);
  if (payment.driverId) pushWalletTx(payment.driverId, 'credit', Math.round(payment.amountCents * DRIVER_PAYOUT_RATE), `payment:${payment.id}:driver_payout`);

  return { module: 'payments', action: 'capture', ok: true, payment };
}

export async function refund(body: any, _params?: any, _query?: any) {
  const payment = store.payments.get(body?.paymentId);
  if (!payment) return { module: 'payments', action: 'refund', error: 'payment not found' };
  if (payment.status === 'refunded') return { module: 'payments', action: 'refund', ok: true, payment, idempotent: true };
  if (payment.status !== 'captured') return { module: 'payments', action: 'refund', error: 'payment not refundable' };

  payment.status = 'refunded';
  payment.refundedAt = timestamp();
  payment.updatedAt = timestamp();
  markStoreDirty();

  if (payment.riderId) pushWalletTx(payment.riderId, 'credit', payment.amountCents, `payment:${payment.id}:refund`);
  if (payment.driverId) pushWalletTx(payment.driverId, 'debit', Math.round(payment.amountCents * DRIVER_PAYOUT_RATE), `payment:${payment.id}:refund_reversal`);

  return { module: 'payments', action: 'refund', ok: true, payment };
}

function readStripeSignature(headers?: any) {
  const raw = headers?.['stripe-signature'] || headers?.['Stripe-Signature'];
  if (Array.isArray(raw)) return raw[0];
  if (typeof raw === 'string') return raw;
  return undefined;
}

function signaturesMatch(expected: string, received?: string) {
  if (!received) return false;
  const expectedBuffer = Buffer.from(expected, 'utf8');
  const receivedBuffer = Buffer.from(received, 'utf8');
  if (expectedBuffer.length !== receivedBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, receivedBuffer);
}

export async function stripe_webhook(body: any, _params?: any, _query?: any, headers?: any) {
  const event = body?.event || body;
  if (!event || typeof event?.type !== 'string') {
    return { module: 'payments', action: 'stripe-webhook', error: 'invalid stripe event payload' };
  }

  if (env.stripeWebhookSecret) {
    const signature = readStripeSignature(headers);
    if (!signaturesMatch(env.stripeWebhookSecret, signature)) {
      return { module: 'payments', action: 'stripe-webhook', error: 'invalid stripe signature' };
    }
  }

  const result = await handleStripeWebhook(body?.event || body);
  return { module: 'payments', action: 'stripe-webhook', ok: true, result };
}
