import type { DirectionPreference, DriverPreferences, LatLng, NearbyRequest, RideHistoryItem, RideRequest, RideType } from '../../types/drive';

const downtown: LatLng = { latitude: 37.7749, longitude: -122.4194 };
const pointOffsets = [0.22, -0.18, 0.3, -0.12, 0.14, -0.26];
const nearbyZones = ['Mission Bay', 'SoMa', 'Downtown', 'Financial District'];
const nearbyDistances = [0.9, 1.3, 2.1, 3.2];
const nearbySurge = [1.1, 1.4, 1.2, 1.5];
const riderNames = ['Olivia M.', 'Daniel R.', 'Ava T.', 'Marcus J.'];
const pickupAddresses = ['Oracle Park · 24 Willie Mays Plaza', 'Ferry Building · Main Entrance', 'SFMOMA · Howard St pickup zone', 'Chase Center · East rideshare lot'];
const dropoffAddresses = ['Union Square · Geary St', 'Mission Dolores · 19th St', 'Pac Heights · Fillmore St', 'Embarcadero Center · Drumm St'];
const riderRatings = [4.96, 4.89, 4.98, 4.91];
const rideTypes: RideType[] = ['standard', 'xl', 'comfort', 'standard'];
const directionTags: Array<Exclude<DirectionPreference, 'any'>> = ['toward_downtown', 'away_from_downtown', 'toward_downtown', 'away_from_downtown'];

type PendingRideRequest = Omit<RideRequest, 'expiresAt'>;
type BuildIncomingRideRequestsArgs = {
  driverPreferences?: DriverPreferences;
  nearbyRequests?: NearbyRequest[];
  declinedRequestIds?: string[];
};

export const getSeedLocation = (): LatLng => downtown;

export const buildTripPoint = (index = 0, spread = 0.018): LatLng => ({
  latitude: downtown.latitude + pointOffsets[index % pointOffsets.length] * spread,
  longitude: downtown.longitude + pointOffsets[(index + 2) % pointOffsets.length] * spread,
});

export const buildNearbyRequests = (): NearbyRequest[] =>
  nearbyDistances.map((distanceKm, index) => ({
    id: `nearby-${index + 1}`,
    zoneName: nearbyZones[index],
    position: buildTripPoint(index + 1),
    distanceKm,
    surgeMultiplier: nearbySurge[index],
  }));

const defaultDriverPreferences: DriverPreferences = {
  rideTypes: ['standard', 'comfort'],
  minimumRiderRating: 4.85,
  directionPreference: 'any',
};

const baseIncomingRideRequests = (): PendingRideRequest[] =>
  nearbyDistances.map((distanceKm, index) => ({
    id: `mock-request-${index + 1}`,
    riderName: riderNames[index],
    rideType: rideTypes[index],
    pickupAddress: pickupAddresses[index],
    dropoffAddress: dropoffAddresses[index],
    pickupPosition: buildTripPoint(index + 1),
    dropoffPosition: buildTripPoint(index + 3),
    pickupDistanceKm: distanceKm,
    tripDistanceKm: Number((distanceKm + 2.6 + index * 0.4).toFixed(1)),
    estimatedFare: Number((12.5 + distanceKm * 2.9 + index * 1.75).toFixed(2)),
    surgeMultiplier: 1,
    pickupEtaMinutes: 2 + index,
    riderRating: riderRatings[index],
    directionTag: directionTags[index],
  }));

const scoreRequest = (
  request: PendingRideRequest,
  preferences: DriverPreferences
) => {
  const rideTypeBonus = preferences.rideTypes.includes(request.rideType) ? 8 : -40;
  const ratingBonus = request.riderRating >= preferences.minimumRiderRating ? 6 : -30;
  const directionBonus =
    preferences.directionPreference === 'any' || preferences.directionPreference === request.directionTag ? 5 : -5;
  return request.surgeMultiplier * 18 + Math.max(0, 12 - request.pickupDistanceKm * 3.5) + request.riderRating * 2 + rideTypeBonus + ratingBonus + directionBonus;
};

const toDemandAwareRequest = (request: PendingRideRequest, nearbyRequest?: NearbyRequest): PendingRideRequest => {
  const surgeMultiplier = nearbyRequest?.surgeMultiplier ?? 1;
  const demandEtaPenalty = Math.max(0, Math.round((surgeMultiplier - 1) * 4));
  return {
    ...request,
    surgeMultiplier,
    pickupEtaMinutes: Math.max(1, request.pickupEtaMinutes + demandEtaPenalty),
    estimatedFare: Number((request.estimatedFare * surgeMultiplier).toFixed(2)),
  };
};

export const estimateRequestExpirationSeconds = (request: PendingRideRequest) =>
  Math.max(10, Math.round(20 - Math.min(8, request.pickupDistanceKm * 2) - (request.surgeMultiplier >= 1.35 ? 3 : 0)));

export const buildIncomingRideRequests = ({
  driverPreferences = defaultDriverPreferences,
  nearbyRequests = buildNearbyRequests(),
  declinedRequestIds = [],
}: BuildIncomingRideRequestsArgs = {}): PendingRideRequest[] => {
  const declinedSet = new Set(declinedRequestIds);
  const demandAwareRequests = baseIncomingRideRequests().map((request, index) =>
    toDemandAwareRequest(request, nearbyRequests[index])
  );

  const rankedRequests = demandAwareRequests
    .filter((request) => !declinedSet.has(request.id))
    .filter((request) => request.riderRating >= Math.max(4.6, driverPreferences.minimumRiderRating - 0.2))
    .filter((request) => driverPreferences.rideTypes.includes(request.rideType))
    .sort((left, right) => {
      const rightScore = scoreRequest(right, driverPreferences);
      const leftScore = scoreRequest(left, driverPreferences);
      if (rightScore !== leftScore) {
        return rightScore - leftScore;
      }
      return left.id.localeCompare(right.id);
    });

  return rankedRequests.length > 0 ? rankedRequests : demandAwareRequests.slice(0, 1);
};

export const seedRideHistory = (): RideHistoryItem[] => [
  { id: 'trip-1', riderName: 'Noah B.', route: 'Market St → Mission Bay', fare: 18.2, timeLabel: '12:35 PM', miles: 2.3, date: new Date().toISOString() },
  { id: 'trip-2', riderName: 'Ivy L.', route: 'SOMA → Union Square', fare: 12.4, timeLabel: '11:58 AM', miles: 1.6, date: new Date().toISOString() },
  { id: 'trip-3', riderName: 'Amir K.', route: 'Folsom → Embarcadero', fare: 21.8, timeLabel: '11:08 AM', miles: 3.1, date: new Date().toISOString() },
];
