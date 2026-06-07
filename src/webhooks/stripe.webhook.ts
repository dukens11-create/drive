import type { Request, Response } from 'express';
import { env } from '../config/env';
import { handleStripeWebhook as applyStripeWebhook } from '../utils/stripe.webhook';
import { constructStripeEvent, getStripeSignatureHeader } from '../utils/stripe-signature';

export async function processStripeWebhookEvent(event: any) {
  switch (event?.type) {
    case 'charge.dispute.created':
      return { handled: true, action: 'flag_for_fraud_review' };
    case 'payment_method.attached':
      return { handled: true, action: 'payment_method_attached' };
    default:
      return applyStripeWebhook(event);
  }
}

export async function stripeWebhookHandler(req: Request, res: Response) {
  try {
    const signature = getStripeSignatureHeader(req.headers);
    const body = Buffer.isBuffer(req.body)
      ? req.body
      : Buffer.from((req as any).rawBody || JSON.stringify(req.body || {}), 'utf8');
    const event = constructStripeEvent(body, signature, env.stripeWebhookSecret);
    const result = await processStripeWebhookEvent(event);
    res.json({ ok: true, result });
  } catch (error) {
    res.status(400).json({
      ok: false,
      error: error instanceof Error ? error.message : 'invalid stripe webhook'
    });
  }
}
