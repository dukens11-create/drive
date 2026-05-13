import { handleStripeWebhook } from './stripe.webhook';
import { makeId, pushWalletTx, store, timestamp } from './data.store';

export async function create_intent(body: any, _params?: any, _query?: any) {
  const amountCents = Number(body?.amountCents || body?.amount || 0);
  if (!amountCents || amountCents <= 0) return { module: 'payments', action: 'create-intent', error: 'amountCents must be positive' };

  const payment = {
    id: makeId('pay'),
    rideId: body?.rideId,
    riderId: body?.riderId,
    driverId: body?.driverId,
    amountCents,
    currency: body?.currency || 'USD',
    status: 'requires_capture' as const,
    createdAt: timestamp(),
    updatedAt: timestamp()
  };
  store.payments.set(payment.id, payment);

  return { module: 'payments', action: 'create-intent', ok: true, payment };
}

export async function capture(body: any, _params?: any, _query?: any) {
  const payment = store.payments.get(body?.paymentId);
  if (!payment) return { module: 'payments', action: 'capture', error: 'payment not found' };
  if (payment.status !== 'requires_capture') return { module: 'payments', action: 'capture', error: 'payment not capturable' };

  payment.status = 'captured';
  payment.updatedAt = timestamp();

  if (payment.riderId) pushWalletTx(payment.riderId, 'debit', payment.amountCents, `payment:${payment.id}:capture`);
  if (payment.driverId) pushWalletTx(payment.driverId, 'credit', Math.round(payment.amountCents * 0.8), `payment:${payment.id}:driver_payout`);

  return { module: 'payments', action: 'capture', ok: true, payment };
}

export async function refund(body: any, _params?: any, _query?: any) {
  const payment = store.payments.get(body?.paymentId);
  if (!payment) return { module: 'payments', action: 'refund', error: 'payment not found' };
  if (payment.status !== 'captured') return { module: 'payments', action: 'refund', error: 'payment not refundable' };

  payment.status = 'refunded';
  payment.updatedAt = timestamp();

  if (payment.riderId) pushWalletTx(payment.riderId, 'credit', payment.amountCents, `payment:${payment.id}:refund`);
  if (payment.driverId) pushWalletTx(payment.driverId, 'debit', Math.round(payment.amountCents * 0.8), `payment:${payment.id}:refund_reversal`);

  return { module: 'payments', action: 'refund', ok: true, payment };
}

export async function stripe_webhook(body: any, _params?: any, _query?: any) {
  const result = await handleStripeWebhook(body?.event || body);
  return { module: 'payments', action: 'stripe-webhook', ok: true, result };
}
