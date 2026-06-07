import { handleStripeWebhook } from '../utils/stripe.webhook';
import { env } from '../config/env';
import { makeId, markStoreDirty, store, timestamp, type Payment, type PaymentMethod, type PaymentMethodType } from '../database/data.store';
import { applyCaptureLedger, applyRefundLedger } from '../utils/payment.records';
import { createStripeIdempotencyKey, getOrCreateStripeCustomerId, getStripeClient, isStripeEnabled } from './stripe-client';
import { constructStripeEvent, getStripeSignatureHeader } from '../utils/stripe-signature';
import { getErrorDetails, logger } from '../utils';

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

function toStripeRefundReason(reason: any): 'duplicate' | 'fraudulent' | 'requested_by_customer' {
  if (reason === 'duplicate') return 'duplicate';
  if (reason === 'fraudulent') return 'fraudulent';
  return 'requested_by_customer';
}

function savePaymentMethodLocally(input: {
  existing?: PaymentMethod;
  userId: string;
  type: PaymentMethodType;
  brand?: string;
  label?: string;
  last4?: string;
  expiryMonth?: number;
  expiryYear?: number;
  token?: string;
  isDefault: boolean;
  provider: 'stripe_mock' | 'stripe';
}) {
  const paymentMethod: PaymentMethod = input.existing || {
    id: input.existing?.id || makeId('pm'),
    userId: input.userId,
    provider: input.provider,
    createdAt: timestamp(),
    updatedAt: timestamp(),
    type: input.type,
    isDefault: input.isDefault
  };

  paymentMethod.provider = input.provider;
  paymentMethod.type = input.type;
  paymentMethod.brand = input.brand;
  paymentMethod.label = input.label;
  paymentMethod.last4 = sanitizeLast4(input.last4);
  paymentMethod.expiryMonth = input.expiryMonth;
  paymentMethod.expiryYear = input.expiryYear;
  paymentMethod.token = input.token;
  paymentMethod.isDefault = input.isDefault;
  paymentMethod.updatedAt = timestamp();

  store.paymentMethods.set(paymentMethod.id, paymentMethod);
  return paymentMethod;
}

async function createStripeIntent(body: any, amountCents: number, paymentMethod?: PaymentMethod) {
  const paymentId = makeId('pay');
  const currency = String(body?.currency || 'usd').toLowerCase();
  const riderId = body?.riderId;
  const customerId = riderId ? await getOrCreateStripeCustomerId(riderId) : undefined;
  const idempotencyKey = createStripeIdempotencyKey(body?.idempotencyKey);

  const intent = await getStripeClient().paymentIntents.create({
    amount: amountCents,
    currency,
    customer: customerId,
    payment_method: body?.providerPaymentMethodId || body?.stripePaymentMethodId || paymentMethod?.token,
    payment_method_types: ['card'],
    metadata: {
      riderId: body?.riderId || '',
      rideId: body?.rideId || '',
      paymentId,
      type: 'ride_payment'
    }
  }, {
    idempotencyKey
  });

  const chargeId = typeof intent.latest_charge === 'string' ? intent.latest_charge : undefined;
  const paymentStatus: Payment['status'] = intent.status === 'succeeded' ? 'captured' : 'requires_capture';
  const payment: Payment = {
    id: paymentId,
    rideId: body?.rideId,
    riderId: body?.riderId,
    driverId: body?.driverId,
    paymentMethodId: paymentMethod?.id,
    paymentMethodType: normalizePaymentMethodType(body?.paymentMethodType || paymentMethod?.type || 'card'),
    description: body?.description,
    provider: 'stripe' as const,
    providerIntentId: intent.id,
    providerCheckoutSessionId: body?.checkoutSessionId || makeId('cs'),
    clientSecret: intent.client_secret || '',
    stripePaymentIntentId: intent.id,
    stripeChargeId: chargeId,
    idempotencyKey,
    amountCents,
    currency: currency.toUpperCase(),
    status: paymentStatus,
    threeDSecureRequired: intent.status === 'requires_action',
    threeDSecureAuthenticated: intent.status === 'succeeded',
    createdAt: timestamp(),
    updatedAt: timestamp()
  };

  if (payment.status === 'captured') {
    payment.capturedAt = timestamp();
    applyCaptureLedger(payment);
  }

  store.payments.set(payment.id, payment);

  return {
    module: 'payments',
    action: 'create-intent',
    ok: true,
    clientSecret: payment.clientSecret,
    paymentIntentId: payment.providerIntentId,
    amount: payment.amountCents,
    status: intent.status,
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

function createMockIntent(body: any, amountCents: number, paymentMethod?: PaymentMethod) {
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
    clientSecret: payment.clientSecret,
    paymentIntentId: payment.providerIntentId,
    amount: payment.amountCents,
    status: 'requires_payment_method',
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

export async function create_intent(body: any, _params?: any, _query?: any) {
  const amountCents = Number(body?.amountCents || body?.amount || 0);
  if (!amountCents || amountCents <= 0) return { module: 'payments', action: 'create-intent', error: 'amountCents must be positive' };

  const paymentMethod = body?.paymentMethodId ? store.paymentMethods.get(body.paymentMethodId) : undefined;
  if (body?.paymentMethodId && !paymentMethod) {
    return { module: 'payments', action: 'create-intent', error: 'payment method not found' };
  }

  if (!isStripeEnabled()) {
    return createMockIntent(body, amountCents, paymentMethod);
  }

  try {
    return await createStripeIntent(body, amountCents, paymentMethod);
  } catch (error: any) {
    const stripeCode = error?.code as string | undefined;
    if (stripeCode === 'card_declined') {
      return { module: 'payments', action: 'create-intent', ok: false, error: 'card_declined', code: stripeCode, message: 'Your card was declined. Try another payment method.' };
    }
    return { module: 'payments', action: 'create-intent', ok: false, error: 'stripe_unavailable', message: 'Payment processing unavailable. Try again later.' };
  }
}

export async function capture(body: any, _params?: any, _query?: any) {
  const payment = store.payments.get(body?.paymentId);
  if (!payment) return { module: 'payments', action: 'capture', error: 'payment not found' };
  if (payment.status === 'captured') return { module: 'payments', action: 'capture', ok: true, payment, idempotent: true };
  if (payment.status !== 'requires_capture') return { module: 'payments', action: 'capture', error: 'payment not capturable' };

  if (payment.provider === 'stripe' && isStripeEnabled()) {
    try {
      const intent = await getStripeClient().paymentIntents.confirm(payment.providerIntentId, {
        payment_method: body?.paymentMethodId
      }, {
        idempotencyKey: createStripeIdempotencyKey(body?.idempotencyKey || payment.idempotencyKey)
      });

      payment.threeDSecureRequired = intent.status === 'requires_action';
      payment.threeDSecureAuthenticated = intent.status === 'succeeded';

      if (intent.status === 'requires_action') {
        payment.updatedAt = timestamp();
        markStoreDirty();
        return {
          module: 'payments',
          action: 'capture',
          ok: false,
          error: 'authentication_required',
          clientSecret: intent.client_secret,
          message: '3D Secure authentication required'
        };
      }

      if (intent.status !== 'succeeded') {
        return { module: 'payments', action: 'capture', ok: false, error: 'stripe_unavailable', message: 'Payment processing unavailable. Try again later.' };
      }

      payment.stripeChargeId = typeof intent.latest_charge === 'string' ? intent.latest_charge : payment.stripeChargeId;
    } catch (error: any) {
      const stripeCode = error?.code as string | undefined;
      if (stripeCode === 'card_declined') {
        payment.status = 'failed';
        payment.updatedAt = timestamp();
        markStoreDirty();
        return { module: 'payments', action: 'capture', ok: false, error: 'card_declined', code: stripeCode, message: 'Your card was declined. Try another payment method.' };
      }
      return { module: 'payments', action: 'capture', ok: false, error: 'stripe_unavailable', message: 'Payment processing unavailable. Try again later.' };
    }
  }

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

  if (payment.provider === 'stripe' && isStripeEnabled()) {
    try {
      const refundResult = await getStripeClient().refunds.create({
        payment_intent: payment.providerIntentId,
        amount: requestedAmountCents,
        reason: toStripeRefundReason(body?.reason),
        metadata: {
          refundReason: body?.reason || ''
        }
      }, {
        idempotencyKey: createStripeIdempotencyKey(body?.idempotencyKey)
      });
      payment.stripeRefundId = refundResult.id;
    } catch (error) {
      logger.error('stripe refund failed', getErrorDetails(error));
      return { module: 'payments', action: 'refund', ok: false, error: 'stripe_unavailable', message: 'Payment processing unavailable. Try again later.' };
    }
  }

  payment.status = 'refunded';
  payment.refundedAt = timestamp();
  payment.updatedAt = timestamp();
  markStoreDirty();

  const { refund, invoice } = applyRefundLedger(payment, destination, body?.reason);
  if (payment.stripeRefundId) {
    refund.providerRefundId = payment.stripeRefundId;
  }

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

  if (isStripeEnabled()) {
    try {
      const customerId = await getOrCreateStripeCustomerId(userId);
      const providedPaymentMethodId = body?.token || body?.providerPaymentMethodId || body?.stripePaymentMethodId;
      if (providedPaymentMethodId) {
        await getStripeClient().paymentMethods.attach(providedPaymentMethodId, { customer: customerId });
        if (shouldBeDefault) {
          await getStripeClient().customers.update(customerId, {
            invoice_settings: {
              default_payment_method: providedPaymentMethodId
            }
          });
        }
      }
    } catch (error) {
      logger.error('stripe save method failed', getErrorDetails(error));
      return { module: 'payments', action: 'save-method', ok: false, error: 'stripe_unavailable', message: 'Payment processing unavailable. Try again later.' };
    }
  }

  const paymentMethod = savePaymentMethodLocally({
    existing,
    userId,
    type,
    brand: body?.brand,
    label: body?.label,
    last4: body?.last4,
    expiryMonth: body?.expiryMonth == null ? undefined : Number(body.expiryMonth),
    expiryYear: body?.expiryYear == null ? undefined : Number(body.expiryYear),
    token: body?.token || body?.providerPaymentMethodId || body?.stripePaymentMethodId,
    isDefault: shouldBeDefault || existing?.isDefault === true,
    provider: isStripeEnabled() ? 'stripe' : 'stripe_mock'
  });

  return { module: 'payments', action: 'save-method', ok: true, paymentMethod };
}

export async function list_methods(body: any, _params?: any, _query?: any) {
  const userId = body?.userId;
  if (!userId) return { module: 'payments', action: 'list-methods', error: 'userId is required' };

  if (isStripeEnabled()) {
    try {
      const customerId = await getOrCreateStripeCustomerId(userId);
      const customer = await getStripeClient().customers.retrieve(customerId);
      const defaultPaymentMethodId = 'invoice_settings' in customer
        ? customer.invoice_settings?.default_payment_method
        : undefined;
      const stripeMethods = await getStripeClient().paymentMethods.list({
        customer: customerId,
        type: 'card',
        limit: 20
      });

      const methods = stripeMethods.data.map(method => ({
        createdAt: method.created ? new Date(method.created * 1000).toISOString() : timestamp(),
        id: method.id,
        userId,
        type: 'card' as const,
        provider: 'stripe' as const,
        brand: method.card?.brand,
        label: method.billing_details?.name,
        last4: method.card?.last4,
        expiryMonth: method.card?.exp_month,
        expiryYear: method.card?.exp_year,
        token: method.id,
        isDefault: defaultPaymentMethodId === method.id,
        updatedAt: timestamp()
      }));
      return { module: 'payments', action: 'list-methods', ok: true, userId, methods };
    } catch (error) {
      logger.error('stripe list methods failed', getErrorDetails(error));
      return { module: 'payments', action: 'list-methods', ok: false, error: 'stripe_unavailable', message: 'Payment processing unavailable. Try again later.' };
    }
  }

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

  if (isStripeEnabled() && paymentMethod.token) {
    try {
      const customerId = await getOrCreateStripeCustomerId(userId);
      await getStripeClient().customers.update(customerId, {
        invoice_settings: {
          default_payment_method: paymentMethod.token
        }
      });
    } catch (error) {
      logger.error('stripe set default method failed', getErrorDetails(error));
      return { module: 'payments', action: 'set-default-method', ok: false, error: 'stripe_unavailable', message: 'Payment processing unavailable. Try again later.' };
    }
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

  if (isStripeEnabled() && paymentMethod.token) {
    try {
      await getStripeClient().paymentMethods.detach(paymentMethod.token);
    } catch (error) {
      logger.error('stripe remove method failed', getErrorDetails(error));
      return { module: 'payments', action: 'remove-method', ok: false, error: 'stripe_unavailable', message: 'Payment processing unavailable. Try again later.' };
    }
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

export async function stripe_webhook(body: any, _params?: any, _query?: any, headers?: any, rawBody?: string | Buffer) {
  const eventPayload = body?.event || body;
  if (!eventPayload || typeof eventPayload?.type !== 'string') {
    return { module: 'payments', action: 'stripe-webhook', error: 'invalid stripe event payload' };
  }

  if (env.stripeWebhookSecret) {
    try {
      const signature = getStripeSignatureHeader(headers);
      const rawPayload = Buffer.isBuffer(rawBody)
        ? rawBody
        : typeof rawBody === 'string'
          ? Buffer.from(rawBody, 'utf8')
          : undefined;
      if (!rawPayload) {
        return { module: 'payments', action: 'stripe-webhook', error: 'raw webhook body required' };
      }
      constructStripeEvent(rawPayload, signature, env.stripeWebhookSecret);
    } catch (error) {
      logger.error('stripe webhook verification failed', getErrorDetails(error));
      return { module: 'payments', action: 'stripe-webhook', error: 'invalid stripe signature' };
    }
  }

  const result = await handleStripeWebhook(eventPayload);
  return { module: 'payments', action: 'stripe-webhook', ok: true, result };
}
