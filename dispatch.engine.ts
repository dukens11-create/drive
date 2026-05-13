type Candidate = {
  driverId: string;
  distanceMiles: number;
  rating: number;
  acceptanceRate: number;
  cancellationRate: number;
  vehicleType?: string;
};

export function scoreDriver(d: Candidate) {
  return (1 / Math.max(d.distanceMiles, 0.1)) * 45 + d.rating * 10 + d.acceptanceRate * 25 - d.cancellationRate * 35;
}

export function rankDrivers(candidates: Candidate[]) {
  return candidates.map(d => ({ ...d, score: scoreDriver(d) })).sort((a,b) => b.score - a.score);
}

export async function findNearbyDrivers(_lat:number, _lng:number) {
  // Production: Redis GEOSEARCH + PostGIS fallback.
  return [
    { driverId:'driver_1', distanceMiles:0.5, rating:4.9, acceptanceRate:0.96, cancellationRate:0.01 },
    { driverId:'driver_2', distanceMiles:1.2, rating:4.8, acceptanceRate:0.90, cancellationRate:0.03 }
  ];
}

export async function dispatchRide(ride:any) {
  const candidates = await findNearbyDrivers(ride.pickupLat, ride.pickupLng);
  const ranked = rankDrivers(candidates);
  return { rideId: ride.id, selected: ranked[0], candidates: ranked };
}
