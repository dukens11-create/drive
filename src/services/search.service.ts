import { makeId, store, timestamp, type DriverProfile, type Ride, type SavedSearch, type SearchHistoryEntry, type SearchResource, type Vehicle } from '../database/data.store';

type SearchActor = { id?: string; role?: string };

function clamp(value: unknown, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(parsed)));
}

function parseNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseDate(value: unknown) {
  if (!value) return undefined;
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function normalizeText(value: unknown) {
  return String(value || '').trim().toLowerCase();
}

function getDriverVehicle(profile: DriverProfile) {
  if (profile.primaryVehicleId) {
    const vehicle = store.vehicles.get(profile.primaryVehicleId);
    if (vehicle) return vehicle;
  }
  return Array.from(store.vehicles.values()).find(vehicle => vehicle.driverId === profile.userId);
}

function getVehicleLabel(vehicle?: Vehicle) {
  if (!vehicle) return '';
  return `${vehicle.make} ${vehicle.model} ${vehicle.color} ${vehicle.licensePlate}`.trim().toLowerCase();
}

function getRideSearchText(ride: Ride) {
  return `${ride.pickupAddress || ''} ${ride.dropoffAddress || ''}`.trim().toLowerCase();
}

function toFilterRecord(source: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(source)
      .filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== '')
      .map(([key, value]) => [key, String(value)])
  );
}

function recordSearch(userId: string | undefined, resource: SearchResource, filters: Record<string, string>, resultCount: number) {
  if (!userId) return;
  const entry: SearchHistoryEntry = {
    id: makeId('search'),
    userId,
    resource,
    filters,
    resultCount,
    createdAt: timestamp()
  };
  store.searchHistory.push(entry);
}

function canAccessRide(actor: SearchActor | undefined, ride: Ride) {
  if (actor?.role === 'admin') return true;
  if (!actor?.id) return false;
  return ride.riderId === actor.id || ride.driverId === actor.id;
}

export async function searchDrivers(query: Record<string, unknown>, actor?: SearchActor) {
  const minRating = parseNumber(query.minRating);
  const maxRating = parseNumber(query.maxRating);
  const minEarnings = parseNumber(query.minEarnings);
  const maxEarnings = parseNumber(query.maxEarnings);
  const vehicleType = normalizeText(query.vehicleType);
  const q = normalizeText(query.q);
  const sort = normalizeText(query.sort) || 'rating';
  const limit = clamp(query.limit, 20, 1, 100);
  const offset = clamp(query.offset, 0, 0, 10_000);

  let drivers = Array.from(store.drivers.values())
    .filter(profile => profile.status === 'approved' || actor?.role === 'admin')
    .map(profile => {
      const vehicle = getDriverVehicle(profile);
      return {
        profile,
        vehicle,
        user: store.users.get(profile.userId)
      };
    })
    .filter(entry => {
      if (vehicleType && entry.vehicle?.vehicleType !== vehicleType) return false;
      if (minRating != null && entry.profile.rating < minRating) return false;
      if (maxRating != null && entry.profile.rating > maxRating) return false;
      if (minEarnings != null && entry.profile.earningsCents < minEarnings) return false;
      if (maxEarnings != null && entry.profile.earningsCents > maxEarnings) return false;
      if (q) {
        const haystack = `${entry.user?.email || ''} ${getVehicleLabel(entry.vehicle)} ${entry.vehicle?.vehicleType || ''}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

  drivers.sort((a, b) => {
    if (sort === 'earnings') return b.profile.earningsCents - a.profile.earningsCents;
    if (sort === 'recent') return String(b.profile.lastLocationUpdatedAt || '').localeCompare(String(a.profile.lastLocationUpdatedAt || ''));
    return b.profile.rating - a.profile.rating;
  });

  const items = drivers.slice(offset, offset + limit).map(entry => ({
    userId: entry.profile.userId,
    email: entry.user?.email,
    rating: entry.profile.rating,
    acceptanceRate: entry.profile.acceptanceRate,
    earningsCents: entry.profile.earningsCents,
    available: entry.profile.available,
    vehicleType: entry.vehicle?.vehicleType,
    vehicle: entry.vehicle ? {
      id: entry.vehicle.vehicleId,
      make: entry.vehicle.make,
      model: entry.vehicle.model,
      color: entry.vehicle.color,
      licensePlate: entry.vehicle.licensePlate
    } : null,
    lastSeenAt: entry.profile.lastLocationUpdatedAt
  }));

  recordSearch(actor?.id, 'drivers', toFilterRecord(query), drivers.length);
  return { module: 'search', action: 'drivers', ok: true, total: drivers.length, limit, offset, drivers: items };
}

export async function searchRides(query: Record<string, unknown>, actor?: SearchActor) {
  const q = normalizeText(query.q);
  const status = normalizeText(query.status);
  const vehicleType = normalizeText(query.vehicleType);
  const minFare = parseNumber(query.minFare);
  const maxFare = parseNumber(query.maxFare);
  const minRating = parseNumber(query.minRating);
  const from = parseDate(query.from || query.startDate);
  const to = parseDate(query.to || query.endDate);
  const sort = normalizeText(query.sort) || 'recent';
  const limit = clamp(query.limit, 20, 1, 100);
  const offset = clamp(query.offset, 0, 0, 10_000);

  let rides = Array.from(store.rides.values())
    .filter(ride => canAccessRide(actor, ride))
    .filter(ride => !status || ride.status === status)
    .filter(ride => !vehicleType || ride.vehicleType === vehicleType)
    .filter(ride => minFare == null || Math.round((ride.fareDetails?.total ?? ride.fareEstimate) * 100) >= minFare)
    .filter(ride => maxFare == null || Math.round((ride.fareDetails?.total ?? ride.fareEstimate) * 100) <= maxFare)
    .filter(ride => minRating == null || Number(ride.rating || 0) >= minRating)
    .filter(ride => !from || new Date(ride.createdAt) >= from)
    .filter(ride => !to || new Date(ride.createdAt) <= to)
    .filter(ride => !q || getRideSearchText(ride).includes(q));

  rides.sort((a, b) => {
    if (sort === 'price') {
      return Math.round(((b.fareDetails?.total ?? b.fareEstimate) * 100)) - Math.round(((a.fareDetails?.total ?? a.fareEstimate) * 100));
    }
    return b.createdAt.localeCompare(a.createdAt);
  });

  const items = rides.slice(offset, offset + limit).map(ride => ({
    id: ride.id,
    riderId: ride.riderId,
    driverId: ride.driverId,
    status: ride.status,
    vehicleType: ride.vehicleType,
    pickupAddress: ride.pickupAddress,
    dropoffAddress: ride.dropoffAddress,
    fareCents: Math.round((ride.fareDetails?.total ?? ride.fareEstimate) * 100),
    rating: ride.rating,
    createdAt: ride.createdAt,
    completedAt: ride.completedAt
  }));

  recordSearch(actor?.id, 'rides', toFilterRecord(query), rides.length);
  return { module: 'search', action: 'rides', ok: true, total: rides.length, limit, offset, rides: items };
}

export async function saveSearch(body: Record<string, unknown>, actor?: SearchActor) {
  if (!actor?.id) return { module: 'search', action: 'save', error: 'userId required' };
  const resource = normalizeText(body.resource) as SearchResource;
  if (resource !== 'drivers' && resource !== 'rides') {
    return { module: 'search', action: 'save', error: 'resource must be drivers or rides' };
  }
  const savedSearch: SavedSearch = {
    id: makeId('savedsearch'),
    userId: actor.id,
    name: String(body.name || `${resource} search`).trim(),
    resource,
    filters: toFilterRecord((body.filters as Record<string, unknown>) || {}),
    createdAt: timestamp(),
    updatedAt: timestamp()
  };
  store.savedSearches.push(savedSearch);
  return { module: 'search', action: 'save', ok: true, savedSearch };
}

export async function recentSearches(query: Record<string, unknown>, actor?: SearchActor) {
  if (!actor?.id) return { module: 'search', action: 'recent', error: 'userId required' };
  const limit = clamp(query.limit, 20, 1, 100);
  const recent = store.searchHistory
    .filter(entry => entry.userId === actor.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
  const saved = store.savedSearches
    .filter(entry => entry.userId === actor.id)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return { module: 'search', action: 'recent', ok: true, recent, saved };
}
