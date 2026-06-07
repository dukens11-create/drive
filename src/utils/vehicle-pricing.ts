import type { VehicleType } from '../database/data.store';

export const vehicleTypePricing: Record<VehicleType, {
  baseMultiplier: number;
  minFare: number;
  distanceRate: number;
  timeRate: number;
  description: string;
}> = {
  economy: {
    baseMultiplier: 1,
    minFare: 2.5,
    distanceRate: 1.9,
    timeRate: 0.25,
    description: 'Affordable rides for everyday trips'
  },
  comfort: {
    baseMultiplier: 1.15,
    minFare: 3,
    distanceRate: 2.19,
    timeRate: 0.29,
    description: 'Extra comfort with a larger vehicle'
  },
  premium: {
    baseMultiplier: 1.5,
    minFare: 5,
    distanceRate: 2.85,
    timeRate: 0.38,
    description: 'Premium rides with luxury vehicles'
  },
  xl: {
    baseMultiplier: 1.75,
    minFare: 6,
    distanceRate: 3.33,
    timeRate: 0.44,
    description: 'Extra room for groups and luggage'
  }
};

export function getPricingForVehicleType(vehicleType?: string) {
  const normalized = String(vehicleType || 'economy').trim().toLowerCase() as VehicleType;
  return vehicleTypePricing[normalized] || vehicleTypePricing.economy;
}
