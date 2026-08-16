import { env } from '../config/env';

const ALLOWED_COUNTRIES = new Set(['US', 'CA', 'MX']);
const GOOGLE_PLACES_URL = 'https://places.googleapis.com/v1/places:searchNearby';
const DEFAULT_RADIUS_METERS = 12000;
const MAX_RADIUS_METERS = 50000;
const MAX_RESULTS = 20;

export type NearbyRestaurantPlace = {
  provider: 'google_places';
  providerPlaceId: string;
  name: string;
  address: string;
  countryCode: 'US' | 'CA' | 'MX';
  country: string;
  city?: string;
  latitude: number;
  longitude: number;
  primaryType?: string;
  types: string[];
  rating?: number;
  userRatingCount?: number;
  priceLevel?: string;
  businessStatus?: string;
  googleMapsUri?: string;
  distanceMeters: number;
};

function numeric(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function clampRadius(value: unknown) {
  const requested = numeric(value) ?? DEFAULT_RADIUS_METERS;
  return Math.min(MAX_RADIUS_METERS, Math.max(250, Math.round(requested)));
}

function validCoordinates(latInput: unknown, lngInput: unknown) {
  const lat = numeric(latInput);
  const lng = numeric(lngInput);

  if (
    lat === undefined
    || lng === undefined
    || lat < -90
    || lat > 90
    || lng < -180
    || lng > 180
  ) {
    return null;
  }

  return { lat, lng };
}

function radians(value: number) {
  return value * Math.PI / 180;
}

function distanceMeters(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number }
) {
  const radius = 6371000;
  const dLat = radians(destination.lat - origin.lat);
  const dLng = radians(destination.lng - origin.lng);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(radians(origin.lat))
    * Math.cos(radians(destination.lat))
    * Math.sin(dLng / 2) ** 2;
  return 2 * radius * Math.asin(Math.sqrt(a));
}

function addressComponent(place: any, type: string) {
  const components = Array.isArray(place?.addressComponents) ? place.addressComponents : [];
  return components.find((component: any) => Array.isArray(component?.types) && component.types.includes(type));
}

function countryCode(place: any) {
  const country = addressComponent(place, 'country');
  return String(country?.shortText || '').trim().toUpperCase();
}

function countryName(place: any) {
  const country = addressComponent(place, 'country');
  return String(country?.longText || '').trim();
}

function cityName(place: any) {
  for (const type of ['locality', 'postal_town', 'administrative_area_level_2', 'administrative_area_level_1']) {
    const component = addressComponent(place, type);
    const value = String(component?.longText || '').trim();
    if (value) return value;
  }
  return undefined;
}

function normalizePlace(
  place: any,
  origin: { lat: number; lng: number }
): NearbyRestaurantPlace | null {
  const country = countryCode(place);
  if (!ALLOWED_COUNTRIES.has(country)) return null;

  const latitude = numeric(place?.location?.latitude);
  const longitude = numeric(place?.location?.longitude);
  const name = String(place?.displayName?.text || '').trim();

  if (latitude === undefined || longitude === undefined || !name) return null;

  const rating = numeric(place?.rating);
  const userRatingCount = numeric(place?.userRatingCount);

  return {
    provider: 'google_places',
    providerPlaceId: String(place?.id || ''),
    name,
    address: String(place?.formattedAddress || '').trim(),
    countryCode: country as 'US' | 'CA' | 'MX',
    country: countryName(place),
    city: cityName(place),
    latitude,
    longitude,
    primaryType: place?.primaryType ? String(place.primaryType) : undefined,
    types: Array.isArray(place?.types) ? place.types.map((type: unknown) => String(type)) : [],
    rating,
    userRatingCount: userRatingCount === undefined ? undefined : Math.round(userRatingCount),
    priceLevel: place?.priceLevel ? String(place.priceLevel) : undefined,
    businessStatus: place?.businessStatus ? String(place.businessStatus) : undefined,
    googleMapsUri: place?.googleMapsUri ? String(place.googleMapsUri) : undefined,
    distanceMeters: Math.round(distanceMeters(origin, { lat: latitude, lng: longitude }))
  };
}

export async function discoverNearbyRestaurants(query: {
  lat?: unknown;
  lng?: unknown;
  radiusMeters?: unknown;
}) {
  const coordinates = validCoordinates(query.lat, query.lng);
  if (!coordinates) {
    return {
      ok: false as const,
      statusCode: 400,
      error: 'valid lat and lng are required'
    };
  }

  if (!env.googlePlacesApiKey) {
    return {
      ok: false as const,
      statusCode: 503,
      error: 'GOOGLE_PLACES_API_KEY is not configured',
      setupRequired: true
    };
  }

  const radiusMeters = clampRadius(query.radiusMeters);

  const response = await fetch(GOOGLE_PLACES_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': env.googlePlacesApiKey,
      'X-Goog-FieldMask': [
        'places.id',
        'places.displayName',
        'places.formattedAddress',
        'places.addressComponents',
        'places.location',
        'places.primaryType',
        'places.types',
        'places.rating',
        'places.userRatingCount',
        'places.priceLevel',
        'places.businessStatus',
        'places.googleMapsUri'
      ].join(',')
    },
    body: JSON.stringify({
      includedTypes: ['restaurant'],
      maxResultCount: MAX_RESULTS,
      rankPreference: 'DISTANCE',
      locationRestriction: {
        circle: {
          center: {
            latitude: coordinates.lat,
            longitude: coordinates.lng
          },
          radius: radiusMeters
        }
      }
    }),
    signal: AbortSignal.timeout(12000)
  });

  const payload = await response.json().catch(() => null) as any;

  if (!response.ok) {
    const upstreamMessage = String(payload?.error?.message || payload?.message || '').trim();
    return {
      ok: false as const,
      statusCode: 502,
      error: upstreamMessage || 'restaurant discovery provider request failed'
    };
  }

  const restaurants = (Array.isArray(payload?.places) ? payload.places : [])
    .map((place: any) => normalizePlace(place, coordinates))
    .filter((place: NearbyRestaurantPlace | null): place is NearbyRestaurantPlace => Boolean(place))
    .sort((a: NearbyRestaurantPlace, b: NearbyRestaurantPlace) => a.distanceMeters - b.distanceMeters);

  return {
    ok: true as const,
    provider: 'google_places' as const,
    coverageCountries: ['US', 'CA', 'MX'] as const,
    radiusMeters,
    origin: coordinates,
    restaurants
  };
}
