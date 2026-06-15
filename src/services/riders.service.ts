import * as authService from './auth.service';
import {
  appendAuditLog,
  markStoreDirty,
  store,
  timestamp,
  type RiderProfile,
  type RiderSavedPlace
} from '../database/data.store';
import { publishRiderRealtimeLocation } from './realtime-dispatch.service';

function createDefaultRiderProfile(userId: string): RiderProfile {
  return {
    userId,
    favoriteLocations: [],
    savedPlaces: [],
    rating: 5,
    reviewCount: 0
  };
}

function getOrCreateProfile(userId: string, role?: string) {
  const existing = store.riders.get(userId);
  if (existing) return existing;
  if (role === 'rider') {
    const profile = createDefaultRiderProfile(userId);
    store.riders.set(userId, profile);
    markStoreDirty();
    return profile;
  }
  return undefined;
}

function sanitizeRider(profile: RiderProfile) {
  return {
    ...profile,
    favoriteLocations: Array.isArray(profile.favoriteLocations) ? profile.favoriteLocations : [],
    savedPlaces: Array.isArray(profile.savedPlaces) ? profile.savedPlaces : []
  };
}

function getSavedPlaces(profile: RiderProfile) {
  if (!Array.isArray(profile.savedPlaces)) {
    profile.savedPlaces = [];
  }
  return profile.savedPlaces;
}

function normalizeSavedPlace(place: any): RiderSavedPlace | null {
  const id = String(place?.id || '').trim();
  const type = String(place?.type || '').trim().toLowerCase();
  const label = String(place?.label || '').trim();
  const address = String(place?.address || '').trim();
  if (!id || !label || !address) return null;
  if (!['home', 'work', 'favorite'].includes(type)) return null;

  const lat = Number(place?.coordinates?.lat);
  const lng = Number(place?.coordinates?.lng);
  const coordinates = Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : undefined;
  const notes = String(place?.notes || '').trim();
  const createdAt = String(place?.createdAt || '').trim();
  const lastUsed = String(place?.lastUsed || '').trim();

  return {
    id,
    type: type as RiderSavedPlace['type'],
    label,
    address,
    ...(coordinates ? { coordinates } : {}),
    ...(notes ? { notes } : {}),
    ...(createdAt ? { createdAt } : {}),
    ...(lastUsed ? { lastUsed } : {})
  };
}

function isValidPhone(phone: string) {
  const digits = phone.replace(/\D/g, '');
  return /^\d{10,15}$/.test(digits);
}

function hasOnlyEmailLocalChars(value: string) {
  for (const character of value) {
    const isAlphaNumeric = /[A-Za-z0-9]/.test(character);
    if (isAlphaNumeric) continue;
    if ('.!#$%&\'*+/=?^_`{|}~-'.includes(character)) continue;
    return false;
  }
  return true;
}

function hasOnlyDomainChars(value: string) {
  for (const character of value) {
    const isAlphaNumeric = /[A-Za-z0-9]/.test(character);
    if (isAlphaNumeric) continue;
    if (character === '-' || character === '.') continue;
    return false;
  }
  return true;
}

function isValidEmail(email: string) {
  if (!email || email.length > 254 || email.includes(' ')) return false;
  const atIndex = email.indexOf('@');
  if (atIndex <= 0 || atIndex !== email.lastIndexOf('@')) return false;
  const localPart = email.slice(0, atIndex);
  const domain = email.slice(atIndex + 1);
  if (!localPart || !domain || domain.startsWith('.') || domain.endsWith('.') || !domain.includes('.')) return false;
  if (!hasOnlyEmailLocalChars(localPart) || !hasOnlyDomainChars(domain)) return false;
  const labels = domain.split('.');
  return labels.every(label => label.length > 0 && !label.startsWith('-') && !label.endsWith('-'));
}

export async function register(body: any, _params?: any, _query?: any) {
  const result: any = await authService.signup({ ...body, role: 'rider' });
  if (!result?.ok || !result?.user?.id) return result;
  const profile = getOrCreateProfile(result.user.id, 'rider');
  return { ...result, profile };
}

export async function me(body: any, _params?: any, _query?: any) {
  const userId = body?.actor?.id || body?.userId;
  if (!userId) return { module: 'riders', action: 'me', error: 'actor ID or userId is required' };
  const profile = getOrCreateProfile(userId, body?.actor?.role);
  if (!profile) return { module: 'riders', action: 'me', error: 'rider not found' };
  return { module: 'riders', action: 'me', ok: true, profile: sanitizeRider(profile) };
}

export async function location(body: any, _params?: any, _query?: any) {
  const userId = body?.actor?.id || body?.userId;
  if (!userId) return { module: 'riders', action: 'location', error: 'actor ID or userId is required' };
  const profile = getOrCreateProfile(userId, body?.actor?.role);
  if (!profile) return { module: 'riders', action: 'location', error: 'rider not found' };
  const lat = Number(body?.lat);
  const lng = Number(body?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return { module: 'riders', action: 'location', error: 'lat and lng must be valid finite numbers' };
  profile.lat = lat;
  profile.lng = lng;
  profile.lastLocationUpdatedAt = timestamp();
  if (typeof body?.vehiclePreference === 'string' && body.vehiclePreference.trim()) profile.vehiclePreference = body.vehiclePreference.trim();
  if (typeof body?.routePreference === 'string' && body.routePreference.trim()) profile.routePreference = body.routePreference.trim();
  markStoreDirty();
  publishRiderRealtimeLocation(userId);
  return { module: 'riders', action: 'location', ok: true, profile };
}

export async function profile(body: any, _params?: any, _query?: any) {
  const userId = body?.actor?.id || body?.userId;
  if (!userId) return { module: 'riders', action: 'get-profile', error: 'actor ID or userId is required' };
  const profile = getOrCreateProfile(userId, body?.actor?.role);
  if (!profile) return { module: 'riders', action: 'get-profile', error: 'rider not found' };
  return { module: 'riders', action: 'get-profile', ok: true, rider: sanitizeRider(profile) };
}

export async function updateProfile(body: any, _params?: any, _query?: any) {
  const userId = body?.actor?.id || body?.userId;
  if (!userId) return { module: 'riders', action: 'update-profile', error: 'actor ID or userId is required' };
  const profile = getOrCreateProfile(userId, body?.actor?.role);
  if (!profile) return { module: 'riders', action: 'update-profile', error: 'rider not found' };
  const user = store.users.get(userId);
  if (!user) return { module: 'riders', action: 'update-profile', error: 'user not found' };

  if (body?.phone !== undefined) {
    const phone = String(body.phone || '').trim();
    if (phone && !isValidPhone(phone)) {
      return { module: 'riders', action: 'update-profile', error: 'invalid_phone_format' };
    }
    const existingPhoneOwner = phone
      ? Array.from(store.users.values()).find(candidate => candidate.id !== userId && candidate.phone === phone)
      : undefined;
    if (existingPhoneOwner) {
      return { module: 'riders', action: 'update-profile', error: 'phone already exists' };
    }
    profile.phone = phone || undefined;
    user.phone = phone || undefined;
  }

  if (body?.email !== undefined) {
    const email = String(body.email || '').trim().toLowerCase();
    if (email && !isValidEmail(email)) {
      return { module: 'riders', action: 'update-profile', error: 'invalid_email_format' };
    }
    const existingEmailOwner = email
      ? Array.from(store.users.values()).find(candidate => candidate.id !== userId && candidate.email === email)
      : undefined;
    if (existingEmailOwner) {
      return { module: 'riders', action: 'update-profile', error: 'user already exists' };
    }
    profile.email = email || undefined;
    user.email = email || undefined;
  }

  const stringFields = [
    'fullName',
    'profilePhotoUrl',
    'dateOfBirth',
    'emergencyContactName',
    'emergencyContactPhone',
    'preferredLanguage',
    'accessibilityNeeds',
    'vehiclePreference',
    'routePreference'
  ] as const;

  for (const field of stringFields) {
    if (body?.[field] !== undefined) {
      const value = String(body[field] || '').trim();
      (profile as any)[field] = value || undefined;
    }
  }

  if (Array.isArray(body?.favoriteLocations)) {
    profile.favoriteLocations = body.favoriteLocations
      .map((location: any) => ({
        label: String(location?.label || '').trim(),
        lat: Number(location?.lat),
        lng: Number(location?.lng)
      }))
      .filter((location: any) => location.label && Number.isFinite(location.lat) && Number.isFinite(location.lng))
      .slice(0, 10);
  }

  if (Array.isArray(body?.savedPlaces)) {
    profile.savedPlaces = body.savedPlaces
      .map((place: any) => normalizeSavedPlace(place))
      .filter(Boolean)
      .slice(0, 10) as RiderSavedPlace[];
  }

  profile.updatedAt = timestamp();
  store.users.set(userId, user);
  store.riders.set(userId, profile);
  markStoreDirty();
  appendAuditLog(userId, 'rider', 'rider_profile_updated', userId, 'user', {
    updatedFields: Object.keys(body || {}).filter(key => key !== 'actor')
  });

  return { module: 'riders', action: 'update-profile', ok: true, rider: sanitizeRider(profile) };
}

export async function getPlaces(body: any, _params?: any, _query?: any) {
  const userId = body?.actor?.id || body?.userId;
  if (!userId) return { module: 'riders', action: 'get-places', error: 'actor ID or userId is required' };
  const profile = getOrCreateProfile(userId, body?.actor?.role);
  if (!profile) return { module: 'riders', action: 'get-places', error: 'rider not found' };
  return { module: 'riders', action: 'get-places', ok: true, places: getSavedPlaces(profile) };
}

export async function updatePlaces(body: any, _params?: any, _query?: any) {
  const userId = body?.actor?.id || body?.userId;
  if (!userId) return { module: 'riders', action: 'update-places', error: 'actor ID or userId is required' };
  const profile = getOrCreateProfile(userId, body?.actor?.role);
  if (!profile) return { module: 'riders', action: 'update-places', error: 'rider not found' };

  const places = Array.isArray(body?.places) ? body.places : [];
  profile.savedPlaces = places
    .map((place: any) => normalizeSavedPlace(place))
    .filter(Boolean)
    .slice(0, 10) as RiderSavedPlace[];
  profile.updatedAt = timestamp();
  store.riders.set(userId, profile);
  markStoreDirty();
  appendAuditLog(userId, 'rider', 'rider_places_updated', userId, 'user', {
    placeCount: profile.savedPlaces.length
  });

  return { module: 'riders', action: 'update-places', ok: true, places: profile.savedPlaces };
}

export async function riderTrips(body: any, _params?: any, query?: any) {
  const userId = body?.actor?.id || body?.userId;
  if (!userId) return { module: 'riders', action: 'trips', error: 'actor ID is required' };
  const profile = store.riders.get(userId);
  if (!profile) return { module: 'riders', action: 'trips', error: 'rider not found' };

  let rides = Array.from(store.rides.values()).filter(r => r.riderId === userId && r.status === 'completed');

  const from = query?.from ? new Date(query.from) : null;
  const to = query?.to ? new Date(query.to) : null;
  if (from) rides = rides.filter(r => r.completedAt && new Date(r.completedAt) >= from!);
  if (to) rides = rides.filter(r => r.completedAt && new Date(r.completedAt) <= to!);

  const sort = query?.sort || 'newest';
  if (sort === 'newest') rides.sort((a, b) => (b.completedAt || '').localeCompare(a.completedAt || ''));
  else if (sort === 'oldest') rides.sort((a, b) => (a.completedAt || '').localeCompare(b.completedAt || ''));

  const limit = Math.min(100, Math.max(1, Number(query?.limit || 20)));
  const offset = Math.max(0, Number(query?.offset || 0));
  const total = rides.length;
  const page = rides.slice(offset, offset + limit).map(r => {
    const driverUser = r.driverId ? store.users.get(r.driverId) : undefined;
    return {
      rideId: r.id,
      driverId: r.driverId,
      driverName: driverUser?.email?.split('@')[0] || 'Driver',
      pickupAddress: r.pickupAddress,
      dropoffAddress: r.dropoffAddress,
      distance: r.miles,
      duration: r.minutes,
      fare: r.fareDetails?.total,
      rating: r.rating,
      completedAt: r.completedAt,
      receiptUrl: `/api/riders/trips/${r.id}/receipt`
    };
  });

  return { module: 'riders', action: 'trips', ok: true, total, limit, offset, trips: page };
}

export async function riderTripReceipt(body: any, params?: any, _query?: any) {
  const userId = body?.actor?.id || body?.userId;
  if (!userId) return { module: 'riders', action: 'trip-receipt', error: 'actor ID is required' };
  const rideId = params?.rideId;
  if (!rideId) return { module: 'riders', action: 'trip-receipt', error: 'rideId is required' };

  const ride = store.rides.get(rideId);
  if (!ride) return { module: 'riders', action: 'trip-receipt', error: 'ride not found' };
  if (ride.riderId !== userId) return { module: 'riders', action: 'trip-receipt', error: 'access denied' };
  if (ride.status !== 'completed') return { module: 'riders', action: 'trip-receipt', error: 'receipt only available for completed rides' };

  const driverUser = ride.driverId ? store.users.get(ride.driverId) : undefined;
  const riderUser = store.users.get(userId);

  return {
    module: 'riders',
    action: 'trip-receipt',
    ok: true,
    receipt: {
      rideId: ride.id,
      riderName: riderUser?.email?.split('@')[0] || 'Rider',
      driverName: driverUser?.email?.split('@')[0] || 'Driver',
      pickupAddress: ride.pickupAddress,
      dropoffAddress: ride.dropoffAddress,
      distance: ride.miles,
      duration: ride.minutes,
      completedAt: ride.completedAt,
      fareDetails: ride.fareDetails
    }
  };
}
