import * as authService from './auth.service';
import { appendAuditLog, markStoreDirty, store, timestamp, type RiderProfile } from '../database/data.store';
import { publishRiderRealtimeLocation } from './realtime-dispatch.service';

function createDefaultRiderProfile(userId: string): RiderProfile {
  return {
    userId,
    favoriteLocations: [],
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
  return { ...profile };
}

function isValidPhone(phone: string) {
  const digits = phone.replace(/\D/g, '');
  return /^\d{10,15}$/.test(digits);
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
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

  profile.updatedAt = timestamp();
  store.users.set(userId, user);
  store.riders.set(userId, profile);
  markStoreDirty();
  appendAuditLog(userId, 'rider', 'rider_profile_updated', userId, 'user', {
    updatedFields: Object.keys(body || {}).filter(key => key !== 'actor')
  });

  return { module: 'riders', action: 'update-profile', ok: true, rider: sanitizeRider(profile) };
}
