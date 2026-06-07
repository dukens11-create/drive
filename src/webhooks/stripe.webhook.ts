import type { Request, Response } from 'express';
import { env } from '../config/env';
import { handleStripeWebhook } from '../utils/stripe.webhook';
import { constructStripeEvent, getStripeSignatureHeader } from '../utils/stripe-signature';
import { getErrorDetails, logger } from '../utils';

export async function processStripeWebhookEvent(event: any) {
  return handleStripeWebhook(event);
}

export async function stripeWebhookHandler(req: Request, res: Response) {
  try {
    const signature = getStripeSignatureHeader(req.headers);
    const body = Buffer.isBuffer(req.body)
      ? req.body
      : typeof req.body === 'string'
        ? Buffer.from(req.body, 'utf8')
        : undefined;
    if (!body) {
      throw new Error('raw webhook body required');
    }
    const event = constructStripeEvent(body, signature, env.stripeWebhookSecret);
    const result = await processStripeWebhookEvent(event);
    res.json({ ok: true, result });
  } catch (error) {
    logger.error('stripe webhook failed', getErrorDetails(error));
    res.status(400).json({
      ok: false,
      error: error instanceof Error ? error.message : 'invalid stripe webhook'
    });
  }
}
