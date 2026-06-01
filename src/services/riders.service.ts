import * as authService from './auth.service';
import { markStoreDirty, store, timestamp, type RiderProfile } from '../database/data.store';
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

export async function register(body: any, _params?: any, _query?: any) {
  const result = await authService.signup({ ...body, role: 'rider' });
  if (!result?.ok || !result?.user?.id) return result;
  const profile = getOrCreateProfile(result.user.id, 'rider');
  return { ...result, profile };
}

export async function me(body: any, _params?: any, _query?: any) {
  const userId = body?.actor?.id || body?.userId;
  if (!userId) return { module: 'riders', action: 'me', error: 'actor ID or userId is required' };
  const profile = getOrCreateProfile(userId, body?.actor?.role);
  if (!profile) return { module: 'riders', action: 'me', error: 'rider not found' };
  return { module: 'riders', action: 'me', ok: true, profile };
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
