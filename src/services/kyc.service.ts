import { createKycSession } from './kyc-provider';
import { store } from '../database/data.store';
import { syncDriverVerificationState } from './drivers.service';
import { processKycProviderWebhook } from '../webhooks/kyc-provider.webhook';

export async function create_session(body: any, _params?: any, _query?: any) {
  const userId = body?.actor?.id || body?.userId;
  if (!userId) return { module: 'kyc', action: 'create-session', error: 'userId is required' };
  const session = await createKycSession(
    userId,
    String(body?.documentType || 'driver_license'),
    String(body?.country || 'US')
  );
  return {
    module: 'kyc',
    action: 'create-session',
    ok: true,
    sessionId: session.id,
    sessionUrl: session.sessionUrl,
    expiresAt: session.expiresAt,
    provider: session.provider,
    status: session.status
  };
}

export async function status(body: any, _params?: any, _query?: any) {
  const userId = body?.actor?.id || body?.userId;
  if (!userId) return { module: 'kyc', action: 'status', error: 'userId is required' };
  const session = Array.from(store.kycSessions.values())
    .filter(entry => entry.userId === userId)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0];
  const verification = Array.from(store.kycVerifications.values())
    .filter(entry => entry.userId === userId)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0];
  return {
    module: 'kyc',
    action: 'status',
    ok: true,
    userId,
    status: store.kycStatus.get(userId) || 'pending',
    session,
    verification
  };
}

export async function webhook(body: any, _params?: any, _query?: any) {
  const event = body?.event || body;
  const signature = body?.signature || body?.headers?.['x-kyc-signature'];
  const result = await processKycProviderWebhook(event, signature);
  const userId = result?.result?.userId;
  const outcome = result?.result?.status;
  if (userId && (outcome === 'verified' || outcome === 'rejected' || outcome === 'pending')) {
    syncDriverVerificationState(userId);
  }
  if (!result.ok) {
    return { module: 'kyc', action: 'webhook', error: result.error };
  }
  return { module: 'kyc', action: 'webhook', ok: true, result: result.result };
}
