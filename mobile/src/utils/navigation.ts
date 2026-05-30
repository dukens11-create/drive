import type { ActiveTrip, LatLng } from '../types/drive';

type NavigationStep = {
  distanceKm: number;
  etaMinutes: number;
  instruction: string;
};

export type NavigationRoute = {
  waypoints: LatLng[];
  polyline: LatLng[];
  steps: NavigationStep[];
  remainingDistanceKm: number;
  remainingDurationMinutes: number;
  nextInstruction: string;
};

const EARTH_RADIUS_KM = 6371;
const DEFAULT_AVERAGE_CITY_SPEED_KPH = 30;

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
const toDegrees = (radians: number) => (radians * 180) / Math.PI;

export const distanceKmBetween = (start: LatLng, end: LatLng) => {
  const latDelta = toRadians(end.latitude - start.latitude);
  const lngDelta = toRadians(end.longitude - start.longitude);
  const lat1 = toRadians(start.latitude);
  const lat2 = toRadians(end.latitude);

  const haversine =
    Math.sin(latDelta / 2) * Math.sin(latDelta / 2) +
    Math.sin(lngDelta / 2) * Math.sin(lngDelta / 2) * Math.cos(lat1) * Math.cos(lat2);

  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
};

const bearingBetween = (start: LatLng, end: LatLng) => {
  const lat1 = toRadians(start.latitude);
  const lat2 = toRadians(end.latitude);
  const lngDelta = toRadians(end.longitude - start.longitude);

  const y = Math.sin(lngDelta) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(lngDelta);

  return (toDegrees(Math.atan2(y, x)) + 360) % 360;
};

const headingToDirection = (heading: number) => {
  const sectors = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'];
  return sectors[Math.round(heading / 45) % sectors.length];
};

const estimateDurationMinutes = (distanceKm: number, speedKph = DEFAULT_AVERAGE_CITY_SPEED_KPH) =>
  Math.max(1, Math.round((distanceKm / speedKph) * 60));

const interpolateSegment = (start: LatLng, end: LatLng, points = 16) => {
  const route: LatLng[] = [];
  for (let index = 0; index <= points; index += 1) {
    const progress = index / points;
    route.push({
      latitude: start.latitude + (end.latitude - start.latitude) * progress,
      longitude: start.longitude + (end.longitude - start.longitude) * progress,
    });
  }
  return route;
};

const optimizeWaypoints = (origin: LatLng, trip: ActiveTrip): LatLng[] => {
  if (trip.status === 'accepted') {
    return [origin, trip.pickupPosition, trip.dropoffPosition];
  }
  if (trip.status === 'in-progress') {
    return [origin, trip.dropoffPosition];
  }
  return [origin];
};

export const buildNavigationRoute = (origin: LatLng, trip: ActiveTrip | null): NavigationRoute | null => {
  if (!trip || trip.status === 'completed') {
    return null;
  }

  const waypoints = optimizeWaypoints(origin, trip);
  if (waypoints.length < 2) {
    return null;
  }

  const steps = waypoints.slice(1).map((point, index) => {
    const from = waypoints[index];
    const distanceKm = distanceKmBetween(from, point);
    const heading = headingToDirection(bearingBetween(from, point));
    const destinationLabel = index === 0 && trip.status === 'accepted' ? 'pickup' : 'dropoff';
    return {
      distanceKm: Number(distanceKm.toFixed(2)),
      etaMinutes: estimateDurationMinutes(distanceKm),
      instruction: `Head ${heading} to ${destinationLabel}`,
    };
  });

  const polyline = waypoints.slice(1).flatMap((point, index) => {
    const segment = interpolateSegment(waypoints[index], point);
    return index === 0 ? segment : segment.slice(1);
  });

  const remainingDistanceKm = Number(steps.reduce((sum, step) => sum + step.distanceKm, 0).toFixed(1));
  const remainingDurationMinutes = steps.reduce((sum, step) => sum + step.etaMinutes, 0);

  return {
    waypoints,
    polyline,
    steps,
    remainingDistanceKm,
    remainingDurationMinutes,
    nextInstruction: steps[0]?.instruction ?? 'Continue straight',
  };
};
