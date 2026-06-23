import { makeId, markStoreDirty, store, timestamp, type Delivery, type DeliveryRequest } from '../database/data.store';
import { findNearbyDrivers, rankDrivers } from '../utils/dispatch.engine';
import { isDriverDispatchEligibleForJob, markDriverAssigned, releaseDriverFromRide } from './drivers.service';
import { publishDispatchRideAssigned, publishDispatchRideRequest, publishDispatchRequestExpired } from './realtime-dispatch.service';

const DELIVERY_REQUEST_EXPIRY_MS = 30_000;

function canAccessDelivery(actor: any, delivery: Delivery) {
  if (!actor?.id) return false;
  if (actor.role === 'admin') return true;
  if (actor.role === 'driver') return delivery.driverId === actor.id;
  if (actor.role === 'rider') return delivery.customerId === actor.id;
  return false;
}

function getDeliveryRequestByDeliveryId(deliveryId: string) {
  for (const request of store.deliveryRequests.values()) {
    if (request.deliveryId === deliveryId) return request;
  }
  return null;
}

function syncDeliveryRequestState(request: DeliveryRequest, overrideStatus?: DeliveryRequest['status']) {
  const now = Date.now();
  const expiresAt = new Date(request.expiresAt).getTime();
  if (!overrideStatus && request.status === 'broadcasting' && Number.isFinite(expiresAt) && expiresAt <= now) {
    request.status = 'expired';
  } else if (overrideStatus) {
    request.status = overrideStatus;
  }
  request.updatedAt = timestamp();
  return request;
}

function upsertDeliveryRequestResponse(request: DeliveryRequest, driverId: string, status: DeliveryRequest['responses'][number]['status']) {
  const now = timestamp();
  const existing = request.responses.find(response => response.driverId === driverId);
  if (existing) {
    existing.status = status;
    existing.respondedAt = now;
  } else {
    request.responses.push({ driverId, status, respondedAt: now });
  }
  request.updatedAt = now;
}

function toDeliverySummary(delivery: Delivery) {
  return {
    ...delivery,
    rideId: delivery.id,
    deliveryId: delivery.id,
    requestType: 'delivery',
    riderName: delivery.senderName,
    passengerName: delivery.senderName,
    destinationAddress: delivery.dropoffAddress
  };
}

function toDriverAvailableDelivery(delivery: Delivery) {
  return {
    ...toDeliverySummary(delivery),
    id: delivery.id,
    rideType: 'DELIVERY',
    estimatedEarnings: Number(delivery.deliveryFee || 0)
  };
}

function applyStatusTransition(delivery: Delivery, nextStatus: Delivery['status'], body: any) {
  const now = timestamp();
  const transitions: Record<Delivery['status'], Delivery['status'][]> = {
    requested: ['accepted', 'cancelled'],
    accepted: ['picked_up', 'cancelled'],
    picked_up: ['in_transit', 'cancelled'],
    in_transit: ['delivered', 'cancelled'],
    delivered: [],
    cancelled: []
  };
  if (delivery.status === nextStatus) return { ok: true as const };
  if (!transitions[delivery.status].includes(nextStatus)) {
    return { ok: false as const, error: `invalid delivery status transition from ${delivery.status} to ${nextStatus}` };
  }
  delivery.status = nextStatus;
  delivery.updatedAt = now;
  if (body?.pickupPhotoUrl) delivery.pickupPhotoUrl = String(body.pickupPhotoUrl).trim();
  if (body?.dropoffPhotoUrl) delivery.dropoffPhotoUrl = String(body.dropoffPhotoUrl).trim();
  if (body?.recipientSignature) delivery.recipientSignature = String(body.recipientSignature).trim();
  if (body?.recipientPinCode) delivery.recipientPinCode = String(body.recipientPinCode).trim();
  if (nextStatus === 'picked_up') delivery.pickedUpAt = now;
  if (nextStatus === 'in_transit') delivery.inTransitAt = now;
  if (nextStatus === 'delivered') {
    if (!delivery.recipientSignature && !delivery.recipientPinCode) {
      return { ok: false as const, error: 'recipientSignature or recipientPinCode is required for delivered status' };
    }
    delivery.deliveredAt = now;
  }
  if (nextStatus === 'cancelled') {
    delivery.cancelledAt = now;
    if (body?.cancellationReason) delivery.cancellationReason = String(body.cancellationReason).trim();
  }
  return { ok: true as const };
}

export async function create(body: any, _params?: any, _query?: any) {
  const customerId = body?.actor?.id || body?.customerId;
  if (!customerId) return { module: 'deliveries', action: 'create', error: 'customerId is required' };
  const now = timestamp();
  const delivery: Delivery = {
    id: makeId('delivery'),
    senderName: String(body?.senderName || '').trim(),
    senderPhone: String(body?.senderPhone || '').trim(),
    pickupAddress: String(body?.pickupAddress || '').trim(),
    pickupLat: Number(body?.pickupLat),
    pickupLng: Number(body?.pickupLng),
    recipientName: String(body?.recipientName || '').trim(),
    recipientPhone: String(body?.recipientPhone || '').trim(),
    dropoffAddress: String(body?.dropoffAddress || '').trim(),
    dropoffLat: Number(body?.dropoffLat),
    dropoffLng: Number(body?.dropoffLng),
    packageType: String(body?.packageType || '').trim(),
    packageSize: String(body?.packageSize || '').trim(),
    packageWeight: Number(body?.packageWeight),
    deliveryFee: Number(body?.deliveryFee),
    status: 'requested',
    customerId,
    createdAt: now,
    updatedAt: now
  };
  store.deliveries.set(delivery.id, delivery);

  const candidates = rankDrivers((await findNearbyDrivers(delivery.pickupLat, delivery.pickupLng)).filter(candidate => {
    const profile = store.drivers.get(candidate.driverId);
    return isDriverDispatchEligibleForJob(profile, 'delivery');
  }));
  const request: DeliveryRequest = {
    id: makeId('delivery_request'),
    deliveryId: delivery.id,
    customerId,
    pickupLat: delivery.pickupLat,
    pickupLng: delivery.pickupLng,
    dropoffLat: delivery.dropoffLat,
    dropoffLng: delivery.dropoffLng,
    deliveryFee: delivery.deliveryFee,
    broadcastedDrivers: candidates.map(candidate => candidate.driverId),
    responses: candidates.map(candidate => ({
      driverId: candidate.driverId,
      status: 'broadcasted' as const,
      respondedAt: now
    })),
    expiresAt: new Date(Date.now() + DELIVERY_REQUEST_EXPIRY_MS).toISOString(),
    status: 'broadcasting',
    createdAt: now,
    updatedAt: now
  };
  store.deliveryRequests.set(request.id, request);

  for (const candidate of candidates) {
    publishDispatchRideRequest(candidate.driverId, {
      type: 'delivery_request_created',
      requestType: 'delivery',
      requestId: request.id,
      deliveryId: delivery.id,
      ride: toDriverAvailableDelivery(delivery),
      expiresAt: request.expiresAt,
      updatedAt: now
    });
  }
  markStoreDirty();
  return { module: 'deliveries', action: 'create', ok: true, delivery: toDeliverySummary(delivery), request };
}

export async function detail(body: any, params?: any, _query?: any) {
  const deliveryId = params?.id || body?.id || body?.deliveryId;
  const delivery = store.deliveries.get(deliveryId);
  if (!delivery) return { module: 'deliveries', action: 'detail', error: 'delivery not found' };
  if (!canAccessDelivery(body?.actor, delivery)) return { module: 'deliveries', action: 'detail', error: 'forbidden' };
  return { module: 'deliveries', action: 'detail', ok: true, delivery: toDeliverySummary(delivery), request: getDeliveryRequestByDeliveryId(delivery.id) };
}

export async function available(body: any, _params?: any, query?: any) {
  const actor = body?.actor;
  if (!actor?.id || actor?.role !== 'driver') return { module: 'deliveries', action: 'available', error: 'forbidden' };
  const profile = store.drivers.get(actor.id);
  if (!isDriverDispatchEligibleForJob(profile, 'delivery')) {
    return { module: 'deliveries', action: 'available', ok: true, deliveries: [], requests: [] };
  }
  const limit = Math.max(1, Math.min(100, Number(query?.limit || body?.limit || 20)));
  const deliveries = Array.from(store.deliveryRequests.values())
    .map(request => syncDeliveryRequestState(request))
    .filter(request => request.status === 'broadcasting')
    .filter(request => request.broadcastedDrivers.includes(actor.id))
    .filter(request => {
      const response = request.responses.find(item => item.driverId === actor.id);
      return !response || response.status === 'broadcasted';
    })
    .map(request => store.deliveries.get(request.deliveryId))
    .filter((delivery): delivery is Delivery => Boolean(delivery))
    .filter(delivery => delivery.status === 'requested')
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, limit)
    .map(toDriverAvailableDelivery);
  return { module: 'deliveries', action: 'available', ok: true, deliveries, requests: deliveries };
}

export async function accept(body: any, params?: any, _query?: any) {
  const driverId = body?.actor?.id || body?.driverId;
  if (!driverId) return { module: 'deliveries', action: 'accept', error: 'driverId is required' };
  const deliveryId = params?.id || body?.id || body?.deliveryId;
  const delivery = store.deliveries.get(deliveryId);
  if (!delivery) return { module: 'deliveries', action: 'accept', error: 'delivery not found' };
  const request = getDeliveryRequestByDeliveryId(delivery.id);
  if (request) syncDeliveryRequestState(request);
  if (request?.status === 'expired') return { module: 'deliveries', action: 'accept', error: 'delivery request expired' };
  if (delivery.status !== 'requested' && delivery.status !== 'accepted') {
    return { module: 'deliveries', action: 'accept', error: `delivery cannot be accepted: current status is ${delivery.status}` };
  }
  if (request && request.broadcastedDrivers.length && !request.broadcastedDrivers.includes(driverId)) {
    return { module: 'deliveries', action: 'accept', error: 'driver was not included in this delivery request broadcast' };
  }
  if (delivery.status === 'accepted' && delivery.driverId === driverId) {
    return { module: 'deliveries', action: 'accept', ok: true, delivery: toDeliverySummary(delivery), request };
  }
  if (delivery.status === 'accepted' && delivery.driverId !== driverId) {
    if (request) upsertDeliveryRequestResponse(request, driverId, 'ignored');
    return { module: 'deliveries', action: 'accept', error: 'delivery is already accepted by another driver' };
  }
  const assigned = markDriverAssigned(driverId);
  if (!assigned.ok) return { module: 'deliveries', action: 'accept', error: assigned.error };
  const now = timestamp();
  delivery.driverId = driverId;
  delivery.status = 'accepted';
  delivery.acceptedAt = now;
  delivery.updatedAt = now;
  if (request) {
    request.acceptedDriverId = driverId;
    syncDeliveryRequestState(request, 'accepted');
    upsertDeliveryRequestResponse(request, driverId, 'accepted');
    request.broadcastedDrivers
      .filter(candidateDriverId => candidateDriverId !== driverId)
      .forEach(candidateDriverId => {
        upsertDeliveryRequestResponse(request, candidateDriverId, 'ignored');
        publishDispatchRequestExpired(candidateDriverId, {
          requestType: 'delivery',
          deliveryId: delivery.id,
          requestId: request.id,
          status: 'expired',
          reason: 'accepted_by_other_driver',
          acceptedDriverId: driverId,
          updatedAt: request.updatedAt
        });
      });
  }
  publishDispatchRideAssigned(driverId, {
    requestType: 'delivery',
    status: 'accepted',
    delivery: toDeliverySummary(delivery),
    updatedAt: now
  });
  markStoreDirty();
  return { module: 'deliveries', action: 'accept', ok: true, delivery: toDeliverySummary(delivery), request };
}

export async function updateStatus(body: any, params?: any, _query?: any) {
  const deliveryId = params?.id || body?.id || body?.deliveryId;
  const delivery = store.deliveries.get(deliveryId);
  if (!delivery) return { module: 'deliveries', action: 'status', error: 'delivery not found' };
  const actor = body?.actor;
  const isAdmin = actor?.role === 'admin';
  const isAssignedDriver = actor?.role === 'driver' && delivery.driverId === actor?.id;
  const isOwner = actor?.role === 'rider' && delivery.customerId === actor?.id;
  const nextStatus = String(body?.status || '').trim().toLowerCase() as Delivery['status'];
  if (!nextStatus) return { module: 'deliveries', action: 'status', error: 'status is required' };

  if (nextStatus === 'accepted' && actor?.role === 'driver') {
    return accept(body, params, _query);
  }
  if (!isAdmin && !isAssignedDriver) {
    if (!(isOwner && nextStatus === 'cancelled')) {
      return { module: 'deliveries', action: 'status', error: 'forbidden' };
    }
  }
  const transition = applyStatusTransition(delivery, nextStatus, body);
  if (!transition.ok) return { module: 'deliveries', action: 'status', error: transition.error };
  const request = getDeliveryRequestByDeliveryId(delivery.id);
  if (request) {
    if (nextStatus === 'cancelled') syncDeliveryRequestState(request, 'canceled');
    if (nextStatus === 'delivered') syncDeliveryRequestState(request, 'completed');
  }
  if (nextStatus === 'cancelled' || nextStatus === 'delivered') {
    if (delivery.driverId) releaseDriverFromRide(delivery.driverId);
  }
  markStoreDirty();
  return { module: 'deliveries', action: 'status', ok: true, delivery: toDeliverySummary(delivery), request };
}

