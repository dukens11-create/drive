import { createKycSession, handleKycWebhook } from '../utils/kyc.provider';
import { store } from '../database/data.store';
import { syncDriverVerificationState } from './drivers.service';

export async function create_session(body: any, _params?: any, _query?: any) {
  const userId = body?.userId;
  if (!userId) return { module: 'kyc', action: 'create-session', error: 'userId is required' };
  const session = await createKycSession(userId);
  store.kycStatus.set(userId, 'pending');
  return { module: 'kyc', action: 'create-session', ok: true, session, status: 'pending' };
}

export async function status(body: any, _params?: any, _query?: any) {
  const userId = body?.userId;
  if (!userId) return { module: 'kyc', action: 'status', error: 'userId is required' };
  return { module: 'kyc', action: 'status', ok: true, userId, status: store.kycStatus.get(userId) || 'pending' };
}

export async function webhook(body: any, _params?: any, _query?: any) {
  const event = body?.event || body;
  const result = await handleKycWebhook(event);

  const userId = event?.userId;
  const outcome = event?.status;
  if (userId && (outcome === 'verified' || outcome === 'rejected' || outcome === 'pending')) {
    store.kycStatus.set(userId, outcome);
    syncDriverVerificationState(userId);
  }

  return { module: 'kyc', action: 'webhook', ok: true, result };
}
