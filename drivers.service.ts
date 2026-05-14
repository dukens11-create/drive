import { markStoreDirty, store } from './data.store';

function getProfile(userId: string) {
  return store.drivers.get(userId);
}

export async function apply(body: any, _params?: any, _query?: any) {
  const userId = body?.actor?.id;
  if (!userId) return { module: 'drivers', action: 'apply', error: 'actor id is required' };

  const existing = getProfile(userId);
  if (existing) {
    existing.lat = body?.lat ?? existing.lat;
    existing.lng = body?.lng ?? existing.lng;
    if (existing.status === 'rejected') {
      existing.status = 'pending';
      existing.documents = [];
      existing.available = false;
    }
    markStoreDirty();
    return { module: 'drivers', action: 'apply', ok: true, profile: existing };
  }

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
  const userId = body?.actor?.id;
  const profile = getProfile(userId);
  if (!profile) return { module: 'drivers', action: 'availability', error: 'driver not found' };
  if (profile.status !== 'approved' && body?.available) {
    return { module: 'drivers', action: 'availability', error: 'driver must be approved before going online' };
  }
  profile.available = Boolean(body?.available);
  markStoreDirty();
  return { module: 'drivers', action: 'availability', ok: true, profile };
}

export async function location(body: any, _params?: any, _query?: any) {
  const userId = body?.actor?.id;
  const profile = getProfile(userId);
  if (!profile) return { module: 'drivers', action: 'location', error: 'driver not found' };
  profile.lat = Number(body?.lat);
  profile.lng = Number(body?.lng);
  markStoreDirty();
  return { module: 'drivers', action: 'location', ok: true, profile };
}

export async function earnings(body: any, _params?: any, _query?: any) {
  const userId = body?.actor?.id;
  const profile = getProfile(userId);
  if (!profile) return { module: 'drivers', action: 'earnings', error: 'driver not found' };
  const total = store.walletTx
    .filter(tx => tx.userId === userId && tx.kind === 'credit')
    .reduce((sum, tx) => sum + tx.amountCents, 0);
  profile.earningsCents = total;
  markStoreDirty();
  return { module: 'drivers', action: 'earnings', ok: true, earningsCents: total };
}

export async function documents(body: any, _params?: any, _query?: any) {
  const userId = body?.actor?.id;
  const profile = getProfile(userId);
  if (!profile) return { module: 'drivers', action: 'documents', error: 'driver not found' };
  const docs = Array.isArray(body?.documents) ? body.documents : [];
  profile.documents = [...new Set([...profile.documents, ...docs])];
  if (profile.documents.length >= 2) profile.status = 'approved';
  markStoreDirty();
  return { module: 'drivers', action: 'documents', ok: true, profile };
}
