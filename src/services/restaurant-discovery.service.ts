import { env } from '../config/env';

const ALLOWED_COUNTRIES = new Set(['US', 'CA', 'MX']);
const GOOGLE_PLACES_URL = 'https://places.googleapis.com/v1/places:searchNearby';
const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const DEFAULT_RADIUS_METERS = 12000;
const MAX_RADIUS_METERS = 50000;
const MAX_RESULTS = 20;

export type NearbyRestaurantPlace = {
  provider: 'google_places' | 'openstreetmap';
  providerPlaceId: string;
  name: string;
  address: string;
  countryCode?: 'US' | 'CA' | 'MX';
  country?: string;
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
  website?: string;
  phone?: string;
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

function isSupportedCoveragePoint(point: { lat: number; lng: number }) {
  const { lat, lng } = point;

  // United States (contiguous)
  if (lat >= 24.0 && lat <= 50.0 && lng >= -125.0 && lng <= -66.0) return true;

  // Alaska / Aleutian area
  if (lat >= 51.0 && lat <= 72.0 && lng >= -180.0 && lng <= -129.0) return true;

  // Hawaii
  if (lat >= 18.0 && lat <= 23.0 && lng >= -161.0 && lng <= -154.0) return true;

  // Canada
  if (lat >= 41.0 && lat <= 84.0 && lng >= -142.0 && lng <= -52.0) return true;

  // Mexico
  if (lat >= 14.0 && lat <= 33.5 && lng >= -119.0 && lng <= -86.0) return true;

  return false;
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
  return components.find(
    (component: any) => Array.isArray(component?.types) && component.types.includes(type)
  );
}

function googleCountryCode(place: any) {
  const country = addressComponent(place, 'country');
  return String(country?.shortText || '').trim().toUpperCase();
}

function googleCountryName(place: any) {
  const country = addressComponent(place, 'country');
  return String(country?.longText || '').trim();
}

function googleCityName(place: any) {
  for (const type of [
    'locality',
    'postal_town',
    'administrative_area_level_2',
    'administrative_area_level_1'
  ]) {
    const component = addressComponent(place, type);
    const value = String(component?.longText || '').trim();
    if (value) return value;
  }

  return undefined;
}

function normalizeGooglePlace(
  place: any,
  origin: { lat: number; lng: number }
): NearbyRestaurantPlace | null {
  const country = googleCountryCode(place);
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
    country: googleCountryName(place),
    city: googleCityName(place),
    latitude,
    longitude,
    primaryType: place?.primaryType ? String(place.primaryType) : undefined,
    types: Array.isArray(place?.types)
      ? place.types.map((type: unknown) => String(type))
      : [],
    rating,
    userRatingCount: userRatingCount === undefined
      ? undefined
      : Math.round(userRatingCount),
    priceLevel: place?.priceLevel ? String(place.priceLevel) : undefined,
    businessStatus: place?.businessStatus
      ? String(place.businessStatus)
      : undefined,
    googleMapsUri: place?.googleMapsUri
      ? String(place.googleMapsUri)
      : undefined,
    website: place?.websiteUri ? String(place.websiteUri) : undefined,
    phone: place?.nationalPhoneNumber
      ? String(place.nationalPhoneNumber)
      : undefined,
    distanceMeters: Math.round(
      distanceMeters(origin, { lat: latitude, lng: longitude })
    )
  };
}

function osmCoordinate(element: any) {
  const latitude = numeric(element?.lat ?? element?.center?.lat);
  const longitude = numeric(element?.lon ?? element?.center?.lon);

  if (latitude === undefined || longitude === undefined) return null;
  return { latitude, longitude };
}

function osmAddress(tags: Record<string, unknown>) {
  const house = String(tags['addr:housenumber'] || '').trim();
  const street = String(tags['addr:street'] || '').trim();
  const city = String(
    tags['addr:city']
    || tags['addr:town']
    || tags['addr:village']
    || ''
  ).trim();
  const state = String(tags['addr:state'] || '').trim();
  const postcode = String(tags['addr:postcode'] || '').trim();
  const country = String(tags['addr:country'] || '').trim();

  const streetLine = [house, street].filter(Boolean).join(' ');
  return [streetLine, city, state, postcode, country].filter(Boolean).join(', ');
}

function normalizeOsmPlace(
  element: any,
  origin: { lat: number; lng: number }
): NearbyRestaurantPlace | null {
  const tags = element?.tags && typeof element.tags === 'object'
    ? element.tags as Record<string, unknown>
    : {};

  const coordinate = osmCoordinate(element);
  const name = String(tags.name || tags.brand || '').trim();

  if (!coordinate || !name) return null;

  const amenity = String(tags.amenity || '').trim().toLowerCase();
  const cuisine = String(tags.cuisine || '').trim();
  const countryTag = String(tags['addr:country'] || '').trim().toUpperCase();

  if (countryTag && !ALLOWED_COUNTRIES.has(countryTag)) return null;

  const types = [
    amenity,
    ...cuisine.split(';').map(value => value.trim().toLowerCase()).filter(Boolean)
  ].filter(Boolean);

  let primaryType = amenity || 'restaurant';
  if (cuisine) primaryType = cuisine.split(';')[0].trim() || primaryType;

  const website = String(
    tags.website
    || tags['contact:website']
    || tags.url
    || ''
  ).trim();

  const phone = String(
    tags.phone
    || tags['contact:phone']
    || ''
  ).trim();

  return {
    provider: 'openstreetmap',
    providerPlaceId: `osm:${String(element?.type || 'element')}:${String(element?.id || '')}`,
    name,
    address: osmAddress(tags),
    countryCode: ALLOWED_COUNTRIES.has(countryTag)
      ? countryTag as 'US' | 'CA' | 'MX'
      : undefined,
    country: countryTag || undefined,
    city: String(
      tags['addr:city']
      || tags['addr:town']
      || tags['addr:village']
      || ''
    ).trim() || undefined,
    latitude: coordinate.latitude,
    longitude: coordinate.longitude,
    primaryType,
    types,
    website: website || undefined,
    phone: phone || undefined,
    distanceMeters: Math.round(
      distanceMeters(origin, {
        lat: coordinate.latitude,
        lng: coordinate.longitude
      })
    )
  };
}

async function discoverWithGoogle(
  coordinates: { lat: number; lng: number },
  radiusMeters: number
) {
  const response = await fetch(GOOGLE_PLACES_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': env.googlePlacesApiKey as string,
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
        'places.googleMapsUri',
        'places.websiteUri',
        'places.nationalPhoneNumber'
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
    const upstreamMessage = String(
      payload?.error?.message || payload?.message || ''
    ).trim();

    throw new Error(
      upstreamMessage || 'Google Places restaurant discovery request failed'
    );
  }

  return (Array.isArray(payload?.places) ? payload.places : [])
    .map((place: any) => normalizeGooglePlace(place, coordinates))
    .filter(
      (place: NearbyRestaurantPlace | null): place is NearbyRestaurantPlace =>
        Boolean(place)
    )
    .sort(
      (a: NearbyRestaurantPlace, b: NearbyRestaurantPlace) =>
        a.distanceMeters - b.distanceMeters
    )
    .slice(0, MAX_RESULTS);
}

async function discoverWithOpenStreetMap(
  coordinates: { lat: number; lng: number },
  radiusMeters: number
) {
  // Public Overpass is intentionally used only as a no-key fallback.
  // Limit the search radius and result count to be considerate of shared service.
  const overpassRadius = Math.min(radiusMeters, 15000);

  const query = [
    '[out:json][timeout:18];',
    '(',
    `nwr["amenity"~"^(restaurant|fast_food|cafe)$"](around:${overpassRadius},${coordinates.lat},${coordinates.lng});`,
    ');',
    'out center;'
  ].join('\n');

  const response = await fetch(OVERPASS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
      'User-Agent': 'FlupFlap-Eat/1.0 restaurant-discovery'
    },
    body: new URLSearchParams({ data: query }).toString(),
    signal: AbortSignal.timeout(20000)
  });

  const payload = await response.json().catch(() => null) as any;

  if (!response.ok) {
    throw new Error(
      String(payload?.remark || payload?.message || '').trim()
      || 'OpenStreetMap restaurant discovery request failed'
    );
  }

  const normalized = (Array.isArray(payload?.elements) ? payload.elements : [])
    .map((element: any) => normalizeOsmPlace(element, coordinates))
    .filter(
      (place: NearbyRestaurantPlace | null): place is NearbyRestaurantPlace =>
        Boolean(place)
    )
    .filter(place => place.distanceMeters <= overpassRadius)
    .sort(
      (a: NearbyRestaurantPlace, b: NearbyRestaurantPlace) =>
        a.distanceMeters - b.distanceMeters
    );

  const seen = new Set<string>();
  const unique: NearbyRestaurantPlace[] = [];

  for (const place of normalized) {
    const key = [
      place.name.toLowerCase(),
      Math.round(place.latitude * 10000),
      Math.round(place.longitude * 10000)
    ].join('|');

    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(place);

    if (unique.length >= MAX_RESULTS) break;
  }

  return unique;
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

  if (!isSupportedCoveragePoint(coordinates)) {
    return {
      ok: false as const,
      statusCode: 400,
      error: 'FlupFlap Eat live discovery is currently limited to the United States, Canada, and Mexico'
    };
  }

  const radiusMeters = clampRadius(query.radiusMeters);

  try {
    if (env.googlePlacesApiKey) {
      const restaurants = await discoverWithGoogle(coordinates, radiusMeters);

      return {
        ok: true as const,
        provider: 'google_places' as const,
        coverageCountries: ['US', 'CA', 'MX'] as const,
        radiusMeters,
        origin: coordinates,
        restaurants
      };
    }

    const restaurants = await discoverWithOpenStreetMap(
      coordinates,
      radiusMeters
    );

    return {
      ok: true as const,
      provider: 'openstreetmap' as const,
      coverageCountries: ['US', 'CA', 'MX'] as const,
      radiusMeters: Math.min(radiusMeters, 15000),
      origin: coordinates,
      restaurants
    };
  } catch (error: any) {
    return {
      ok: false as const,
      statusCode: 502,
      error: error?.name === 'TimeoutError'
        ? 'restaurant discovery provider timed out'
        : String(error?.message || 'restaurant discovery failed')
    };
  }
}