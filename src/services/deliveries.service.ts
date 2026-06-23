import { makeId, markStoreDirty, store, timestamp } from '../database/data.store';

const PACKAGE_SIZE_FEES: Record<string, number> = {
  small: 2.5,
  medium: 4,
  large: 6.5
};

const BASE_DELIVERY_FEE = 6;
const PER_POUND_FEE = 0.75;

function normalizePackageSize(size: unknown): 'small' | 'medium' | 'large' {
  const normalized = String(size || 'medium').trim().toLowerCase();
  if (normalized === 'small' || normalized === 'medium' || normalized === 'large') return normalized;
  return 'medium';
}

function estimateDeliveryFee(body: any) {
  const packageSize = normalizePackageSize(body?.packageSize);
  const packageWeight = Math.max(0, Number(body?.packageWeight || 0));
  const sizeFee = PACKAGE_SIZE_FEES[packageSize] || PACKAGE_SIZE_FEES.medium;
  const weightFee = Math.round(packageWeight * PER_POUND_FEE * 100) / 100;
  const subtotal = BASE_DELIVERY_FEE + sizeFee + weightFee;
  return Math.round(subtotal * 100) / 100;
}

function getSenderName(body: any, actor: any) {
  const explicitName = String(body?.senderName || '').trim();
  if (explicitName) return explicitName;
  const actorName = String(actor?.name || '').trim();
  if (actorName) return actorName;
  const email = String(actor?.email || '').trim();
  if (!email) return 'Customer';
  const [localPart] = email.split('@');
  const normalized = String(localPart || '').trim();
  return normalized || 'Customer';
}

export async function estimate(body: any, _params?: any, _query?: any) {
  return {
    module: 'deliveries',
    action: 'estimate',
    ok: true,
    estimate: {
      currency: 'USD',
      packageSize: normalizePackageSize(body?.packageSize),
      packageWeight: Math.max(0, Number(body?.packageWeight || 0)),
      deliveryFee: estimateDeliveryFee(body)
    }
  };
}

export async function create(body: any, _params?: any, _query?: any) {
  const actor = body?.actor;
  const customerId = actor?.id;
  if (!customerId) return { module: 'deliveries', action: 'create', error: 'customerId is required' };

  const pickupAddress = String(body?.pickupAddress || '').trim();
  const dropoffAddress = String(body?.dropoffAddress || '').trim();
  const recipientName = String(body?.recipientName || '').trim();
  const recipientPhone = String(body?.recipientPhone || '').trim();
  if (!pickupAddress || !dropoffAddress || !recipientName || !recipientPhone) {
    return { module: 'deliveries', action: 'create', error: 'pickupAddress, dropoffAddress, recipientName, and recipientPhone are required' };
  }

  const packageSize = normalizePackageSize(body?.packageSize);
  const packageWeight = Math.max(0, Number(body?.packageWeight || 0));
  const deliveryFee = estimateDeliveryFee(body);
  const now = timestamp();
  const delivery = {
    id: makeId('delivery'),
    orderId: body?.orderId || makeId('order'),
    status: 'requested' as const,
    etaMinutes: Number(body?.etaMinutes || 45),
    customerId,
    driverId: body?.driverId || undefined,
    senderName: getSenderName(body, actor),
    senderPhone: String(body?.senderPhone || actor?.phone || ''),
    pickupAddress,
    pickupLat: Number.isFinite(Number(body?.pickupLat)) ? Number(body.pickupLat) : undefined,
    pickupLng: Number.isFinite(Number(body?.pickupLng)) ? Number(body.pickupLng) : undefined,
    dropoffAddress,
    dropoffLat: Number.isFinite(Number(body?.dropoffLat)) ? Number(body.dropoffLat) : undefined,
    dropoffLng: Number.isFinite(Number(body?.dropoffLng)) ? Number(body.dropoffLng) : undefined,
    recipientName,
    recipientPhone,
    packageType: String(body?.packageType || body?.packageDescription || 'package'),
    packageSize,
    packageWeight,
    packageDescription: String(body?.packageDescription || ''),
    deliveryFee: Math.round(Math.max(0, deliveryFee) * 100) / 100,
    createdAt: now,
    updatedAt: now
  };

  store.marketplaceDeliveries.set(delivery.id, delivery);
  markStoreDirty();
  return { module: 'deliveries', action: 'create', ok: true, delivery };
}
