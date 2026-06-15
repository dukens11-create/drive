export const COMMISSION_RATES = {
  STANDARD: 0.10,      // 10% → Driver keeps 90%
  PREMIUM: 0.12,       // 12% → Driver keeps 88%
  PROMOTIONAL: 0.08    // 8% → Driver keeps 92% (launch period)
};

export const COMMISSION_EFFECTIVE_UNTIL = {
  PROMOTIONAL: '2026-12-31' // Promo rate expires end of year
};

export function isPromotionalPeriodActive(): boolean {
  return new Date() < new Date(COMMISSION_EFFECTIVE_UNTIL.PROMOTIONAL);
}

/**
 * Returns the applicable commission rate for the given ride/vehicle type.
 * During the promotional launch period every ride uses the PROMOTIONAL (8%) rate.
 * After the promo ends, premium/xl rides use PREMIUM (12%) and all others STANDARD (10%).
 */
export function getCommissionRate(rideType?: string): number {
  if (isPromotionalPeriodActive()) {
    return COMMISSION_RATES.PROMOTIONAL;
  }
  const type = String(rideType || 'STANDARD').toUpperCase();
  // Map vehicle types to commission tiers
  if (type === 'PREMIUM' || type === 'XL') {
    return COMMISSION_RATES.PREMIUM;
  }
  return COMMISSION_RATES.STANDARD;
}
