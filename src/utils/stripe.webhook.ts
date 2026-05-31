import { markStoreDirty, store, timestamp } from '../database/data.store';
import { applyCaptureLedger, applyRefundLedger } from './payment.records';

function findPaymentForEvent(event: any) {
  const paymentId = event?.data?.object?.metadata?.paymentId;
  const providerIntentId = event?.data?.object?.payment_intent || event?.data?.object?.id;
  if (paymentId) return store.payments.get(paymentId);
  return Array.from(store.payments.values()).find(payment => payment.providerIntentId === providerIntentId);
}

export async function handleStripeWebhook(event: any) {
  if (!event || typeof event.type !== 'string') {
    return { handled: false, error: 'invalid event payload' };
  }

  switch (event.type) {
    case 'payment_intent.succeeded': {
      const payment = findPaymentForEvent(event);
      if (!payment) return { handled: false, action: 'payment_not_found' };
      if (payment.status === 'captured' || payment.status === 'refunded') return { handled: true, action: 'capture_already_applied', payment };

      payment.status = 'captured';
      payment.capturedAt = timestamp();
      payment.updatedAt = timestamp();
      applyCaptureLedger(payment);
      markStoreDirty();
      return { handled: true, action: 'mark_payment_captured', payment };
    }
    case 'charge.refunded': {
      const payment = findPaymentForEvent(event);
      if (!payment) return { handled: false, action: 'payment_not_found' };
      if (payment.status === 'refunded') return { handled: true, action: 'refund_already_applied', payment };

      payment.status = 'refunded';
      payment.refundedAt = timestamp();
      payment.updatedAt = timestamp();
      applyRefundLedger(payment, 'original_payment_method');
      markStoreDirty();
      return { handled: true, action: 'mark_refund', payment };
    }
    case 'payment_intent.payment_failed': {
      const payment = findPaymentForEvent(event);
      if (!payment) return { handled: false, action: 'payment_not_found' };
      if (payment.status === 'captured' || payment.status === 'refunded') return { handled: true, action: 'ignore_failed_after_capture', payment };
      payment.status = 'failed';
      payment.updatedAt = timestamp();
      markStoreDirty();
      return { handled: true, action: 'mark_payment_failed', payment };
    }
    case 'account.updated':
      return { handled: true, action: 'update_driver_connect_status' };
    default:
      return { handled: false, type: event.type };
  }
}
