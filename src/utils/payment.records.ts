import { env } from '../config/env';
import { DRIVER_PAYOUT_RATE, PAYMENT_INVOICE_PREFIX } from '../constants/payments.constants';
import { makeId, markStoreDirty, pushWalletTx, store, timestamp, type Payment, type RefundDestination } from '../database/data.store';

function walletTxExists(userId: string, reason: string) {
  return store.walletTx.some(tx => tx.userId === userId && tx.reason === reason);
}

function findInvoiceForPayment(paymentId: string) {
  return Array.from(store.invoices.values()).find(invoice => invoice.paymentId === paymentId);
}

function findRefundForPayment(paymentId: string) {
  return Array.from(store.refunds.values()).find(refund => refund.paymentId === paymentId);
}

export function ensureInvoiceForPayment(payment: Payment) {
  const existing = (payment.invoiceId && store.invoices.get(payment.invoiceId)) || findInvoiceForPayment(payment.id);
  if (existing) {
    payment.invoiceId = existing.id;
    payment.receiptUrl = existing.url;
    return existing;
  }

  const invoice = {
    id: makeId('inv'),
    paymentId: payment.id,
    invoiceNumber: `${PAYMENT_INVOICE_PREFIX}-${payment.id.toUpperCase()}`,
    invoiceDate: timestamp(),
    amountCents: payment.amountCents,
    currency: payment.currency,
    status: 'issued' as const,
    recipientUserId: payment.riderId,
    payerUserId: payment.riderId,
    paymentMethodType: payment.paymentMethodType,
    url: `${env.appBaseUrl.replace(/\/$/, '')}/invoices/${payment.id}`,
    createdAt: timestamp(),
    updatedAt: timestamp()
  };

  store.invoices.set(invoice.id, invoice);
  payment.invoiceId = invoice.id;
  payment.receiptUrl = invoice.url;
  payment.updatedAt = timestamp();
  markStoreDirty();
  return invoice;
}

export function applyCaptureLedger(payment: Payment) {
  if (payment.riderId) {
    const riderReason = `payment:${payment.id}:capture`;
    if (!walletTxExists(payment.riderId, riderReason)) pushWalletTx(payment.riderId, 'debit', payment.amountCents, riderReason);
  }

  if (payment.driverId) {
    const payoutReason = `payment:${payment.id}:driver_payout`;
    const payoutAmount = Math.round(payment.amountCents * DRIVER_PAYOUT_RATE);
    if (!walletTxExists(payment.driverId, payoutReason)) pushWalletTx(payment.driverId, 'credit', payoutAmount, payoutReason);
  }

  return ensureInvoiceForPayment(payment);
}

export function applyRefundLedger(payment: Payment, destination: RefundDestination, reason?: string) {
  if (destination === 'wallet' && payment.riderId) {
    const riderReason = `payment:${payment.id}:refund`;
    if (!walletTxExists(payment.riderId, riderReason)) pushWalletTx(payment.riderId, 'credit', payment.amountCents, riderReason);
  }

  if (payment.driverId) {
    const reversalReason = `payment:${payment.id}:refund_reversal`;
    const payoutAmount = Math.round(payment.amountCents * DRIVER_PAYOUT_RATE);
    if (!walletTxExists(payment.driverId, reversalReason)) pushWalletTx(payment.driverId, 'debit', payoutAmount, reversalReason);
  }

  const existingRefund = findRefundForPayment(payment.id);
  const refund = existingRefund || {
    id: makeId('ref'),
    paymentId: payment.id,
    userId: payment.riderId,
    amountCents: payment.amountCents,
    currency: payment.currency,
    reason,
    destination,
    status: 'succeeded' as const,
    providerRefundId: makeId('re'),
    createdAt: timestamp(),
    updatedAt: timestamp()
  };

  if (existingRefund) {
    existingRefund.amountCents = payment.amountCents;
    existingRefund.currency = payment.currency;
    existingRefund.destination = destination;
    existingRefund.reason = reason;
    existingRefund.updatedAt = timestamp();
  } else {
    store.refunds.set(refund.id, refund);
  }

  const invoice = ensureInvoiceForPayment(payment);
  invoice.status = 'refunded';
  invoice.updatedAt = timestamp();
  payment.updatedAt = timestamp();
  markStoreDirty();
  return { refund, invoice };
}
