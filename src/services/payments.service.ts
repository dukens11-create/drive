import { timingSafeEqual } from 'crypto';
import { handleStripeWebhook } from '../utils/stripe.webhook';
import { env } from '../config/env';
import { makeId, markStoreDirty, store, timestamp, type PaymentMethod, type PaymentMethodType } from '../database/data.store';
import { applyCaptureLedger, applyRefundLedger } from '../utils/payment.records';

const PAYMENT_METHOD_TYPES = new Set<PaymentMethodType>(['card', 'apple_pay', 'google_pay', 'paypal', 'bank_transfer', 'wallet']);

function normalizePaymentMethodType(value: any): PaymentMethodType | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.toLowerCase() as PaymentMethodType;
  return PAYMENT_METHOD_TYPES.has(normalized) ? normalized : undefined;
}

function sanitizeLast4(value: any) {
  if (typeof value !== 'string') return undefined;
  const digits = value.replace(/\D/g, '');
  if (digits.length < 4) return undefined;
  return digits.slice(-4);
}

export async function create_intent(body: any, _params?: any, _query?: any) {
  const amountCents = Number(body?.amountCents || body?.amount || 0);
  if (!amountCents || amountCents <= 0) return { module: 'payments', action: 'create-intent', error: 'amountCents must be positive' };

  const paymentMethod = body?.paymentMethodId ? store.paymentMethods.get(body.paymentMethodId) : undefined;
  if (body?.paymentMethodId && !paymentMethod) {
    return { module: 'payments', action: 'create-intent', error: 'payment method not found' };
  }

  const paymentMethodType = normalizePaymentMethodType(body?.paymentMethodType || paymentMethod?.type);
  if ((body?.paymentMethodType || paymentMethod?.type) && !paymentMethodType) {
    return { module: 'payments', action: 'create-intent', error: 'unsupported payment method type' };
  }

  const providerIntentId = body?.providerIntentId || makeId('pi');
  const providerCheckoutSessionId = body?.checkoutSessionId || makeId('cs');
  const payment = {
    id: makeId('pay'),
    rideId: body?.rideId,
    riderId: body?.riderId,
    driverId: body?.driverId,
    paymentMethodId: paymentMethod?.id,
    paymentMethodType,
    description: body?.description,
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

  const invoice = applyCaptureLedger(payment);
  return { module: 'payments', action: 'capture', ok: true, payment, invoice };
}

export async function refund(body: any, _params?: any, _query?: any) {
  const payment = store.payments.get(body?.paymentId);
  if (!payment) return { module: 'payments', action: 'refund', error: 'payment not found' };
  if (payment.status === 'refunded') return { module: 'payments', action: 'refund', ok: true, payment, idempotent: true };
  if (payment.status !== 'captured') return { module: 'payments', action: 'refund', error: 'payment not refundable' };

  const requestedAmountCents = body?.amountCents == null ? payment.amountCents : Number(body.amountCents);
  if (!requestedAmountCents || requestedAmountCents <= 0) return { module: 'payments', action: 'refund', error: 'amountCents must be positive' };
  if (requestedAmountCents !== payment.amountCents) return { module: 'payments', action: 'refund', error: 'partial refunds are not supported' };

  const destination = body?.destination === 'original_payment_method' ? 'original_payment_method' : 'wallet';

  payment.status = 'refunded';
  payment.refundedAt = timestamp();
  payment.updatedAt = timestamp();
  markStoreDirty();

  const { refund, invoice } = applyRefundLedger(payment, destination, body?.reason);

  return { module: 'payments', action: 'refund', ok: true, payment, refund, invoice };
}

export async function save_method(body: any, _params?: any, _query?: any) {
  const userId = body?.userId;
  const type = normalizePaymentMethodType(body?.type || body?.paymentMethodType);
  if (!userId || !type) return { module: 'payments', action: 'save-method', error: 'userId and supported payment method type are required' };

  const existing = body?.paymentMethodId ? store.paymentMethods.get(body.paymentMethodId) : undefined;
  if (body?.paymentMethodId && (!existing || existing.userId !== userId)) {
    return { module: 'payments', action: 'save-method', error: 'payment method not found' };
  }

  const userMethods = Array.from(store.paymentMethods.values()).filter(method => method.userId === userId);
  const shouldBeDefault = body?.isDefault === true || (!existing && userMethods.length === 0);
  if (shouldBeDefault) {
    for (const method of userMethods) {
      if (existing?.id === method.id) continue;
      method.isDefault = false;
      method.updatedAt = timestamp();
    }
  }

  const paymentMethod: PaymentMethod = existing || {
    id: body?.paymentMethodId || makeId('pm'),
    userId,
    provider: 'stripe_mock' as const,
    createdAt: timestamp(),
    updatedAt: timestamp(),
    type,
    isDefault: shouldBeDefault
  };

  paymentMethod.type = type;
  paymentMethod.brand = body?.brand;
  paymentMethod.label = body?.label;
  paymentMethod.last4 = sanitizeLast4(body?.last4);
  paymentMethod.expiryMonth = body?.expiryMonth == null ? undefined : Number(body.expiryMonth);
  paymentMethod.expiryYear = body?.expiryYear == null ? undefined : Number(body.expiryYear);
  paymentMethod.token = body?.token;
  paymentMethod.isDefault = shouldBeDefault || existing?.isDefault === true;
  paymentMethod.updatedAt = timestamp();
  store.paymentMethods.set(paymentMethod.id, paymentMethod);

  return { module: 'payments', action: 'save-method', ok: true, paymentMethod };
}

export async function list_methods(body: any, _params?: any, _query?: any) {
  const userId = body?.userId;
  if (!userId) return { module: 'payments', action: 'list-methods', error: 'userId is required' };

  const methods = Array.from(store.paymentMethods.values())
    .filter(method => method.userId === userId)
    .sort((a, b) => ((b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0)) || b.updatedAt.localeCompare(a.updatedAt));

  return { module: 'payments', action: 'list-methods', ok: true, userId, methods };
}

export async function set_default_method(body: any, _params?: any, _query?: any) {
  const userId = body?.userId;
  const paymentMethod = store.paymentMethods.get(body?.paymentMethodId);
  if (!userId || !paymentMethod || paymentMethod.userId !== userId) {
    return { module: 'payments', action: 'set-default-method', error: 'payment method not found' };
  }

  for (const method of store.paymentMethods.values()) {
    if (method.userId !== userId) continue;
    method.isDefault = method.id === paymentMethod.id;
    method.updatedAt = timestamp();
  }
  markStoreDirty();

  return { module: 'payments', action: 'set-default-method', ok: true, paymentMethod };
}

export async function remove_method(body: any, _params?: any, _query?: any) {
  const userId = body?.userId;
  const paymentMethod = store.paymentMethods.get(body?.paymentMethodId);
  if (!userId || !paymentMethod || paymentMethod.userId !== userId) {
    return { module: 'payments', action: 'remove-method', error: 'payment method not found' };
  }

  const wasDefault = paymentMethod.isDefault;
  store.paymentMethods.delete(paymentMethod.id);

  if (wasDefault) {
    const replacement = Array.from(store.paymentMethods.values())
      .filter(method => method.userId === userId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
    if (replacement) {
      replacement.isDefault = true;
      replacement.updatedAt = timestamp();
      store.paymentMethods.set(replacement.id, replacement);
      markStoreDirty();
    }
  }

  return { module: 'payments', action: 'remove-method', ok: true, paymentMethodId: paymentMethod.id };
}

export async function get_invoice(body: any, _params?: any, _query?: any) {
  const invoice = body?.invoiceId
    ? store.invoices.get(body.invoiceId)
    : Array.from(store.invoices.values()).find(entry => entry.paymentId === body?.paymentId);
  if (!invoice) return { module: 'payments', action: 'get-invoice', error: 'invoice not found' };
  return { module: 'payments', action: 'get-invoice', ok: true, invoice };
}

export async function list_invoices(body: any, _params?: any, _query?: any) {
  const userId = body?.userId;
  if (!userId) return { module: 'payments', action: 'list-invoices', error: 'userId is required' };

  const invoices = Array.from(store.invoices.values())
    .filter(invoice => invoice.recipientUserId === userId || invoice.payerUserId === userId)
    .sort((a, b) => b.invoiceDate.localeCompare(a.invoiceDate));
  return { module: 'payments', action: 'list-invoices', ok: true, userId, invoices };
}

export async function list_refunds(body: any, _params?: any, _query?: any) {
  const paymentId = body?.paymentId;
  const userId = body?.userId;
  if (!paymentId && !userId) {
    return { module: 'payments', action: 'list-refunds', error: 'paymentId or userId is required' };
  }

  const refunds = Array.from(store.refunds.values())
    .filter(refund => {
      const matchesPayment = paymentId ? refund.paymentId === paymentId : true;
      const matchesUser = userId ? refund.userId === userId : true;
      return matchesPayment && matchesUser;
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return { module: 'payments', action: 'list-refunds', ok: true, refunds };
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
