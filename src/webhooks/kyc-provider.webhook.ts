import { handleKycWebhook, verifyKycWebhookSignature } from '../services/kyc-provider';

export async function processKycProviderWebhook(body: any, signature?: string) {
  const rawBody = JSON.stringify(body ?? {});
  if (!verifyKycWebhookSignature(rawBody, signature)) {
    return { ok: false, error: 'invalid webhook signature' };
  }
  const result = await handleKycWebhook(body);
  return { ok: true, result };
}
