import { makeId } from './data.store';

export async function createKycSession(userId: string) {
  const sessionId = makeId('kyc');
  return {
    userId,
    sessionId,
    provider: process.env.KYC_PROVIDER || 'stripe_identity',
    url: `https://kyc.flupflap.local/session/${sessionId}`
  };
}

export async function handleKycWebhook(event: any) {
  return {
    handled: true,
    userId: event?.userId,
    status: event?.status || 'pending',
    eventType: event?.type || 'kyc.updated'
  };
}
