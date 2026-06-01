import type { ActiveTrip, LatLng } from '../types/drive';

export type NavigationStep = {
  distanceKm: number;
  etaMinutes: number;
  instruction: string;
  voiceInstruction: string;
  arrow: string;
  maneuver: 'straight' | 'left' | 'right';
  target: 'pickup' | 'dropoff';
};

export type NavigationRoute = {
  waypoints: LatLng[];
  polyline: LatLng[];
  steps: NavigationStep[];
  currentStep: NavigationStep;
  upcomingSteps: NavigationStep[];
  remainingDistanceKm: number;
  remainingDurationMinutes: number;
  currentTarget: 'pickup' | 'dropoff';
  currentTargetDistanceKm: number;
  currentTargetEtaMinutes: number;
  nextInstruction: string;
  voiceInstruction: string;
  trafficLevel: 'light' | 'moderate' | 'heavy';
  trafficDelayMinutes: number;
  arrivalMessage: string | null;
};

const EARTH_RADIUS_KM = 6371;
const DEFAULT_AVERAGE_CITY_SPEED_KPH = 30;
const ARRIVAL_ALERT_DISTANCE_KM = 0.2;
const MIN_SEGMENT_DISTANCE_KM = 0.03;
const MIN_LEG_DELTA_THRESHOLD = 0.0007;
const VIA_POINT_OFFSET_RATIO = 0.18;
const TURN_ANGLE_THRESHOLD_DEGREES = 20;
const BEARING_NORMALIZATION_OFFSET = 540;

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

const headingToArrow = (heading: number) => {
  const arrows = ['↑', '↗', '→', '↘', '↓', '↙', '←', '↖'];
  return arrows[Math.round(heading / 45) % arrows.length];
};

const getTrafficLevel = (): NavigationRoute['trafficLevel'] => {
  const hour = new Date().getHours();
  if ((hour >= 7 && hour < 10) || (hour >= 16 && hour < 19)) {
    return 'heavy';
  }
  if ((hour >= 6 && hour < 7) || (hour >= 10 && hour < 12) || (hour >= 15 && hour < 16) || (hour >= 19 && hour < 21)) {
    return 'moderate';
  }
  return 'light';
};

const getTrafficMultiplier = (trafficLevel: NavigationRoute['trafficLevel']) => {
  switch (trafficLevel) {
    case 'heavy':
      return 1.35;
    case 'moderate':
      return 1.15;
    default:
      return 1;
  }
};

const estimateDurationMinutes = (
  distanceKm: number,
  speedKph = DEFAULT_AVERAGE_CITY_SPEED_KPH,
  trafficLevel: NavigationRoute['trafficLevel'] = 'light'
) => Math.max(1, Math.round((distanceKm / speedKph) * 60 * getTrafficMultiplier(trafficLevel)));

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

const buildLegWaypoints = (start: LatLng, end: LatLng): LatLng[] => {
  const latDelta = end.latitude - start.latitude;
  const lngDelta = end.longitude - start.longitude;

  if (Math.abs(latDelta) < MIN_LEG_DELTA_THRESHOLD || Math.abs(lngDelta) < MIN_LEG_DELTA_THRESHOLD) {
    return [start, end];
  }

  const viaPoint =
    Math.abs(lngDelta) >= Math.abs(latDelta)
      ? {
          // Use a small offset from the current path so the generated route gains a readable intermediate turn.
          // The 0.18 ratio keeps the via point close enough to feel realistic while still producing a visible turn.
          latitude: start.latitude + latDelta * VIA_POINT_OFFSET_RATIO,
          longitude: end.longitude,
        }
      : {
          // Mirror the same 0.18 offset when changing latitude first so both route shapes stay similarly compact.
          latitude: end.latitude,
          longitude: start.longitude + lngDelta * VIA_POINT_OFFSET_RATIO,
        };

  if (distanceKmBetween(start, viaPoint) < MIN_SEGMENT_DISTANCE_KM || distanceKmBetween(viaPoint, end) < MIN_SEGMENT_DISTANCE_KM) {
    return [start, end];
  }

  return [start, viaPoint, end];
};

export const buildNavigationRoute = (origin: LatLng, trip: ActiveTrip | null): NavigationRoute | null => {
  if (!trip || trip.status === 'completed') {
    return null;
  }

  const trafficLevel = getTrafficLevel();
  const legs =
    trip.status === 'accepted'
      ? [
          { target: 'pickup' as const, points: buildLegWaypoints(origin, trip.pickupPosition) },
          { target: 'dropoff' as const, points: buildLegWaypoints(trip.pickupPosition, trip.dropoffPosition) },
        ]
      : [{ target: 'dropoff' as const, points: buildLegWaypoints(origin, trip.dropoffPosition) }];

  const waypoints = legs.flatMap((leg, index) => (index === 0 ? leg.points : leg.points.slice(1)));
  if (waypoints.length < 2 || !legs[0]) {
    return null;
  }

  const steps: NavigationStep[] = [];
  let polyline: LatLng[] = [];
  let currentTargetDistanceKm = 0;
  let currentTargetEtaMinutes = 0;

  legs.forEach((leg, legIndex) => {
    let previousBearing: number | null = null;

    leg.points.slice(1).forEach((point, pointIndex) => {
      const from = leg.points[pointIndex];
      const distanceKm = distanceKmBetween(from, point);
      if (distanceKm < MIN_SEGMENT_DISTANCE_KM) {
        return;
      }

      const bearing = bearingBetween(from, point);
      const heading = headingToDirection(bearing);
      const isFirstSegment = pointIndex === 0;
      // Add BEARING_NORMALIZATION_OFFSET before the modulo so the normalized delta remains in the [-180, 180] range
      // even when the turn crosses the 0/360 bearing wraparound.
      const turnDelta = previousBearing === null ? 0 : ((bearing - previousBearing + BEARING_NORMALIZATION_OFFSET) % 360) - 180;
      const maneuver =
        previousBearing === null || Math.abs(turnDelta) < TURN_ANGLE_THRESHOLD_DEGREES ? 'straight' : turnDelta > 0 ? 'right' : 'left';
      const instruction =
        maneuver === 'left'
          ? `Turn left toward ${leg.target}`
          : maneuver === 'right'
            ? `Turn right toward ${leg.target}`
            : isFirstSegment
              ? `Head ${heading} to ${leg.target}`
              : `Continue ${heading} toward ${leg.target}`;
      const step = {
        distanceKm: Number(distanceKm.toFixed(2)),
        etaMinutes: estimateDurationMinutes(distanceKm, DEFAULT_AVERAGE_CITY_SPEED_KPH, trafficLevel),
        instruction,
        voiceInstruction: `${instruction}. ${Number(distanceKm.toFixed(1))} kilometers remaining.`,
        arrow: maneuver === 'straight' ? headingToArrow(bearing) : maneuver === 'left' ? '←' : '→',
        maneuver,
        target: leg.target,
      } satisfies NavigationStep;

      steps.push(step);
      if (legIndex === 0) {
        currentTargetDistanceKm += step.distanceKm;
        currentTargetEtaMinutes += step.etaMinutes;
      }

      const segment = interpolateSegment(from, point);
      polyline = [...polyline, ...(polyline.length === 0 ? segment : segment.slice(1))];
      previousBearing = bearing;
    });
  });

  if (!steps[0]) {
    return null;
  }

  const remainingDistanceKm = Number(steps.reduce((sum, step) => sum + step.distanceKm, 0).toFixed(1));
  const remainingDurationMinutes = steps.reduce((sum, step) => sum + step.etaMinutes, 0);
  const baseDurationMinutes = steps.reduce((sum, step) => sum + estimateDurationMinutes(step.distanceKm), 0);
  const trafficDelayMinutes = Math.max(0, remainingDurationMinutes - baseDurationMinutes);
  const currentTarget = legs[0].target;
  const arrivalDistanceKm = distanceKmBetween(origin, currentTarget === 'pickup' ? trip.pickupPosition : trip.dropoffPosition);
  const arrivalMessage =
    arrivalDistanceKm <= ARRIVAL_ALERT_DISTANCE_KM
      ? currentTarget === 'pickup'
        ? 'Arriving at pickup now.'
        : 'Arriving at dropoff now.'
      : null;
  const currentStep = steps[0];
  const nextInstruction = arrivalMessage ?? currentStep.instruction;
  const voiceInstruction = arrivalMessage ?? currentStep.voiceInstruction;

  return {
    waypoints,
    polyline,
    steps,
    currentStep,
    upcomingSteps: steps.slice(1, 4),
    remainingDistanceKm,
    remainingDurationMinutes,
    currentTarget,
    currentTargetDistanceKm: Number(currentTargetDistanceKm.toFixed(1)),
    currentTargetEtaMinutes,
    nextInstruction,
    voiceInstruction,
    trafficLevel,
    trafficDelayMinutes,
    arrivalMessage,
  };
};
