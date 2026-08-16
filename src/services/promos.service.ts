import {
  getPromoByCode,
  hasUserUsedPromo
} from '../database/data.store';

function roundToTwo(value: number) {
  return Math.round(value * 100) / 100;
}

export async function validatePromo(body: any) {
  const code = String(body?.code || '').trim().toUpperCase();
  const riderId = String(body?.actor?.id || body?.actor?.sub || body?.riderId || '').trim();
  const fare = Number(body?.fare || 0);

  if (!code) {
    return { module: 'promos', action: 'validate', valid: false, error: 'promo code required' };
  }

  if (!riderId) {
    return { module: 'promos', action: 'validate', valid: false, error: 'authenticated rider required' };
  }

  if (!Number.isFinite(fare) || fare <= 0) {
    return { module: 'promos', action: 'validate', valid: false, error: 'valid fare required' };
  }

  const promo = getPromoByCode(code);
  if (!promo) {
    return { module: 'promos', action: 'validate', valid: false, error: 'promo code not found or expired' };
  }

  if (promo.maxUsages != null && promo.usageCount >= promo.maxUsages) {
    return { module: 'promos', action: 'validate', valid: false, error: 'promo usage limit reached' };
  }

  if (promo.minFareCents != null && Math.round(fare * 100) < promo.minFareCents) {
    return { module: 'promos', action: 'validate', valid: false, error: 'fare does not meet promo minimum' };
  }

  if (hasUserUsedPromo(riderId, promo.id)) {
    return { module: 'promos', action: 'validate', valid: false, error: 'promo code already used by this rider' };
  }

  const fareCents = Math.round(fare * 100);
  const discountCents = promo.discountType === 'flat'
    ? Math.min(promo.discountValue, fareCents)
    : Math.min(fareCents, Math.round(fareCents * promo.discountValue / 100));

  const discountAmount = roundToTwo(discountCents / 100);
  const finalFare = roundToTwo(Math.max(0, fare - discountAmount));

  const description = promo.discountType === 'percent'
    ? `${promo.discountValue}% off this ride`
    : `$${(promo.discountValue / 100).toFixed(2)} off this ride`;

  return {
    module: 'promos',
    action: 'validate',
    valid: true,
    promo: {
      id: promo.id,
      code: promo.code,
      discountType: promo.discountType,
      discountValue: promo.discountValue,
      minFareCents: promo.minFareCents,
      expiresAt: promo.expiresAt
    },
    description,
    originalFare: roundToTwo(fare),
    discountAmount,
    finalFare
  };
}