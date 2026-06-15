import { dispatchRide } from '../utils/dispatch.engine';
import { estimateRoute } from './eta.service';
import {
  countCompletedRidesForRider,
  getActiveSurgeMultiplier,
  getPendingReferralEvent,
  getPromoByCode,
  hasUserUsedPromo,
  makeId,
  markStoreDirty,
  pushWalletTx,
  store,
  timestamp,
  type Ride,
  type RideFareDetails,
  type RideLifecycleState,
  type RiderProfile,
  type RideRequest,
  type RideRequestResponse,
  type VehicleType
} from '../database/data.store';
import { env } from '../config/env';
import { markDriverAssigned, releaseDriverFromRide } from './drivers.service';
import { sendRealtimePushEvent } from './notifications.service';
import { sendEmail } from './email.service';
import { sendSMS } from './sms.service';
import {
  publishDispatchRequestExpired,
  publishDispatchRequestRejected,
  publishDispatchRideRequest,
  publishDriverRealtimeEarnings,
  publishRideRealtimeUpdate,
  publishRiderRatingSubmitted
} from './realtime-dispatch.service';
import { logger } from '../utils/logger';
import { notificationTemplates } from '../utils/fcm-templates';
import { getPricingForVehicleType } from '../utils/vehicle-pricing';
import { emailTemplates } from '../utils/email-templates';
import { smsTemplates } from '../utils/sms-templates';


const CURRENCY = 'USD';
const DEFAULT_SERVICE_FEE_PERCENT = 0.12;
const DEFAULT_WAIT_TIMEOUT_SECONDS = 5 * 60;
const DEFAULT_CANCELLATION_FEE_CENTS = 400;
const DEFAULT_NO_SHOW_FEE_CENTS = 500;
const RIDE_REQUEST_EXPIRY_MS = 30_000;
const RIDE_REQUEST_EXPIRY_DELAY_BUFFER_MS = 20;
const MAX_FAVORITE_LOCATIONS = 10;
const SHARED_RIDE_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const ETA_MINUTES_PER_MILE = 3.5;
// Rider-facing fallback when a precise live distance isn't available yet.
const DEFAULT_DISTANCE_AWAY_LABEL = '0.8 mi';

type SharedRideTokenRecord = {
  rideId: string;
  token: string;
  createdBy: string;
  createdAt: string;
  expiresAt: string;
};

const sharedRideTokens = new Map<string, SharedRideTokenRecord>();
const rideRequestExpiryTimers = new Map<string, ReturnType<typeof setTimeout>>();

function clearRideRequestExpiryTimer(requestId: string) {
  const timer = rideRequestExpiryTimers.get(requestId);
  if (timer) {
    clearTimeout(timer);
    rideRequestExpiryTimers.delete(requestId);
  }
}

function scheduleRideRequestExpiry(request: RideRequest) {
  clearRideRequestExpiryTimer(request.id);
  const expiresInMs = Math.max(0, new Date(request.expiresAt).getTime() - Date.now());
  const timer = setTimeout(() => {
    rideRequestExpiryTimers.delete(request.id);
    const latestRequest = store.rideRequests.get(request.id);
    if (!latestRequest) return;
    const previousStatus = latestRequest.status;
    syncRideRequestState(latestRequest);
    if (previousStatus === latestRequest.status || latestRequest.status !== 'expired') return;
    const ride = store.rides.get(latestRequest.rideId);
    latestRequest.broadcastedDrivers.forEach(driverId => {
      publishDispatchRequestExpired(driverId, {
        rideId: latestRequest.rideId,
        requestId: latestRequest.id,
        status: 'expired',
        expiresAt: latestRequest.expiresAt,
        updatedAt: latestRequest.updatedAt
      });
    });
    if (ride && !ride.driverId && ride.status === 'requested') {
      appendRideEvent(
        ride,
        'dispatch_expired',
        'Driver search expired',
        'No driver accepted your request in time. Please try requesting again.',
        'system'
      );
      publishDispatchRequestRejected(ride.riderId, {
        rideId: ride.id,
        requestId: latestRequest.id,
        reason: 'request_expired',
        status: 'SEARCHING',
        updatedAt: latestRequest.updatedAt
      });
      publishRideRealtimeUpdate(ride, 'ride_request_expired');
    }
  }, expiresInMs + RIDE_REQUEST_EXPIRY_DELAY_BUFFER_MS);
  rideRequestExpiryTimers.set(request.id, timer);
}

function normalizeRequestedVehicleType(input: unknown): VehicleType | null {
  const normalized = String(input || '').trim().toLowerCase();
  if (normalized === 'economy' || normalized === 'comfort' || normalized === 'premium' || normalized === 'xl') return normalized;
  return null;
}

function normalizeRidePaymentMethod(input: unknown): 'card' | 'apple_pay' | 'google_pay' | 'cash' {
  const normalized = String(input || '').trim().toLowerCase();
  if (normalized === 'apple_pay' || normalized === 'google_pay' || normalized === 'cash') return normalized;
  if (normalized && normalized !== 'card') {
    logger.warn('unknown ride payment method, defaulting to card', { input: normalized });
  }
  return 'card';
}

async function pushRideNotification(
  userId: string | undefined,
  category: string,
  title: string,
  body: string,
  template: string,
  data?: Record<string, string>
) {
  if (!userId) return;
  try {
    await sendRealtimePushEvent({ userId, category, title, body, template, data });
  } catch (error: any) {
    logger.warn('Ride notification push failed', { userId, category, template, error: error?.message });
  }
}

function maskPhone(phone: string | undefined) {
  if (!phone) return 'hidden';
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return 'hidden';
  return `***-***-${digits.slice(-4)}`;
}

async function sendRideConfirmationEmail(ride: Ride) {
  const rider = store.users.get(ride.riderId);
  const driverId = ride.driverId;
  const driverUser = driverId ? store.users.get(driverId) : undefined;
  const driverProfile: any = driverId ? store.drivers.get(driverId) : undefined;
  if (!rider?.email || !driverUser) return;
  const message = emailTemplates.RIDE_CONFIRMATION({
    riderName: rider.email?.split('@')[0] || 'Rider',
    driverName: driverUser.email?.split('@')[0] || 'Driver',
    driverRating: driverProfile?.rating || 5,
    carColor: driverProfile?.carColor || 'Vehicle',
    carMake: driverProfile?.carMake || '',
    carModel: driverProfile?.carModel || '',
    licensePlate: driverProfile?.licensePlate || 'N/A',
    pickupAddress: ride.pickupAddress || `${ride.pickupLat}, ${ride.pickupLng}`,
    dropoffAddress: ride.dropoffAddress || `${ride.dropoffLat}, ${ride.dropoffLng}`,
    eta: Math.max(1, Math.round(ride.minutes || 0)),
    fareEstimate: Math.round((ride.fareEstimate || 0) * 100),
    driverPhone: maskPhone(driverUser.phone),
    trackingLink: `${env.appBaseUrl || 'https://app.drive.com'}/rides/${ride.id}`
  });
  await sendEmail(rider.email, message.subject, message.html, { template: 'ride_confirmation', userId: rider.id });
}

function getRide(id: string) {
  const ride = store.rides.get(id);
  if (!ride) return null;
  return ride;
}

function getRiderId(body: any) {
  return body?.actor?.id || body?.riderId || body?.userId;
}

function getDriverId(body: any) {
  return body?.actor?.id || body?.driverId;
}

function roundToTwoDecimals(amount: number) {
  return Math.round(amount * 100) / 100;
}

function centsToAmount(amountCents = 0) {
  return roundToTwoDecimals(amountCents / 100);
}

function amountToCents(amount = 0) {
  return Math.round(roundToTwoDecimals(amount) * 100);
}

function getRideEvents(ride: Ride) {
  return Array.isArray(ride.events) ? ride.events : [];
}

function getDriverVehicle(driverId?: string) {
  if (!driverId) return null;
  const driver = store.drivers.get(driverId);
  if (driver?.primaryVehicleId) {
    const primaryVehicle = store.vehicles.get(driver.primaryVehicleId);
    if (primaryVehicle) return primaryVehicle;
  }
  return Array.from(store.vehicles.values()).find(vehicle => vehicle.driverId === driverId) || null;
}

function getDriverDisplayName(userId?: string) {
  if (!userId) return 'Driver';
  const user = store.users.get(userId);
  if (!user) return 'Driver';
  return user.email?.split('@')[0] || user.phone || 'Driver';
}

function buildAssignedDriverDetails(ride: Ride) {
  if (!ride.driverId) return null;
  const driverId = ride.driverId;
  const user = store.users.get(driverId);
  const profile: any = store.drivers.get(driverId);
  const vehicle = profile?.vehicle || getDriverVehicle(driverId);
  const make = vehicle?.make;
  const model = vehicle?.model;
  const year = Number(vehicle?.year);
  const color = vehicle?.color;
  const plateNumber = vehicle?.plateNumber || vehicle?.licensePlate;
  const type = vehicle?.type || vehicle?.vehicleType;
  const photoUrl = vehicle?.photoUrl;

  return {
    id: driverId,
    name: getDriverDisplayName(driverId),
    phone: user?.phone,
    rating: Number(profile?.rating || 5),
    profilePhotoUrl: profile?.profilePhotoUrl,
    eta: Math.max(1, Math.round(Number(ride.minutes || 0))),
    vehicle: {
      make,
      model,
      year: Number.isInteger(year) ? year : undefined,
      color,
      plateNumber,
      type,
      photoUrl
    }
  };
}

function getRideRequestByRideId(rideId: string) {
  return Array.from(store.rideRequests.values()).find(request => request.rideId === rideId) || null;
}

function ensureRiderProfile(riderId: string): RiderProfile {
  const existing = store.riders.get(riderId);
  if (existing) return existing;
  const profile = {
    userId: riderId,
    favoriteLocations: [],
    savedPlaces: [],
    rating: 5,
    reviewCount: 0
  };
  store.riders.set(riderId, profile);
  markStoreDirty();
  return profile;
}

function syncRideRequestState(request: RideRequest, nextStatus?: RideRequest['status']) {
  const now = timestamp();
  if (nextStatus) {
    request.status = nextStatus;
    request.updatedAt = now;
    return request;
  }
  if (request.status === 'broadcasting' && new Date(request.expiresAt).getTime() <= Date.now()) {
    request.status = 'expired';
    request.updatedAt = now;
    request.responses = request.responses.map(response => response.status === 'broadcasted'
      ? { ...response, status: 'expired', respondedAt: now }
      : response);
    markStoreDirty();
  }
  return request;
}

function upsertRideRequestResponse(request: RideRequest, driverId: string, status: RideRequestResponse['status']) {
  const respondedAt = timestamp();
  const nextResponse = { driverId, status, respondedAt };
  const index = request.responses.findIndex(response => response.driverId === driverId);
  if (index >= 0) request.responses[index] = nextResponse;
  else request.responses.push(nextResponse);
  request.updatedAt = respondedAt;
  markStoreDirty();
  return nextResponse;
}

function appendRideEvent(
  ride: Ride,
  type: string,
  title: string,
  message: string,
  actorRole?: string,
  actorId?: string,
  createdAt = timestamp()
) {
  ride.events = [...getRideEvents(ride), { id: makeId('evt'), type, title, message, actorRole, actorId, createdAt }];
  ride.updatedAt = createdAt;
  markStoreDirty();
  return ride.events[ride.events.length - 1];
}

function buildFareDetails(
  miles: number,
  minutes: number,
  options?: {
    surgeMultiplier?: number;
    discountCents?: number;
    taxesCents?: number;
    tollsCents?: number;
    tipsCents?: number;
    serviceFeePercent?: number;
    vehicleType?: VehicleType;
  }
) {
  const requestedSurgeMultiplier = Number(options?.surgeMultiplier || 1);
  const surgeMultiplier = requestedSurgeMultiplier >= 1 ? requestedSurgeMultiplier : 1;
  const serviceFeePercent = Number(options?.serviceFeePercent ?? DEFAULT_SERVICE_FEE_PERCENT);
  const pricing = getPricingForVehicleType(options?.vehicleType);
  const baseFare = pricing.minFare;
  const distanceFare = roundToTwoDecimals(miles * pricing.distanceRate);
  const timeFare = roundToTwoDecimals(minutes * pricing.timeRate);
  const meterFare = roundToTwoDecimals(Math.max(baseFare, distanceFare + timeFare));
  const surgeFare = roundToTwoDecimals(meterFare * surgeMultiplier * pricing.baseMultiplier);
  const serviceFee = roundToTwoDecimals(surgeFare * serviceFeePercent);
  const taxes = centsToAmount(Number(options?.taxesCents || 0));
  const tolls = centsToAmount(Number(options?.tollsCents || 0));
  const discounts = centsToAmount(Number(options?.discountCents || 0));
  const tips = centsToAmount(Number(options?.tipsCents || 0));
  const subtotal = roundToTwoDecimals(surgeFare + serviceFee);
  const total = roundToTwoDecimals(Math.max(0, subtotal + taxes + tolls - discounts + tips));
  const driverEarnings = roundToTwoDecimals(Math.max(0, surgeFare + tips - serviceFee));
  const low = roundToTwoDecimals(Math.max(baseFare, total * 0.9));
  const high = roundToTwoDecimals(total * 1.15);
  const fareDetails: RideFareDetails = {
    currency: CURRENCY,
    baseFare,
    distanceFare,
    timeFare,
    meterFare,
    surgeMultiplier,
    surgeFare,
    serviceFeePercent,
    serviceFee,
    taxes,
    tolls,
    discounts,
    tips,
    subtotal,
    total,
    driverEarnings
  };
  return {
    ...fareDetails,
    fareEstimate: total,
    fareEstimateRange: { low, high }
  };
}

function getRideLifecycleState(ride: Ride): RideLifecycleState {
  if (ride.lifecycleState) return ride.lifecycleState;
  if (ride.status === 'requested') return 'requested';
  if (ride.status === 'accepted') return ride.arrivedAt ? 'waiting' : 'arriving';
  if (ride.status === 'arrived_at_pickup') return 'waiting';
  if (ride.status === 'started') return 'in_progress';
  if (ride.status === 'completed') return ride.rating && ride.passengerRating ? 'rated' : 'completed';
  if (ride.cancellationReason === 'rider_no_show') return 'no_show';
  return 'cancelled';
}

function setRideLifecycleState(ride: Ride, lifecycleState: RideLifecycleState) {
  ride.lifecycleState = lifecycleState;
  ride.updatedAt = timestamp();
  markStoreDirty();
}

function getWaitDurationSeconds(ride: Ride, now = Date.now()) {
  if (!ride.waitingSince) return 0;
  const waitingSinceMs = new Date(ride.waitingSince).getTime();
  if (!Number.isFinite(waitingSinceMs)) return 0;
  return Math.max(0, Math.floor((now - waitingSinceMs) / 1000));
}

function syncRatedLifecycleState(ride: Ride) {
  if (ride.status !== 'completed') return;
  ride.lifecycleState = ride.rating && ride.passengerRating ? 'rated' : 'completed';
  ride.updatedAt = timestamp();
  markStoreDirty();
}

function setCancellationDetails(
  ride: Ride,
  actorRole: 'rider' | 'driver' | 'system',
  reason: string,
  canceledAt: string,
  cancellationFeeCents = 0
) {
  ride.status = 'canceled';
  ride.lifecycleState = reason === 'rider_no_show' ? 'no_show' : 'cancelled';
  ride.canceledAt = canceledAt;
  ride.cancellationReason = reason;
  ride.cancellationActorRole = actorRole;
  ride.cancellationFeeCents = cancellationFeeCents;
  ride.paymentStatus = cancellationFeeCents > 0 ? 'settled_internal' : 'not_charged';
  ride.updatedAt = canceledAt;
  markStoreDirty();
}

function getRideAvailableActions(ride: Ride) {
  return {
    canCancel: ride.status === 'requested' || ride.status === 'accepted' || ride.status === 'arrived_at_pickup',
    canRate: ride.status === 'completed' && typeof ride.rating !== 'number',
    canViewReceipt: ride.status === 'completed' || ride.status === 'canceled',
    canTrackDriver: ride.status === 'accepted' || ride.status === 'arrived_at_pickup' || ride.status === 'started',
    canStartTrip: ride.status === 'arrived_at_pickup',
    canEndTrip: ride.status === 'started',
    canReportNoShow: ride.status === 'arrived_at_pickup',
    waitDurationSeconds: getWaitDurationSeconds(ride)
  };
}

function toRiderRideSummary(ride: Ride) {
  const events = getRideEvents(ride);
  const riderPhone = store.users.get(ride.riderId)?.phone;
  const driverPhone = ride.driverId ? store.users.get(ride.driverId)?.phone : undefined;
  const driver = buildAssignedDriverDetails(ride);
  const driverProfile = ride.driverId ? store.drivers.get(ride.driverId) : undefined;
  const driverLat = Number(driverProfile?.lat);
  const driverLng = Number(driverProfile?.lng);
  const pickupLat = Number(ride.pickupLat);
  const pickupLng = Number(ride.pickupLng);
  const hasDriverLocation = Number.isFinite(driverLat) && Number.isFinite(driverLng);
  const hasPickupLocation = Number.isFinite(pickupLat) && Number.isFinite(pickupLng);
  const distanceMiles = hasDriverLocation && hasPickupLocation
    ? estimateRouteDistanceMiles(driverLat, driverLng, pickupLat, pickupLng)
    : undefined;
  const etaMinutes = Number.isFinite(distanceMiles)
    ? Math.max(1, Math.round((distanceMiles as number) * ETA_MINUTES_PER_MILE))
    : Math.max(1, Math.round(Number(ride.minutes || 0)));
  return {
    ...ride,
    riderPhone,
    driverPhone,
    driver,
    driverName: ride.driverId ? getDriverDisplayName(ride.driverId) : undefined,
    distanceAway: Number.isFinite(distanceMiles) ? Number((distanceMiles as number).toFixed(1)) : undefined,
    etaMinutes,
    location: hasDriverLocation ? { lat: driverLat, lng: driverLng } : undefined,
    driverLocation: hasDriverLocation ? { lat: driverLat, lng: driverLng, updatedAt: driverProfile?.lastLocationUpdatedAt || ride.updatedAt } : undefined,
    events,
    lifecycleState: getRideLifecycleState(ride),
    latestEvent: events[events.length - 1] || null,
    availableActions: getRideAvailableActions(ride)
  };
}

function estimateRouteDistanceMiles(lat1: number, lng1: number, lat2: number, lng2: number) {
  const toRad = (value: number) => value * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const km = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return km * 0.621371;
}

function mapRideStatusForDispatch(status?: string) {
  const normalized = String(status || '').trim().toLowerCase();
  if (normalized === 'requested') return 'SEARCHING';
  if (normalized === 'accepted') return 'ASSIGNED';
  if (normalized === 'arrived_at_pickup') return 'ARRIVING';
  if (normalized === 'started') return 'IN_TRIP';
  if (normalized === 'completed') return 'COMPLETED';
  if (normalized === 'canceled' || normalized === 'cancelled') return 'CANCELED';
  return normalized.toUpperCase() || 'SEARCHING';
}

function toDriverRideRequestSummary(ride: Ride) {
  const riderUser = store.users.get(ride.riderId);
  const riderProfile = store.riders.get(ride.riderId);
  return {
    rideId: ride.id,
    riderId: ride.riderId,
    riderName: riderUser?.email?.split('@')[0] || 'Rider',
    riderPhone: riderUser?.phone || '',
    riderRating: Number(riderProfile?.rating || 5),
    pickupAddress: ride.pickupAddress || '',
    pickupLat: ride.pickupLat,
    pickupLng: ride.pickupLng,
    destinationAddress: ride.dropoffAddress || '',
    destinationLat: ride.dropoffLat,
    destinationLng: ride.dropoffLng,
    rideType: String(ride.vehicleType || 'economy').toUpperCase(),
    fareEstimate: ride.fareEstimate,
    distance: ride.miles,
    duration: ride.minutes,
    paymentMethod: ride.paymentMethod || 'card',
    status: mapRideStatusForDispatch(ride.status),
    createdAt: ride.createdAt
  };
}

function toAssignedRideDispatchSummary(ride: Ride) {
  const riderSummary = toDriverRideRequestSummary(ride);
  const fallbackDriver = {
    driverId: ride.driverId || 'driver_demo_1',
    name: 'John Smith',
    rating: 4.9,
    photoUrl: '/assets/drivers/demo-driver.png',
    phone: '555-555-5555'
  };
  const fallbackVehicle = {
    photoUrl: '/assets/vehicles/economy-car.png',
    make: 'Toyota',
    model: 'Camry',
    year: 2022,
    color: 'White',
    plate: 'FLP-123'
  };
  const summary = toRiderRideSummary(ride);
  const driverProfile = ride.driverId ? store.drivers.get(ride.driverId) : undefined;
  const sourceDriver = (summary?.driver || {}) as Partial<{
    name: string;
    rating: number;
    profilePhotoUrl: string;
    photoUrl: string;
    phone: string;
    vehicle: {
      make?: string;
      model?: string;
      year?: number | string;
      color?: string;
      plateNumber?: string;
      plate?: string;
      photoUrl?: string;
    };
  }>;
  const sourceVehicle = (sourceDriver.vehicle || driverProfile?.vehicle || {}) as Partial<{
    make: string;
    model: string;
    year: number | string;
    color: string;
    plateNumber: string;
    plate: string;
    photoUrl: string;
  }>;
  const location = summary?.location || summary?.driverLocation || {
    lat: ride.pickupLat,
    lng: ride.pickupLng
  };
  return {
    rideId: ride.id,
    status: mapRideStatusForDispatch(ride.status),
    driverId: ride.driverId || fallbackDriver.driverId,
    driver: {
      driverId: ride.driverId || fallbackDriver.driverId,
      name: sourceDriver.name || fallbackDriver.name,
      rating: Number(sourceDriver.rating || fallbackDriver.rating),
      photoUrl: sourceDriver.profilePhotoUrl || sourceDriver.photoUrl || fallbackDriver.photoUrl,
      phone: sourceDriver.phone || fallbackDriver.phone
    },
    vehicle: {
      make: sourceVehicle.make || fallbackVehicle.make,
      model: sourceVehicle.model || fallbackVehicle.model,
      year: Number(sourceVehicle.year || fallbackVehicle.year),
      color: sourceVehicle.color || fallbackVehicle.color,
      plate: sourceVehicle.plateNumber || sourceVehicle.plate || fallbackVehicle.plate,
      photoUrl: sourceVehicle.photoUrl || fallbackVehicle.photoUrl
    },
    location: {
      lat: Number(location?.lat ?? ride.pickupLat ?? 0),
      lng: Number(location?.lng ?? ride.pickupLng ?? 0)
    },
    etaMinutes: Number(summary?.etaMinutes || ride.minutes || 4),
    distanceAway: summary?.distanceAway != null ? `${Number(summary.distanceAway).toFixed(1)} mi` : DEFAULT_DISTANCE_AWAY_LABEL,
    riderId: riderSummary.riderId,
    pickupAddress: riderSummary.pickupAddress,
    destinationAddress: riderSummary.destinationAddress
  };
}

function getRideReceipt(ride: Ride) {
  if (ride.status !== 'completed' && ride.status !== 'canceled') return null;
  const fare = ride.fareDetails || buildFareDetails(ride.miles, ride.minutes, {
    surgeMultiplier: ride.surgeMultiplier,
    discountCents: ride.discountCents
  });
  const surgeMultiplier = fare.surgeMultiplier || ride.surgeMultiplier || 1;
  const discountCents = amountToCents(fare.discounts || 0);
  const totalCents = ride.status === 'completed'
    ? amountToCents(fare.total)
    : Number(ride.cancellationFeeCents || ride.noShowFeeCents || 0);
  const payment = Array.from(store.payments.values()).find(entry => entry.rideId === ride.id);
  const walletEntries = store.walletTx.filter(tx => tx.reason.startsWith(`ride:${ride.id}:`));
  return {
    receiptType: ride.status === 'completed' ? 'ride_receipt' : 'ride_cancellation',
    invoiceNumber: `INV-${ride.id.toUpperCase()}`,
    rideId: ride.id,
    riderId: ride.riderId,
    driverId: ride.driverId,
    status: ride.status,
    currency: fare.currency,
    issuedAt: ride.updatedAt,
    fareBreakdown: fare,
    surgeMultiplier,
    discountCents,
    totalCents,
    paymentStatus: payment?.status || ride.paymentStatus || (ride.status === 'completed' ? 'settled_internal' : 'not_charged'),
    walletEntries: walletEntries.map(entry => ({
      id: entry.id,
      kind: entry.kind,
      amountCents: entry.amountCents,
      reason: entry.reason,
      createdAt: entry.createdAt
    })),
    cancellationReason: ride.cancellationReason,
    cancellationFeeCents: ride.cancellationFeeCents || ride.noShowFeeCents || 0,
    lifecycleState: getRideLifecycleState(ride)
  };
}

function updateDriverRating(driverId?: string) {
  if (!driverId) return null;
  const profile = store.drivers.get(driverId);
  if (!profile) return null;
  const ratings = Array.from(store.rides.values())
    .filter(ride => ride.driverId === driverId && typeof ride.rating === 'number')
    .map(ride => Number(ride.rating));
  if (!ratings.length) return profile.rating;
  profile.rating = roundToTwoDecimals(ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length);
  markStoreDirty();
  return profile.rating;
}

function canAccessRide(authenticatedUser: any, ride: Ride) {
  if (!authenticatedUser?.id || !authenticatedUser?.role) return false;
  return authenticatedUser.role === 'admin' || ride.riderId === authenticatedUser.id || ride.driverId === authenticatedUser.id;
}

function pruneExpiredSharedRideTokens() {
  const nowMs = Date.now();
  for (const [rideId, record] of sharedRideTokens.entries()) {
    if (new Date(record.expiresAt).getTime() <= nowMs) {
      sharedRideTokens.delete(rideId);
    }
  }
}

function toSharedRideView(ride: Ride) {
  const driver = buildAssignedDriverDetails(ride);
  const vehicle = driver?.vehicle as {
    make?: string;
    model?: string;
    plateNumber?: string;
  } | undefined;
  const vehicleLabel = [vehicle?.make, vehicle?.model].filter(Boolean).join(' ').trim();

  return {
    id: ride.id,
    status: ride.status,
    pickupAddress: ride.pickupAddress || '--',
    dropoffAddress: ride.dropoffAddress || '--',
    pickupLabel: ride.pickupAddress || '--',
    destinationLabel: ride.dropoffAddress || '--',
    etaMinutes: Math.max(0, Math.round(Number(ride.minutes || 0))),
    driverName: driver?.name || undefined,
    driver: driver ? {
      name: driver.name,
      rating: driver.rating,
      vehicle: {
        make: vehicle?.make,
        model: vehicle?.model,
        plateNumber: vehicle?.plateNumber,
        label: vehicleLabel || undefined
      }
    } : undefined,
    updatedAt: ride.updatedAt
  };
}

export async function estimate(body: any, _params?: any, _query?: any) {
  const miles = Number(body?.miles || body?.distanceMiles || 0);
  const minutes = Number(body?.minutes || body?.etaMinutes || 0);
  const destinationLat = body?.dropoffLat ?? body?.destinationLat;
  const destinationLng = body?.dropoffLng ?? body?.destinationLng;
  const route = await estimateRoute({
    pickupLat: body?.pickupLat,
    pickupLng: body?.pickupLng,
    dropoffLat: destinationLat,
    dropoffLng: destinationLng,
    distanceMiles: miles || undefined,
    etaMinutes: minutes || undefined
  });
  const surgeMultiplier = getActiveSurgeMultiplier();
  const requestedVehicleType = normalizeRequestedVehicleType(body?.vehicleType ?? body?.rideType ?? body?.vehiclePreference) || 'economy';
  const fare = buildFareDetails(route.distanceMiles, route.etaMinutes, {
    surgeMultiplier,
    vehicleType: requestedVehicleType
  });
  const fareEstimate = fare.fareEstimate;
  const fareEstimateRange = fare.fareEstimateRange;
  return {
    module: 'rides',
    action: 'estimate',
    ok: true,
    route,
    currency: fare.currency,
    baseFare: fare.baseFare,
    surgeMultiplier,
    fareEstimate,
    fareEstimateRange,
    fareBreakdown: { ...fare, fareEstimate, fareEstimateRange },
    requestPreview: {
      pickupLat: body?.pickupLat,
      pickupLng: body?.pickupLng,
      dropoffLat: body?.dropoffLat,
      dropoffLng: body?.dropoffLng,
      vehicleType: requestedVehicleType
    }
  };
}

export async function request(body: any, _params?: any, _query?: any) {
  const riderId = getRiderId(body);
  if (!riderId) return { module: 'rides', action: 'request', error: 'riderId is required' };
  const riderProfile = ensureRiderProfile(riderId);
  const pickupLat = Number(body?.pickupLat);
  const pickupLng = Number(body?.pickupLng);
  const hasValidPickupCoords = Number.isFinite(pickupLat) && Number.isFinite(pickupLng);

  const estimated = await estimate(body);
  const fareCents = Math.round(estimated.fareEstimate * 100);

  let promoId: string | undefined;
  let discountCents = 0;
  const promoCode: string | undefined = body?.promoCode;
  if (promoCode) {
    const promo = getPromoByCode(promoCode);
    if (!promo) return { module: 'rides', action: 'request', error: 'promo code not found' };
    if (promo.expiresAt && new Date(promo.expiresAt) < new Date()) {
      return { module: 'rides', action: 'request', error: 'promo code has expired' };
    }
    if (promo.maxUsages != null && promo.usageCount >= promo.maxUsages) {
      return { module: 'rides', action: 'request', error: 'promo code has reached its usage limit' };
    }
    if (promo.minFareCents != null && fareCents < promo.minFareCents) {
      return { module: 'rides', action: 'request', error: 'fare does not meet promo minimum' };
    }
    if (hasUserUsedPromo(riderId, promo.id)) {
      return { module: 'rides', action: 'request', error: 'promo code already used by this rider' };
    }
    discountCents = promo.discountType === 'flat'
      ? Math.min(promo.discountValue, fareCents)
      : Math.round(fareCents * promo.discountValue / 100);
    promoId = promo.id;
    promo.usageCount += 1;
    markStoreDirty();
  }

  const now = timestamp();
  const requestedVehicleType = normalizeRequestedVehicleType(body?.vehicleType ?? body?.rideType ?? body?.vehiclePreference);
  const paymentMethod = normalizeRidePaymentMethod(body?.paymentMethod);
  const ride: Ride = {
    id: makeId('ride'),
    riderId,
    pickupLat: body?.pickupLat,
    pickupLng: body?.pickupLng,
    pickupAddress: typeof body?.pickupAddress === 'string' ? body.pickupAddress.trim() : undefined,
    dropoffLat: body?.dropoffLat ?? body?.destinationLat,
    dropoffLng: body?.dropoffLng ?? body?.destinationLng,
    dropoffAddress: typeof body?.dropoffAddress === 'string'
      ? body.dropoffAddress.trim()
      : (typeof body?.destinationAddress === 'string' ? body.destinationAddress.trim() : undefined),
    miles: estimated.route.distanceMiles,
    minutes: estimated.route.etaMinutes,
    fareEstimate: estimated.fareEstimate,
    vehicleType: requestedVehicleType || 'economy',
    surgeMultiplier: estimated.surgeMultiplier !== 1.0 ? estimated.surgeMultiplier : undefined,
    promoId,
    discountCents: discountCents > 0 ? discountCents : undefined,
    status: 'requested',
    lifecycleState: 'requested',
    paymentMethod,
    paymentStatus: paymentMethod === 'cash' ? 'authorized' : 'pending',
    events: [
      {
        id: makeId('evt'),
        type: 'ride_requested',
        title: 'Ride requested',
        message: 'Your ride request has been created and is waiting for dispatch.',
        actorId: riderId,
        actorRole: 'rider',
        createdAt: now
      }
    ],
    createdAt: now,
    updatedAt: now
  };
  store.rides.set(ride.id, ride);
  riderProfile.currentTripId = ride.id;
  riderProfile.lat = hasValidPickupCoords ? pickupLat : riderProfile.lat;
  riderProfile.lng = hasValidPickupCoords ? pickupLng : riderProfile.lng;
  riderProfile.lastLocationUpdatedAt = hasValidPickupCoords ? now : riderProfile.lastLocationUpdatedAt;
  if (typeof body?.vehiclePreference === 'string' && body.vehiclePreference.trim()) riderProfile.vehiclePreference = body.vehiclePreference.trim();
  if (typeof body?.routePreference === 'string' && body.routePreference.trim()) riderProfile.routePreference = body.routePreference.trim();
  if (body?.favoriteLocationLabel && hasValidPickupCoords) {
    const label = String(body.favoriteLocationLabel).trim();
    if (label && !riderProfile.favoriteLocations.some(location => location.label === label && location.lat === pickupLat && location.lng === pickupLng)) {
      riderProfile.favoriteLocations = [{ label, lat: pickupLat, lng: pickupLng }, ...riderProfile.favoriteLocations].slice(0, MAX_FAVORITE_LOCATIONS);
    }
  }
  const dispatch = await dispatchRide({
    id: ride.id,
    pickupLat: ride.pickupLat,
    pickupLng: ride.pickupLng,
    vehicleType: ride.vehicleType
  });
  const expiresAt = new Date(Date.now() + RIDE_REQUEST_EXPIRY_MS).toISOString();
  const rideRequest: RideRequest = {
    id: makeId('request'),
    rideId: ride.id,
    riderId,
    pickupLat: ride.pickupLat,
    pickupLng: ride.pickupLng,
    dropoffLat: ride.dropoffLat,
    dropoffLng: ride.dropoffLng,
    fareEstimate: ride.fareEstimate,
    broadcastedDrivers: dispatch.candidates.map(candidate => candidate.driverId),
    responses: dispatch.candidates.map(candidate => ({
      driverId: candidate.driverId,
      status: 'broadcasted' as const,
      respondedAt: now
    })),
    expiresAt,
    status: 'broadcasting',
    createdAt: now,
    updatedAt: now
  };
  store.rideRequests.set(rideRequest.id, rideRequest);
  const riderDisplayName = 'Rider';
  for (const candidate of dispatch.candidates) {
    const requestTemplate = notificationTemplates.RIDE_REQUEST({
      rideId: ride.id,
      pickupAddress: body?.pickupAddress,
      pickupLat: ride.pickupLat,
      pickupLng: ride.pickupLng,
      fareEstimate: amountToCents(ride.fareEstimate)
    });
    await pushRideNotification(
      candidate.driverId,
      'new_rides',
      requestTemplate.title,
      requestTemplate.body,
      'ride_request',
      requestTemplate.data
    );
    publishDispatchRideRequest(candidate.driverId, {
      requestId: rideRequest.id,
      rideId: ride.id,
      expiresAt: rideRequest.expiresAt,
      ride: {
        id: ride.id,
        rideId: ride.id,
        riderId: ride.riderId,
        riderName: riderDisplayName,
        passengerName: riderDisplayName,
        pickupAddress: ride.pickupAddress || '',
        destinationAddress: ride.dropoffAddress || '',
        pickupLat: ride.pickupLat,
        pickupLng: ride.pickupLng,
        dropoffLat: ride.dropoffLat,
        dropoffLng: ride.dropoffLng,
        fareEstimate: ride.fareEstimate,
        distance: ride.miles,
        minutes: ride.minutes,
        status: 'requested',
        createdAt: ride.createdAt
      },
      updatedAt: now
    });
    const candidateUser = store.users.get(candidate.driverId);
    if (candidateUser?.phone) {
      try {
        await sendSMS(
          candidateUser.phone,
          smsTemplates.RIDE_REQUEST({
            pickupStreet: `${ride.pickupLat}, ${ride.pickupLng}`,
            fareEstimate: amountToCents(ride.fareEstimate)
          }),
          { template: 'ride_request_alert', userId: candidateUser.id }
        );
      } catch (error: any) {
        logger.warn('Ride request SMS failed', { rideId: ride.id, driverId: candidate.driverId, error: error?.message });
      }
    }
  }
  if (dispatch.selected?.driverId && dispatch.candidates.length === 1) {
    const assigned = markDriverAssigned(dispatch.selected.driverId);
    if (assigned.ok) {
      ride.driverId = assigned.profile.userId;
      assigned.profile.currentTripId = ride.id;
      ride.status = 'accepted';
      ride.assignedAt = timestamp();
      ride.lifecycleState = 'arriving';
      rideRequest.acceptedDriverId = assigned.profile.userId;
      rideRequest.status = 'accepted';
      upsertRideRequestResponse(rideRequest, assigned.profile.userId, 'accepted');
      appendRideEvent(
        ride,
        'driver_assigned',
        'Driver assigned',
        'A driver has been assigned and is on the way to pickup.',
        'system',
        assigned.profile.userId
      );
      await pushRideNotification(
        assigned.profile.userId,
        'new_rides',
        'New ride assigned',
        'A rider has been matched to you. Open the app for trip details.',
        'new_ride_assigned'
      );
      await pushRideNotification(
        ride.riderId,
        'trip_updates',
        'Driver assigned',
        'A driver is on the way to your pickup location.',
        'trip_update_driver_assigned'
      );
      await sendRideConfirmationEmail(ride);
    }
  }
  if (rideRequest.status === 'broadcasting') {
    scheduleRideRequestExpiry(rideRequest);
  } else {
    clearRideRequestExpiryTimer(rideRequest.id);
  }
  publishRideRealtimeUpdate(ride, 'ride_requested');
  const riderRide = toRiderRideSummary(ride);
  const dispatchStatus = mapRideStatusForDispatch(ride.status);
  return {
    module: 'rides',
    action: 'request',
    ok: true,
    ride: riderRide,
    rideId: ride.id,
    status: dispatchStatus,
    riderId: ride.riderId,
    pickupAddress: ride.pickupAddress || '',
    pickupLat: ride.pickupLat,
    pickupLng: ride.pickupLng,
    destinationAddress: ride.dropoffAddress || '',
    destinationLat: ride.dropoffLat,
    destinationLng: ride.dropoffLng,
    rideType: String(ride.vehicleType || 'economy').toUpperCase(),
    fareEstimate: ride.fareEstimate,
    distance: ride.miles,
    duration: ride.minutes,
    paymentMethod: ride.paymentMethod || 'card',
    createdAt: ride.createdAt,
    request: syncRideRequestState(rideRequest),
    dispatch,
    discountCents,
    availableActions: getRideAvailableActions(ride)
  };
}

export async function getDriverRideRequests(body: any, _params?: any, query?: any) {
  const actor = body?.actor;
  if (!actor?.id || actor?.role !== 'driver') {
    return { module: 'rides', action: 'driver-ride-requests', error: 'forbidden' };
  }
  const limit = Math.max(1, Math.min(100, Number(query?.limit || body?.limit || 20)));
  const requestedStatus = mapRideStatusForDispatch(query?.status || body?.status || 'SEARCHING');
  const rides = Array.from(store.rides.values())
    .filter(ride => mapRideStatusForDispatch(ride.status) === requestedStatus)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit)
    .map(toDriverRideRequestSummary);
  return { module: 'rides', action: 'driver-ride-requests', ok: true, rides };
}

export async function history(body: any, _params?: any, _query?: any) {
  const actor = body?.actor;
  const riderId = actor?.role === 'rider' ? actor?.id : getRiderId(body);
  const limit = Math.max(1, Math.min(100, Number(body?.limit || 20)));
  const status = body?.status;
  const fromDate = body?.from ? new Date(body.from) : null;
  const toDate = body?.to ? new Date(body.to) : null;
  const validFromDate = fromDate && !Number.isNaN(fromDate.getTime()) ? fromDate : null;
  const validToDate = toDate && !Number.isNaN(toDate.getTime()) ? toDate : null;
  const rides = Array.from(store.rides.values())
    .filter(ride => {
      if (actor?.role === 'admin') return true;
      if (actor?.role === 'driver') return ride.driverId === actor.id;
      return ride.riderId === riderId;
    })
    .filter(ride => !status || ride.status === status)
    .filter(ride => !validFromDate || new Date(ride.updatedAt) >= validFromDate)
    .filter(ride => !validToDate || new Date(ride.updatedAt) <= validToDate)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return {
    module: 'rides',
    action: 'history',
    ok: true,
    rides: rides.slice(0, limit).map(toRiderRideSummary),
    summary: {
      total: rides.length,
      active: rides.filter(ride => ['requested', 'accepted', 'arrived_at_pickup', 'started'].includes(ride.status)).length,
      completed: rides.filter(ride => ride.status === 'completed').length,
      canceled: rides.filter(ride => ride.status === 'canceled').length
    }
  };
}

export async function detail(body: any, params?: any, _query?: any) {
  const rideId = params?.rideId || body?.rideId;
  const ride = getRide(rideId);
  if (!ride) return { module: 'rides', action: 'detail', error: 'ride not found' };
  if (!canAccessRide(body?.actor, ride)) return { module: 'rides', action: 'detail', error: 'forbidden' };
  const request = getRideRequestByRideId(ride.id);
  if (request) syncRideRequestState(request);
  return {
    module: 'rides',
    action: 'detail',
    ok: true,
    ride: toRiderRideSummary(ride),
    request,
    receipt: getRideReceipt(ride),
    notifications: getRideEvents(ride)
  };
}

export async function assignedDriver(body: any, params?: any, _query?: any) {
  const rideId = params?.rideId || body?.rideId;
  const ride = getRide(rideId);
  if (!ride) return { module: 'rides', action: 'assigned-driver', error: 'ride not found' };
  if (!canAccessRide(body?.actor, ride)) return { module: 'rides', action: 'assigned-driver', error: 'forbidden' };
  if (!ride.driverId) return { module: 'rides', action: 'assigned-driver', error: 'driver not assigned' };

  const driver = buildAssignedDriverDetails(ride);
  if (!driver) return { module: 'rides', action: 'assigned-driver', error: 'driver not found' };
  return { module: 'rides', action: 'assigned-driver', ok: true, driver };
}

export async function createShareLink(body: any, params?: any, _query?: any) {
  const rideId = params?.rideId || body?.rideId;
  if (!rideId) return { module: 'rides', action: 'share-create', error: 'rideId is required' };

  const ride = getRide(rideId);
  if (!ride) return { module: 'rides', action: 'share-create', error: 'ride not found' };
  if (!canAccessRide(body?.actor, ride)) return { module: 'rides', action: 'share-create', error: 'forbidden' };
  if (ride.status === 'completed' || ride.status === 'canceled') {
    return { module: 'rides', action: 'share-create', error: 'ride cannot be shared in its current state' };
  }

  pruneExpiredSharedRideTokens();
  const token = makeId('share');
  const now = timestamp();
  const expiresAt = new Date(Date.now() + SHARED_RIDE_TOKEN_TTL_MS).toISOString();
  sharedRideTokens.set(ride.id, {
    rideId: ride.id,
    token,
    createdBy: String(body?.actor?.id || ''),
    createdAt: now,
    expiresAt
  });

  const baseUrl = env.appBaseUrl || 'http://localhost:3000';
  const shareLink = `${baseUrl}/shared-trip.html?rideId=${encodeURIComponent(ride.id)}&token=${encodeURIComponent(token)}`;
  return { module: 'rides', action: 'share-create', ok: true, rideId: ride.id, token, expiresAt, shareLink };
}

export async function sharedRide(_body: any, params?: any, query?: any) {
  const rideId = params?.rideId;
  if (!rideId) return { module: 'rides', action: 'share-read', error: 'rideId is required' };

  const token = String(query?.token || '').trim();
  if (!token) return { module: 'rides', action: 'share-read', error: 'token is required' };

  pruneExpiredSharedRideTokens();
  const tokenRecord = sharedRideTokens.get(rideId);
  if (!tokenRecord || tokenRecord.token !== token) {
    return { module: 'rides', action: 'share-read', error: 'invalid token' };
  }

  const ride = getRide(rideId);
  if (!ride) return { module: 'rides', action: 'share-read', error: 'invalid token' };
  if (ride.status === 'completed' || ride.status === 'canceled') {
    sharedRideTokens.delete(ride.id);
    return { module: 'rides', action: 'share-read', error: 'share link expired' };
  }

  return { module: 'rides', action: 'share-read', ok: true, ride: toSharedRideView(ride), expiresAt: tokenRecord.expiresAt };
}

export async function receipt(body: any, _params?: any, _query?: any) {
  const riderId = getRiderId(body);
  const ride = getRide(body?.rideId);
  if (!ride) return { module: 'rides', action: 'receipt', error: 'ride not found' };
  if (!riderId || ride.riderId !== riderId) return { module: 'rides', action: 'receipt', error: 'only rider can view receipt' };
  const rideReceipt = getRideReceipt(ride);
  if (!rideReceipt) return { module: 'rides', action: 'receipt', error: 'receipt unavailable until the ride is completed or canceled' };
  return { module: 'rides', action: 'receipt', ok: true, receipt: rideReceipt, ride: toRiderRideSummary(ride) };
}

export async function notifications(body: any, _params?: any, _query?: any) {
  const riderId = getRiderId(body);
  if (!riderId) return { module: 'rides', action: 'notifications', error: 'riderId is required' };
  const limit = Math.max(1, Math.min(100, Number(body?.limit || 20)));
  const rideNotifications = Array.from(store.rides.values())
    .filter(ride => ride.riderId === riderId)
    .filter(ride => !body?.rideId || ride.id === body.rideId)
    .flatMap(ride =>
      getRideEvents(ride).map(event => ({
        ...event,
        rideId: ride.id,
        rideStatus: ride.status
      }))
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return {
    module: 'rides',
    action: 'notifications',
    ok: true,
    notifications: rideNotifications.slice(0, limit),
    total: rideNotifications.length
  };
}

export async function accept(body: any, params?: any, _query?: any) {
  const rideId = params?.rideId || body?.rideId;
  const ride = getRide(rideId);
  if (!ride) return { module: 'rides', action: 'accept', error: 'ride not found' };
  const request = getRideRequestByRideId(ride.id);
  if (request) syncRideRequestState(request);
  if (request?.status === 'expired') {
    clearRideRequestExpiryTimer(request.id);
    return { module: 'rides', action: 'accept', error: 'ride request expired' };
  }
  if (ride.status !== 'requested' && ride.status !== 'accepted') {
    return { module: 'rides', action: 'accept', error: `ride cannot be accepted: current status is ${ride.status}` };
  }
  const driverId = getDriverId(body);
  if (!driverId) return { module: 'rides', action: 'accept', error: 'driverId is required' };
  if (request && request.broadcastedDrivers.length === 0) {
    return { module: 'rides', action: 'accept', error: 'ride request has no broadcasted drivers' };
  }
  if (request && request.broadcastedDrivers.length && !request.broadcastedDrivers.includes(driverId)) {
    return { module: 'rides', action: 'accept', error: 'driver was not included in this request broadcast' };
  }
  if (ride.status === 'accepted' && ride.driverId === driverId) {
    if (request) {
      syncRideRequestState(request, 'accepted');
      clearRideRequestExpiryTimer(request.id);
    }
    return {
      module: 'rides',
      action: 'accept',
      ok: true,
      ride: toRiderRideSummary(ride),
      request,
      assignment: toAssignedRideDispatchSummary(ride)
    };
  }
  if (ride.status === 'accepted' && ride.driverId !== driverId) {
    if (request) {
      upsertRideRequestResponse(request, driverId, 'ignored');
      clearRideRequestExpiryTimer(request.id);
    }
    return { module: 'rides', action: 'accept', error: 'ride is already accepted by another driver' };
  }
  const assigned = markDriverAssigned(driverId);
  if (!assigned.ok) return { module: 'rides', action: 'accept', error: assigned.error };
  ride.driverId = driverId;
  ride.status = 'accepted';
  ride.assignedAt = timestamp();
  ride.lifecycleState = 'arriving';
  assigned.profile.currentTripId = ride.id;
  if (request) {
    request.acceptedDriverId = driverId;
    syncRideRequestState(request, 'accepted');
    upsertRideRequestResponse(request, driverId, 'accepted');
    clearRideRequestExpiryTimer(request.id);
    request.broadcastedDrivers
      .filter(candidateDriverId => candidateDriverId !== driverId)
      .forEach(candidateDriverId => {
        upsertRideRequestResponse(request, candidateDriverId, 'ignored');
        publishDispatchRequestExpired(candidateDriverId, {
          rideId: ride.id,
          requestId: request.id,
          status: 'expired',
          reason: 'accepted_by_other_driver',
          acceptedDriverId: driverId,
          updatedAt: request.updatedAt
        });
      });
  }
  appendRideEvent(ride, 'driver_assigned', 'Pickup approaching', 'Driver is heading to your pickup point now.', 'driver', driverId);
  const driverProfile = store.drivers.get(driverId);
  const acceptedTemplate = notificationTemplates.DRIVER_ACCEPTED({
    driverId,
    rideId: ride.id,
    driverName: store.users.get(driverId)?.email || 'Your driver',
    driverLat: driverProfile?.lat,
    driverLng: driverProfile?.lng,
    eta: 2
  });
  await pushRideNotification(
    ride.riderId,
    'trip_updates',
    acceptedTemplate.title,
    acceptedTemplate.body,
    'trip_update_accepted',
    acceptedTemplate.data
  );
  await sendRideConfirmationEmail(ride);
  publishRideRealtimeUpdate(ride, 'accepted');
  return {
    module: 'rides',
    action: 'accept',
    ok: true,
    ride: toRiderRideSummary(ride),
    request,
    assignment: toAssignedRideDispatchSummary(ride)
  };
}

export async function arrive(body: any, _params?: any, _query?: any) {
  const ride = getRide(body?.rideId);
  if (!ride) return { module: 'rides', action: 'arrive', error: 'ride not found' };
  const driverId = getDriverId(body);
  if (!driverId || ride.driverId !== driverId) return { module: 'rides', action: 'arrive', error: 'only assigned driver can mark arrival' };
  if (ride.status !== 'accepted') return { module: 'rides', action: 'arrive', error: 'ride must be accepted to mark arrival' };
  const now = timestamp();
  ride.status = 'arrived_at_pickup';
  ride.arrivedAt = now;
  ride.waitingSince = now;
  ride.waitTimeoutAt = new Date(Date.now() + DEFAULT_WAIT_TIMEOUT_SECONDS * 1000).toISOString();
  ride.lifecycleState = 'waiting';
  appendRideEvent(ride, 'driver_arrived', 'Driver arrived', 'Your driver has arrived at the pickup point.', 'driver', driverId, now);
  const vehicle = getDriverVehicle(driverId);
  const arrivingTemplate = notificationTemplates.DRIVER_ARRIVING({
    rideId: ride.id,
    plateNumber: vehicle?.licensePlate,
    carColor: vehicle?.color
  });
  await pushRideNotification(
    ride.riderId,
    'trip_updates',
    arrivingTemplate.title,
    arrivingTemplate.body,
    'trip_update_arrived',
    arrivingTemplate.data
  );
  const rider = store.users.get(ride.riderId);
  const driverProfile: any = ride.driverId ? store.drivers.get(ride.driverId) : undefined;
  if (rider?.phone) {
    await sendSMS(
      rider.phone,
      smsTemplates.DRIVER_ARRIVING({
        carColor: driverProfile?.carColor || '',
        carMake: driverProfile?.carMake || '',
        licensePlate: driverProfile?.licensePlate || 'N/A'
      }),
      { template: 'driver_arriving', userId: rider.id }
    );
  }
  publishRideRealtimeUpdate(ride, 'arrived_at_pickup');
  return { module: 'rides', action: 'arrive', ok: true, ride: toRiderRideSummary(ride), arrivedAt: now };
}

export async function start(body: any, _params?: any, _query?: any) {
  const ride = getRide(body?.rideId);
  if (!ride) return { module: 'rides', action: 'start', error: 'ride not found' };
  const driverId = getDriverId(body);
  if (!driverId || ride.driverId !== driverId) return { module: 'rides', action: 'start', error: 'only assigned driver can start ride' };
  if (ride.status !== 'arrived_at_pickup') return { module: 'rides', action: 'start', error: 'ride must be at pickup before start' };
  if (body?.riderConfirmed !== true) return { module: 'rides', action: 'start', error: 'rider confirmation is required before start' };
  const now = timestamp();
  ride.status = 'started';
  ride.lifecycleState = 'in_progress';
  ride.startConfirmationAt = now;
  ride.startedAt = now;
  appendRideEvent(ride, 'passenger_onboard', 'Passenger onboard', 'Passenger has been picked up and the trip is now in progress.', 'driver', driverId, now);
  await pushRideNotification(
    ride.riderId,
    'trip_updates',
    'Trip started',
    'Your trip is now in progress.',
    'trip_update_started'
  );
  publishRideRealtimeUpdate(ride, 'started');
  return { module: 'rides', action: 'start', ok: true, ride: toRiderRideSummary(ride) };
}

export async function complete(body: any, _params?: any, _query?: any) {
  const ride = getRide(body?.rideId);
  if (!ride) return { module: 'rides', action: 'complete', error: 'ride not found' };
  const driverId = getDriverId(body);
  if (!driverId || ride.driverId !== driverId) return { module: 'rides', action: 'complete', error: 'only assigned driver can complete ride' };
  if (ride.status !== 'started') return { module: 'rides', action: 'complete', error: 'ride not started' };

  const completedAt = timestamp();
  ride.status = 'completed';
  ride.lifecycleState = 'completed';
  ride.completedAt = completedAt;
  ride.fareDetails = buildFareDetails(ride.miles, ride.minutes, {
    surgeMultiplier: ride.surgeMultiplier,
    discountCents: ride.discountCents,
    taxesCents: Number(body?.taxesCents || 0),
    tollsCents: Number(body?.tollsCents || 0),
    tipsCents: Number(body?.tipsCents || 0),
    vehicleType: ride.vehicleType
  });
  ride.fareEstimate = ride.fareDetails.total;
  ride.paymentStatus = 'settled_internal';
  const request = getRideRequestByRideId(ride.id);
  if (request) syncRideRequestState(request, 'completed');
  appendRideEvent(ride, 'ride_completed', 'Ride completed', 'Your trip is complete and receipt details are ready.', 'driver', driverId, completedAt);
  const completeTemplate = notificationTemplates.RIDE_COMPLETED({
    rideId: ride.id,
    totalFare: amountToCents(ride.fareDetails.total),
    driverEarnings: amountToCents(ride.fareDetails.driverEarnings)
  });
  await pushRideNotification(
    ride.riderId,
    'trip_updates',
    completeTemplate.title,
    completeTemplate.body,
    'trip_update_completed',
    completeTemplate.data
  );
  if (ride.driverId) releaseDriverFromRide(ride.driverId);
  const driverProfile = ride.driverId ? store.drivers.get(ride.driverId) : null;
  if (driverProfile?.currentTripId === ride.id) driverProfile.currentTripId = undefined;

  const grossCents = amountToCents(ride.fareDetails.subtotal);
  const discountCents = amountToCents(ride.fareDetails.discounts);
  const amountCents = amountToCents(ride.fareDetails.total);
  if (ride.riderId) pushWalletTx(ride.riderId, 'debit', amountCents, `ride:${ride.id}:fare`);
  const driverPayoutCents = amountToCents(ride.fareDetails.driverEarnings);
  if (ride.driverId) {
    pushWalletTx(ride.driverId, 'credit', driverPayoutCents, `ride:${ride.id}:payout`);
    await pushRideNotification(
      ride.driverId,
      'earnings',
      'Earnings updated',
      `You earned $${(driverPayoutCents / 100).toFixed(2)} from your latest trip.`,
      'earnings_ride_payout',
      {
        rideId: ride.id,
        action: 'EARNINGS',
        amount: String(driverPayoutCents)
      }
    );
  }

  const riderUser = store.users.get(ride.riderId);
  const driverUser = ride.driverId ? store.users.get(ride.driverId) : undefined;
  if (riderUser?.email) {
    const receiptTemplate = emailTemplates.PAYMENT_RECEIPT({
      riderName: riderUser.email?.split('@')[0] || 'Rider',
      driverName: driverUser?.email?.split('@')[0] || 'Driver',
      tripDate: new Date(completedAt).toLocaleDateString(),
      pickupAddress: ride.pickupAddress || `${ride.pickupLat}, ${ride.pickupLng}`,
      dropoffAddress: ride.dropoffAddress || `${ride.dropoffLat}, ${ride.dropoffLng}`,
      duration: `${ride.minutes} min`,
      distance: `${ride.miles} miles`,
      baseFare: amountToCents(ride.fareDetails.baseFare),
      distanceFare: amountToCents(ride.fareDetails.distanceFare),
      timeFare: amountToCents(ride.fareDetails.timeFare),
      serviceFee: amountToCents(ride.fareDetails.serviceFee),
      taxes: amountToCents(ride.fareDetails.taxes),
      tolls: amountToCents(ride.fareDetails.tolls),
      discount: amountToCents(ride.fareDetails.discounts),
      tip: amountToCents(ride.fareDetails.tips),
      total: amountToCents(ride.fareDetails.total),
      paymentMethodLast4: undefined,
      invoiceNumber: ride.id,
      downloadReceiptLink: `${env.appBaseUrl || 'https://app.drive.com'}/rides/${ride.id}/receipt`
    });
    await sendEmail(riderUser.email, receiptTemplate.subject, receiptTemplate.html, { template: 'payment_receipt', userId: riderUser.id });
  }

  if (driverUser?.email && ride.driverId) {
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    const todayEarnings = store.walletTx
      .filter(tx => tx.userId === ride.driverId && tx.kind === 'credit' && tx.reason.endsWith(':payout') && new Date(tx.createdAt) >= todayStart)
      .reduce((sum, tx) => sum + tx.amountCents, 0);
    const driverTemplate = emailTemplates.DRIVER_EARNINGS({
      driverName: driverUser.email?.split('@')[0] || 'Driver',
      riderName: riderUser?.email?.split('@')[0] || 'Rider',
      pickupAddress: ride.pickupAddress || `${ride.pickupLat}, ${ride.pickupLng}`,
      dropoffAddress: ride.dropoffAddress || `${ride.dropoffLat}, ${ride.dropoffLng}`,
      duration: `${ride.minutes} min`,
      distance: `${ride.miles} miles`,
      grossFare: amountToCents(ride.fareDetails.surgeFare),
      platformFee: amountToCents(ride.fareDetails.serviceFee),
      earnings: driverPayoutCents,
      todayEarnings,
      walletLink: `${env.appBaseUrl || 'https://app.drive.com'}/wallet`
    });
    await sendEmail(driverUser.email, driverTemplate.subject, driverTemplate.html, { template: 'driver_earnings', userId: driverUser.id });
  }

  // Process referral bonus on rider's first completed ride
  if (ride.riderId) {
    const completedCount = countCompletedRidesForRider(ride.riderId);
    if (completedCount === 1) {
      const referral = getPendingReferralEvent(ride.riderId);
      if (referral) {
        referral.paid = true;
        referral.rideId = ride.id;
        markStoreDirty();
        pushWalletTx(referral.referrerUserId, 'credit', referral.bonusCents, `referral:${referral.id}:bonus`);
        await pushRideNotification(
          referral.referrerUserId,
          'bonuses',
          'Referral bonus earned',
          `You received $${(referral.bonusCents / 100).toFixed(2)} for a completed referral ride.`,
          'bonus_referral'
        );
      }
    }
  }

  const riderProfile = store.riders.get(ride.riderId);
  if (riderProfile?.currentTripId === ride.id) riderProfile.currentTripId = undefined;

  publishRideRealtimeUpdate(ride, 'completed');
  if (ride.driverId) publishDriverRealtimeEarnings(ride.driverId);
  return { module: 'rides', action: 'complete', ok: true, ride: toRiderRideSummary(ride), grossCents, discountCents, amountCents, receipt: getRideReceipt(ride) };
}

export async function noShow(body: any, _params?: any, _query?: any) {
  const ride = getRide(body?.rideId);
  if (!ride) return { module: 'rides', action: 'no-show', error: 'ride not found' };
  const driverId = getDriverId(body);
  if (!driverId || ride.driverId !== driverId) return { module: 'rides', action: 'no-show', error: 'only assigned driver can report no-show' };
  if (ride.status !== 'arrived_at_pickup') return { module: 'rides', action: 'no-show', error: 'driver must be at pickup to report no-show' };
  const now = timestamp();
  const waitDurationSeconds = getWaitDurationSeconds(ride);
  if (!body?.manual && waitDurationSeconds < DEFAULT_WAIT_TIMEOUT_SECONDS) {
    return { module: 'rides', action: 'no-show', error: 'wait timer must expire before automatic no-show' };
  }
  ride.noShowFeeCents = DEFAULT_NO_SHOW_FEE_CENTS;
  ride.photoEvidenceUrl = typeof body?.photoEvidenceUrl === 'string' ? body.photoEvidenceUrl.trim() || undefined : undefined;
  ride.noShowReportedAt = now;
  setCancellationDetails(ride, 'driver', 'rider_no_show', now, DEFAULT_NO_SHOW_FEE_CENTS);
  const request = getRideRequestByRideId(ride.id);
  if (request) syncRideRequestState(request, 'canceled');
  appendRideEvent(ride, 'rider_no_show', 'Rider no-show', 'Driver waited at pickup but rider did not appear.', 'driver', driverId, now);
  if (ride.driverId) releaseDriverFromRide(ride.driverId);
  const driverProfile = store.drivers.get(driverId);
  if (driverProfile?.currentTripId === ride.id) driverProfile.currentTripId = undefined;
  const riderProfile = store.riders.get(ride.riderId);
  if (riderProfile?.currentTripId === ride.id) riderProfile.currentTripId = undefined;
  if (ride.riderId) pushWalletTx(ride.riderId, 'debit', DEFAULT_NO_SHOW_FEE_CENTS, `ride:${ride.id}:no_show_fee`);
  if (ride.driverId) {
    pushWalletTx(ride.driverId, 'credit', DEFAULT_NO_SHOW_FEE_CENTS, `ride:${ride.id}:cancellation_payout`);
    await pushRideNotification(
      ride.driverId,
      'earnings',
      'No-show fee credited',
      `A $${(DEFAULT_NO_SHOW_FEE_CENTS / 100).toFixed(2)} no-show fee has been added to your earnings.`,
      'earnings_no_show'
    );
    publishDriverRealtimeEarnings(ride.driverId);
  }
  await pushRideNotification(
    ride.riderId,
    'trip_updates',
    'Driver marked a no-show',
    'The trip was canceled because the rider did not arrive at pickup.',
    'trip_update_no_show'
  );
  publishRideRealtimeUpdate(ride, 'canceled');
  return {
    module: 'rides',
    action: 'no-show',
    ok: true,
    ride: toRiderRideSummary(ride),
    cancellation: {
      canceledAt: now,
      cancellationReason: 'rider_no_show',
      cancellationActorRole: 'driver',
      cancellationFeeCents: DEFAULT_NO_SHOW_FEE_CENTS
    },
    receipt: getRideReceipt(ride)
  };
}

export async function driverCancel(body: any, _params?: any, _query?: any) {
  const ride = getRide(body?.rideId);
  if (!ride) return { module: 'rides', action: 'driver-cancel', error: 'ride not found' };
  const driverId = getDriverId(body);
  if (!driverId || ride.driverId !== driverId) return { module: 'rides', action: 'driver-cancel', error: 'only assigned driver can cancel ride' };
  if (ride.status === 'canceled') return { module: 'rides', action: 'driver-cancel', error: 'ride already canceled' };
  if (ride.status === 'completed') return { module: 'rides', action: 'driver-cancel', error: 'cannot cancel completed ride' };
  if (ride.status === 'started') return { module: 'rides', action: 'driver-cancel', error: 'cannot cancel ride in progress' };
  const reason: string = typeof body?.reason === 'string' && body.reason.trim() ? body.reason.trim() : 'canceled_by_driver';
  const now = timestamp();
  setCancellationDetails(ride, 'driver', reason, now, 0);
  const request = getRideRequestByRideId(ride.id);
  if (request) {
    syncRideRequestState(request, 'canceled');
    upsertRideRequestResponse(request, driverId, 'canceled');
  }
  appendRideEvent(ride, 'ride_canceled', 'Ride canceled by driver', `Driver canceled the ride: ${reason}.`, 'driver', driverId, now);
  releaseDriverFromRide(driverId);
  const driverProfile = store.drivers.get(driverId);
  if (driverProfile?.currentTripId === ride.id) driverProfile.currentTripId = undefined;
  const riderProfile = store.riders.get(ride.riderId);
  if (riderProfile?.currentTripId === ride.id) riderProfile.currentTripId = undefined;
  await pushRideNotification(
    ride.riderId,
    'trip_updates',
    'Driver canceled the trip',
    `The driver canceled the trip: ${reason}.`,
    'trip_update_driver_canceled'
  );
  publishRideRealtimeUpdate(ride, 'canceled');
  return {
    module: 'rides',
    action: 'driver-cancel',
    ok: true,
    ride: toRiderRideSummary(ride),
    cancellation: {
      canceledAt: now,
      cancellationReason: reason,
      cancellationActorRole: 'driver',
      cancellationFeeCents: 0
    },
    receipt: getRideReceipt(ride)
  };
}

export async function cancel(body: any, _params?: any, _query?: any) {
  const ride = getRide(body?.rideId);
  if (!ride) return { module: 'rides', action: 'cancel', error: 'ride not found' };
  const riderId = getRiderId(body);
  if (!riderId || ride.riderId !== riderId) return { module: 'rides', action: 'cancel', error: 'only rider can cancel ride' };
  if (ride.status === 'canceled') return { module: 'rides', action: 'cancel', error: 'ride already canceled' };
  if (ride.status === 'completed') return { module: 'rides', action: 'cancel', error: 'cannot cancel completed ride' };
  if (ride.status === 'started') return { module: 'rides', action: 'cancel', error: 'cannot cancel started ride' };
  const canceledAt = timestamp();
  const cancellationReason = body?.reason || 'canceled_by_rider';
  const cancellationFeeCents = ride.status === 'arrived_at_pickup' ? DEFAULT_CANCELLATION_FEE_CENTS : 0;
  setCancellationDetails(ride, 'rider', cancellationReason, canceledAt, cancellationFeeCents);
  const request = getRideRequestByRideId(ride.id);
  if (request) syncRideRequestState(request, 'canceled');
  appendRideEvent(
    ride,
    'ride_canceled',
    'Ride canceled',
    cancellationFeeCents > 0 ? 'Your ride was canceled after the driver arrived at pickup.' : 'Your ride was canceled before pickup.',
    'rider',
    riderId,
    canceledAt
  );
  await pushRideNotification(
    ride.riderId,
    'trip_updates',
    'Trip canceled',
    cancellationFeeCents > 0
      ? `Your ride request was canceled and a $${(cancellationFeeCents / 100).toFixed(2)} cancellation fee was applied.`
      : 'Your ride request was canceled.',
    'trip_update_canceled'
  );
  await pushRideNotification(
    ride.driverId,
    'trip_updates',
    'Rider canceled the trip',
    cancellationFeeCents > 0
      ? `The rider canceled after arrival. You received a $${(cancellationFeeCents / 100).toFixed(2)} cancellation fee.`
      : 'The rider canceled before pickup.',
    'trip_update_rider_canceled'
  );
  if (cancellationFeeCents > 0) {
    pushWalletTx(ride.riderId, 'debit', cancellationFeeCents, `ride:${ride.id}:cancellation_fee`);
    if (ride.driverId) {
      pushWalletTx(ride.driverId, 'credit', cancellationFeeCents, `ride:${ride.id}:cancellation_payout`);
      await pushRideNotification(
        ride.driverId,
        'earnings',
        'Cancellation fee credited',
        `A $${(cancellationFeeCents / 100).toFixed(2)} cancellation fee has been added to your earnings.`,
        'earnings_cancellation'
      );
      publishDriverRealtimeEarnings(ride.driverId);
    }
  }
  if (ride.driverId) releaseDriverFromRide(ride.driverId);
  const driverProfile = ride.driverId ? store.drivers.get(ride.driverId) : null;
  if (driverProfile?.currentTripId === ride.id) driverProfile.currentTripId = undefined;
  const riderProfile = store.riders.get(ride.riderId);
  if (riderProfile?.currentTripId === ride.id) riderProfile.currentTripId = undefined;
  publishRideRealtimeUpdate(ride, 'canceled');
  return {
    module: 'rides',
    action: 'cancel',
    ok: true,
    ride: toRiderRideSummary(ride),
    cancellation: {
      canceledAt: ride.canceledAt,
      cancellationReason: ride.cancellationReason,
      cancellationFeeCents
    },
    receipt: getRideReceipt(ride)
  };
}

export async function rate(body: any, _params?: any, _query?: any) {
  const ride = getRide(body?.rideId);
  if (!ride) return { module: 'rides', action: 'rate', error: 'ride not found' };
  const riderId = getRiderId(body);
  if (!riderId || ride.riderId !== riderId) return { module: 'rides', action: 'rate', error: 'only rider can rate ride' };
  if (ride.status !== 'completed') return { module: 'rides', action: 'rate', error: 'only completed rides can be rated' };
  if (typeof ride.rating === 'number') return { module: 'rides', action: 'rate', error: 'ride already rated' };
  const rating = Number(body?.rating);
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) return { module: 'rides', action: 'rate', error: 'rating must be 1-5' };
  ride.rating = rating;
  ride.review = typeof body?.review === 'string' ? body.review.trim() || undefined : undefined;
  ride.ratedAt = timestamp();
  appendRideEvent(ride, 'ride_rated', 'Trip rated', 'Thanks for rating this ride.', 'rider', riderId, ride.ratedAt);
  const riderProfile = ensureRiderProfile(riderId);
  riderProfile.reviewCount += 1;
  const driverRating = updateDriverRating(ride.driverId);
  publishRiderRatingSubmitted(ride);
  syncRatedLifecycleState(ride);
  return { module: 'rides', action: 'rate', ok: true, rideId: ride.id, rating, review: ride.review, driverRating, ride: toRiderRideSummary(ride) };
}

export async function ratePassenger(body: any, _params?: any, _query?: any) {
  const ride = getRide(body?.rideId);
  if (!ride) return { module: 'rides', action: 'rate-passenger', error: 'ride not found' };
  const driverId = getDriverId(body);
  if (!driverId || ride.driverId !== driverId) {
    return { module: 'rides', action: 'rate-passenger', error: 'only assigned driver can rate passenger' };
  }
  if (ride.status !== 'completed') {
    return { module: 'rides', action: 'rate-passenger', error: 'only completed rides can be rated' };
  }
  if (typeof ride.passengerRating === 'number') {
    return { module: 'rides', action: 'rate-passenger', error: 'passenger already rated' };
  }
  const rating = Number(body?.rating);
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    return { module: 'rides', action: 'rate-passenger', error: 'rating must be 1-5' };
  }
  ride.passengerRating = rating;
  ride.passengerReview = typeof body?.comment === 'string' ? body.comment.trim() || undefined : undefined;
  ride.passengerRatedAt = timestamp();
  appendRideEvent(ride, 'passenger_rated', 'Passenger rated', 'Driver submitted passenger feedback.', 'driver', driverId, ride.passengerRatedAt);
  syncRatedLifecycleState(ride);
  return {
    module: 'rides',
    action: 'rate-passenger',
    ok: true,
    rideId: ride.id,
    rating,
    comment: ride.passengerReview,
    ride: toRiderRideSummary(ride)
  };
}

export async function updateStatus(body: any, params?: any, query?: any) {
  const rideId = params?.rideId || body?.rideId;
  const status = String(body?.status || '').trim().toLowerCase();
  if (!rideId) return { module: 'rides', action: 'update-status', error: 'rideId is required' };
  if (!status) return { module: 'rides', action: 'update-status', error: 'status is required' };

  const payload = { ...body, rideId };
  if (status === 'accepted') return accept(payload, params, query);
  if (status === 'arrived' || status === 'arrived_at_pickup') return arrive(payload, params, query);
  if (status === 'started' || status === 'in_progress') {
    const ride = getRide(rideId);
    if (ride?.status === 'accepted') {
      const arriveResult = await arrive(payload, params, query);
      if (!arriveResult?.ok) return arriveResult;
      return start({ ...payload, riderConfirmed: payload?.riderConfirmed ?? true }, params, query);
    }
    return start(payload, params, query);
  }
  if (status === 'completed') return complete(payload, params, query);
  if (status === 'cancelled' || status === 'canceled') {
    return body?.actor?.role === 'driver' ? driverCancel(payload, params, query) : cancel(payload, params, query);
  }
  return { module: 'rides', action: 'update-status', error: 'unsupported status transition' };
}

export async function submitRating(body: any, params?: any, query?: any) {
  const payload = { ...body, rideId: params?.rideId || body?.rideId };
  return body?.actor?.role === 'driver' ? ratePassenger(payload, params, query) : rate(payload, params, query);
}

export async function message(body: any, _params?: any, _query?: any) {
  const ride = getRide(body?.rideId);
  if (!ride) return { module: 'rides', action: 'message', error: 'ride not found' };
  if (!canAccessRide(body?.actor, ride)) {
    return { module: 'rides', action: 'message', error: 'forbidden' };
  }
  const message = typeof body?.message === 'string' ? body.message.trim() : '';
  if (!message) return { module: 'rides', action: 'message', error: 'message is required' };
  const actor = body?.actor;
  const event = appendRideEvent(ride, 'chat_message', 'Trip chat', message, actor?.role, actor?.id);
  let counterpartyId: string | undefined;
  if (actor?.id === ride.driverId) {
    counterpartyId = ride.riderId;
  } else if (actor?.id === ride.riderId) {
    counterpartyId = ride.driverId;
  }
  if (counterpartyId) {
    const senderLabel = actor?.role === 'driver' ? 'Driver' : 'Rider';
    await pushRideNotification(counterpartyId, 'trip_updates', `New trip message from ${senderLabel}`, message, 'trip_message');
  }
  publishRideRealtimeUpdate(ride, 'chat_message');
  return { module: 'rides', action: 'message', ok: true, message: event, rideId: ride.id };
}
