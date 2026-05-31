import { markStoreDirty, store, type DriverProfile } from '../database/data.store';

function getProfile(userId: string) {
  return store.drivers.get(userId);
}

function createDefaultDriverProfile(userId: string): DriverProfile {
  return {
    userId,
    status: 'pending',
    verificationState: 'documents_pending',
    availabilityStatus: 'offline',
    available: false,
    rating: 5,
    acceptanceRate: 1,
    cancellationRate: 0,
    earningsCents: 0,
    documents: []
  };
}

function getOrCreateProfile(userId: string, role?: string): DriverProfile | undefined {
  const existing = getProfile(userId);
  if (existing) return existing;
  if (role === 'driver') {
    const profile = createDefaultDriverProfile(userId);
    store.drivers.set(userId, profile);
    markStoreDirty();
    return profile;
  }
  return undefined;
}

function syncProfileState(profile: any) {
  if (profile.status === 'rejected') {
    profile.verificationState = 'rejected';
  } else if (profile.status === 'approved') {
    profile.verificationState = 'verified';
  } else if ((profile.documents || []).length < 2) {
    profile.verificationState = 'documents_pending';
  } else {
    const kyc = store.kycStatus.get(profile.userId);
    if (kyc === 'verified') profile.verificationState = 'verified';
    else if (kyc === 'rejected') profile.verificationState = 'rejected';
    else profile.verificationState = 'kyc_pending';
  }

  if (profile.verificationState === 'verified') {
    profile.status = 'approved';
    if (!profile.availabilityStatus || profile.availabilityStatus === 'unavailable') profile.availabilityStatus = 'offline';
  } else if (profile.verificationState === 'rejected') {
    profile.status = 'rejected';
    profile.availabilityStatus = 'unavailable';
  } else {
    profile.status = 'pending';
    if (profile.availabilityStatus === 'online' || profile.availabilityStatus === 'assigned') profile.availabilityStatus = 'offline';
  }

  profile.available = profile.availabilityStatus === 'online';
}

function setAvailability(profile: any, next: 'offline' | 'online' | 'assigned' | 'unavailable') {
  if (next === 'online') {
    if (profile.verificationState !== 'verified') return { error: 'driver is not verified' };
    if (!Number.isFinite(Number(profile.lat)) || !Number.isFinite(Number(profile.lng))) {
      return { error: 'driver location must be set to finite numeric coordinates before going online' };
    }
  }
  profile.availabilityStatus = next;
  profile.available = next === 'online';
  return { ok: true };
}

export function syncDriverVerificationState(userId: string) {
  const profile = getProfile(userId);
  if (!profile) return null;
  syncProfileState(profile);
  markStoreDirty();
  return profile;
}

export function markDriverAssigned(userId: string) {
  const profile = getProfile(userId);
  if (!profile) return { ok: false, error: 'driver not found' as const };
  syncProfileState(profile);
  if (profile.verificationState !== 'verified') return { ok: false, error: 'driver is not verified' as const };
  if (profile.availabilityStatus !== 'online') return { ok: false, error: 'driver is not available for assignment' as const };
  setAvailability(profile, 'assigned');
  markStoreDirty();
  return { ok: true, profile } as const;
}

export function releaseDriverFromRide(userId: string) {
  const profile = getProfile(userId);
  if (!profile) return null;
  syncProfileState(profile);
  if (profile.verificationState === 'verified' && profile.availabilityStatus === 'assigned') {
    setAvailability(profile, 'online');
  }
  markStoreDirty();
  return profile;
}

export function isDriverDispatchEligible(profile: any) {
  return (
    profile?.status === 'approved' &&
    profile?.verificationState === 'verified' &&
    profile?.availabilityStatus === 'online' &&
    Number.isFinite(Number(profile?.lat)) &&
    Number.isFinite(Number(profile?.lng))
  );
}

export async function apply(body: any, _params?: any, _query?: any) {
  const userId = body?.actor?.id || body?.userId;
  if (!userId) return { module: 'drivers', action: 'apply', error: 'actor ID or userId is required' };

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
    verificationState: 'documents_pending' as const,
    availabilityStatus: 'offline' as const,
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
  const userId = body?.actor?.id || body?.userId;
  const profile = getProfile(userId);
  if (!profile) return { module: 'drivers', action: 'availability', error: 'driver not found' };
  syncProfileState(profile);
  const rawState = body?.status;
  let requestedState: 'offline' | 'online' | 'unavailable' | null = null;
  if (rawState === 'offline' || rawState === 'online' || rawState === 'unavailable') {
    requestedState = rawState;
  } else if (body?.available === true) {
    requestedState = 'online';
  } else if (body?.available === false) {
    requestedState = 'offline';
  }
  if (!requestedState) {
    return {
      module: 'drivers',
      action: 'availability',
      error: 'status must be one of offline, online, unavailable for this endpoint (or use available: true/false)'
    };
  }
  const result = setAvailability(profile, requestedState);
  if ('error' in result) return { module: 'drivers', action: 'availability', error: result.error };
  markStoreDirty();
  return { module: 'drivers', action: 'availability', ok: true, profile };
}

export async function location(body: any, _params?: any, _query?: any) {
  const userId = body?.actor?.id || body?.userId;
  const profile = getProfile(userId);
  if (!profile) return { module: 'drivers', action: 'location', error: 'driver not found' };
  const lat = Number(body?.lat);
  const lng = Number(body?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return { module: 'drivers', action: 'location', error: 'lat and lng must be valid finite numbers' };
  profile.lat = lat;
  profile.lng = lng;
  markStoreDirty();
  return { module: 'drivers', action: 'location', ok: true, profile };
}

export async function me(body: any, _params?: any, _query?: any) {
  const userId = body?.actor?.id || body?.userId;
  if (!userId) return { module: 'drivers', action: 'me', error: 'actor ID or userId is required' };
  const profile = getOrCreateProfile(userId, body?.actor?.role);
  if (!profile) return { module: 'drivers', action: 'me', error: 'driver not found' };
  syncProfileState(profile);
  markStoreDirty();
  return { module: 'drivers', action: 'me', ok: true, profile };
}

export async function currentTrip(body: any, _params?: any, _query?: any) {
  const userId = body?.actor?.id || body?.userId;
  const profile = getProfile(userId);
  if (!profile) return { module: 'drivers', action: 'current-trip', error: 'driver not found' };
  const ride = Array.from(store.rides.values())
    .filter(candidate => candidate.driverId === userId && (candidate.status === 'accepted' || candidate.status === 'started'))
    .sort((left, right) => (right.updatedAt > left.updatedAt ? 1 : -1))[0] || null;
  return { module: 'drivers', action: 'current-trip', ok: true, ride };
}

export async function earnings(body: any, _params?: any, _query?: any) {
  const userId = body?.actor?.id || body?.userId;
  if (!userId) return { module: 'drivers', action: 'earnings', error: 'actor ID or userId is required' };
  const profile = getOrCreateProfile(userId, body?.actor?.role);
  if (!profile) return { module: 'drivers', action: 'earnings', error: 'driver not found' };
  const txs = store.walletTx.filter(tx => tx.userId === userId && tx.kind === 'credit');
  const total = txs.reduce((sum, tx) => sum + tx.amountCents, 0);
  profile.earningsCents = total;
  markStoreDirty();
  const rideTxs = txs.filter(tx => tx.reason.startsWith('ride:') && tx.reason.endsWith(':payout'));
  const rideEarnings = rideTxs.map(tx => {
    const rideId = tx.reason.split(':')[1];
    return { rideId, amountCents: tx.amountCents, createdAt: tx.createdAt };
  });
  return {
    module: 'drivers',
    action: 'earnings',
    ok: true,
    earningsCents: total,
    rideCount: rideEarnings.length,
    rideEarnings
  };
}

export async function documents(body: any, _params?: any, _query?: any) {
  const userId = body?.actor?.id || body?.userId;
  const profile = getProfile(userId);
  if (!profile) return { module: 'drivers', action: 'documents', error: 'driver not found' };
  const docs = Array.isArray(body?.documents) ? body.documents : [];
  profile.documents = [...new Set([...profile.documents, ...docs])];
  syncProfileState(profile);
  markStoreDirty();
  return { module: 'drivers', action: 'documents', ok: true, profile };
}
