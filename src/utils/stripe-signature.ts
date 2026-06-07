import type { IncomingHttpHeaders } from 'http';
import { getStripeClient, isStripeEnabled } from '../services/stripe-client';

export function getStripeSignatureHeader(headers?: IncomingHttpHeaders | Record<string, unknown>) {
  const raw = headers?.['stripe-signature'] || headers?.['Stripe-Signature'];
  if (typeof raw === 'string') return raw;
  if (Array.isArray(raw)) return raw[0];
  return undefined;
}

export function constructStripeEvent(payload: Buffer | string, signature?: string, webhookSecret?: string) {
  const rawPayload = Buffer.isBuffer(payload) ? payload : Buffer.from(payload, 'utf8');
  if (!webhookSecret) throw new Error('missing stripe webhook secret');
  if (!signature) throw new Error('missing stripe signature');
  if (!isStripeEnabled()) throw new Error('stripe secret key is missing');
  return getStripeClient().webhooks.constructEvent(rawPayload, signature, webhookSecret);
}
