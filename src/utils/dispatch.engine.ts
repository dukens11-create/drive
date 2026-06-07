import { store } from '../database/data.store';
import { getDriverDispatchVehicleType, isDriverDispatchEligible } from '../services/drivers.service';

type Candidate = {
  driverId: string;
  distanceMiles: number;
  rating: number;
  acceptanceRate: number;
  cancellationRate: number;
  vehicleType?: string;
};

function toMiles(lat1: number, lng1: number, lat2: number, lng2: number) {
  if (![lat1, lng1, lat2, lng2].every(Number.isFinite)) return 2;
  const dx = lat1 - lat2;
  const dy = lng1 - lng2;
  return Math.sqrt(dx * dx + dy * dy) * 69;
}

export function scoreDriver(d: Candidate) {
  return (1 / Math.max(d.distanceMiles, 0.1)) * 45 + d.rating * 10 + d.acceptanceRate * 25 - d.cancellationRate * 35;
}

export function rankDrivers(candidates: Candidate[]) {
  return candidates.map(d => ({ ...d, score: scoreDriver(d) })).sort((a, b) => b.score - a.score);
}

export async function findNearbyDrivers(lat: number, lng: number) {
  const drivers = Array.from(store.drivers.values())
    .filter(d => isDriverDispatchEligible(d))
    .map(d => ({
      driverId: d.userId,
      distanceMiles: toMiles(lat, lng, Number(d.lat), Number(d.lng)),
      rating: d.rating,
      acceptanceRate: d.acceptanceRate,
      cancellationRate: d.cancellationRate,
      vehicleType: getDriverDispatchVehicleType(d.userId)
    }));

  return drivers.slice(0, 30);
}

export async function dispatchRide(ride: any) {
  const requestedVehicleType = typeof ride?.vehicleType === 'string' ? ride.vehicleType.trim().toLowerCase() : '';
  const nearbyCandidates = await findNearbyDrivers(Number(ride.pickupLat), Number(ride.pickupLng));
  let candidates = nearbyCandidates.filter(candidate => {
    if (!requestedVehicleType) return true;
    return candidate.vehicleType === requestedVehicleType;
  });
  if (requestedVehicleType && candidates.length === 0) {
    candidates = nearbyCandidates.filter(candidate => !candidate.vehicleType || candidate.vehicleType === requestedVehicleType);
  }
  const ranked = rankDrivers(candidates);
  return { rideId: ride.id, selected: ranked[0] || null, candidates: ranked };
}
