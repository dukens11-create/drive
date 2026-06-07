import { randomUUID } from 'crypto';
import Stripe from 'stripe';
import { env } from '../config/env';
import { store } from '../database/data.store';

let stripeClient: Stripe | undefined;
const stripeCustomersByUserId = new Map<string, string>();
const stripeCustomerInFlight = new Map<string, Promise<string>>();

export function isStripeEnabled() {
  return Boolean(env.stripeSecretKey);
}

export function getStripeClient() {
  if (!env.stripeSecretKey) {
    throw new Error('Stripe is not configured');
  }
  if (!stripeClient) {
    stripeClient = new Stripe(env.stripeSecretKey, {
      apiVersion: '2024-06-20'
    });
  }
  return stripeClient;
}

export function createStripeIdempotencyKey(input?: string) {
  if (typeof input === 'string' && input.trim().length > 0) return input.trim();
  return `drive_${randomUUID()}`;
}

export async function getOrCreateStripeCustomerId(userId: string) {
  const existing = stripeCustomersByUserId.get(userId);
  if (existing) return existing;
  const inFlight = stripeCustomerInFlight.get(userId);
  if (inFlight) return inFlight;

  const lookup = (async () => {
    const user = store.users.get(userId);
    const customer = await getStripeClient().customers.create({
      email: user?.email,
      phone: user?.phone,
      metadata: { userId }
    });
    stripeCustomersByUserId.set(userId, customer.id);
    return customer.id;
  })();

  stripeCustomerInFlight.set(userId, lookup);
  try {
    return await lookup;
  } finally {
    stripeCustomerInFlight.delete(userId);
  }
}
