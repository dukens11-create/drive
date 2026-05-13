import { makeId, store } from './data.store';

function getProfile(userId: string) {
  return store.drivers.get(userId);
}

export async function apply(body: any, _params?: any, _query?: any) {
  const userId = body?.userId || makeId('driver_user');
  const profile = {
    userId,
    status: 'pending' as const,
    available: false,
    lat: body?.lat,
    lng: body?.lng,
    rating: 5,
    acceptanceRate: 1,
    cancellationRate: 0,
    earningsCents: 0,
    documents: [] as string[]
  };
  store.drivers.set(userId, profile);
  return { module: 'drivers', action: 'apply', ok: true, profile };
}

export async function availability(body: any, _params?: any, _query?: any) {
  const userId = body?.userId;
  const profile = getProfile(userId);
  if (!profile) return { module: 'drivers', action: 'availability', error: 'driver not found' };
  profile.available = Boolean(body?.available);
  return { module: 'drivers', action: 'availability', ok: true, profile };
}

export async function location(body: any, _params?: any, _query?: any) {
  const userId = body?.userId;
  const profile = getProfile(userId);
  if (!profile) return { module: 'drivers', action: 'location', error: 'driver not found' };
  profile.lat = Number(body?.lat);
  profile.lng = Number(body?.lng);
  return { module: 'drivers', action: 'location', ok: true, profile };
}

export async function earnings(body: any, _params?: any, _query?: any) {
  const userId = body?.userId;
  const profile = getProfile(userId);
  if (!profile) return { module: 'drivers', action: 'earnings', error: 'driver not found' };
  const total = store.walletTx
    .filter(tx => tx.userId === userId && tx.kind === 'credit')
    .reduce((sum, tx) => sum + tx.amountCents, 0);
  profile.earningsCents = total;
  return { module: 'drivers', action: 'earnings', ok: true, earningsCents: total };
}

export async function documents(body: any, _params?: any, _query?: any) {
  const userId = body?.userId;
  const profile = getProfile(userId);
  if (!profile) return { module: 'drivers', action: 'documents', error: 'driver not found' };
  const docs = Array.isArray(body?.documents) ? body.documents : [];
  profile.documents = [...new Set([...profile.documents, ...docs])];
  if (profile.documents.length >= 2) profile.status = 'approved';
  return { module: 'drivers', action: 'documents', ok: true, profile };
}
