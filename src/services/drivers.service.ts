import { randomUUID } from 'crypto';
import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import * as authService from './auth.service';
import { makeId, markStoreDirty, store, timestamp, type DriverProfile, type DriverVehicleProfile, type DriverVerificationDocument, type Vehicle, type VehicleType } from '../database/data.store';
import { publishDriverRealtimeLocation, publishDriverStatusChanged } from './realtime-dispatch.service';
import { findNearbyDrivers, rankDrivers } from '../utils/dispatch.engine';
import { sendEmail } from './email.service';
import { emailTemplates } from '../utils/email-templates';
import { env } from '../config/env';

type DriverDocumentInput = string | {
  id?: string;
  type?: string;
  fileName?: string;
  expiryDate?: string;
  documentNumber?: string;
  extractedText?: string;
  selfieMatchScore?: number;
};

const SELFIE_DOCUMENT_TYPE = 'Selfie Photo';
const LICENSE_DOCUMENT_TYPE = 'Driver License';
const LOCATION_HISTORY_LIMIT = 5_000;
const DRIVER_VEHICLE_TYPES = new Set(['sedan', 'suv', 'minivan', 'truck', 'hybrid']);
const VEHICLE_PHOTO_MIME_TO_EXTENSION: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp'
};

function getProfile(userId: string) {
  return store.drivers.get(userId);
}

function canManageDriver(actor: any, targetDriverId: string) {
  return actor?.role === 'admin' || actor?.id === targetDriverId;
}

function createDefaultDriverProfile(userId: string): DriverProfile {
  return {
    userId,
    vehicleIds: [],
    status: 'pending',
    verificationState: 'documents_pending',
    availabilityStatus: 'offline',
    available: false,
    rating: 5,
    acceptanceRate: 1,
    cancellationRate: 0,
    earningsCents: 0,
    documents: [],
    verificationDocuments: [],
    selfieVerification: {
      status: 'missing',
      score: 0
    },
    verificationReview: {
      status: 'pending_review'
    }
  };
}

function getOrCreateProfile(userId: string, role?: string): DriverProfile | undefined {
  const existing = getProfile(userId);
  if (existing) return existing;
  if (role === 'driver') {
    const profile = createDefaultDriverProfile(userId);
    store.drivers.set(userId, profile);
    markStoreDirty();
    return profile;
  }
  return undefined;
}

function toTitleCase(value: string) {
  return value
    .toLowerCase()
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function normalizeDocumentType(type: unknown) {
  const normalized = String(type || '').trim().toLowerCase();
  if (!normalized) return 'Document';
  if (normalized === 'license' || normalized === 'driver license' || normalized === 'license scan') return LICENSE_DOCUMENT_TYPE;
  if (normalized === 'selfie' || normalized === 'selfie photo' || normalized === 'face verification') return SELFIE_DOCUMENT_TYPE;
  if (normalized === 'insurance') return 'Insurance';
  if (normalized === 'vehicle registration' || normalized === 'registration') return 'Vehicle Registration';
  return toTitleCase(normalized);
}

function buildFallbackLicenseNumber(userId: string) {
  const compact = String(userId || '')
    .replace(/[^a-z0-9]/gi, '')
    .toUpperCase()
    .slice(-8);
  return `DL-${compact || '00000000'}`;
}

function buildLicenseOcrText(userId: string, document: { expiryDate?: string; documentNumber?: string; extractedText?: string }) {
  if (document.extractedText?.trim()) return document.extractedText.trim();
  const user = store.users.get(userId);
  const holderName = user?.email?.split('@')[0]?.replace(/[._-]+/g, ' ') || userId;
  const licenseNumber = document.documentNumber?.trim() || buildFallbackLicenseNumber(userId);
  return [
    'DRIVER LICENSE',
    `Name: ${holderName}`,
    `License Number: ${licenseNumber}`,
    `Expiry Date: ${document.expiryDate || 'Not provided'}`
  ].join('\n');
}

function scoreSelfieVerification(score: unknown) {
  const numeric = Number(score);
  // Treat 0.75+ as a strong automated match, 0.5-0.74 as needing manual review,
  // and anything lower as a failed comparison that should block approval.
  if (!Number.isFinite(numeric)) return { score: 0, status: 'pending_review' as const };
  if (numeric >= 0.75) return { score: numeric, status: 'matched' as const };
  if (numeric >= 0.5) return { score: numeric, status: 'pending_review' as const };
  return { score: Math.max(0, numeric), status: 'failed' as const };
}

function parseLegacyDocument(input: string) {
  const [rawType, rawExpiryDate, rawFileName] = input.split(':');
  return {
    id: undefined,
    type: normalizeDocumentType(rawType || input),
    expiryDate: rawExpiryDate || undefined,
    fileName: rawFileName || `${String(rawType || input || 'document').trim().toLowerCase().replace(/[^a-z0-9]+/gi, '-') || 'document'}.jpg`,
    documentNumber: undefined,
    extractedText: undefined,
    selfieMatchScore: undefined
  };
}

function normalizeVehicleType(value: unknown): VehicleType | null {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'economy' || normalized === 'comfort' || normalized === 'premium' || normalized === 'xl') return normalized;
  return null;
}

function getDriverVehicles(driverId: string) {
  return Array.from(store.vehicles.values())
    .filter(vehicle => vehicle.driverId === driverId)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

function getActiveDriverVehicle(driverId: string) {
  const profile = getProfile(driverId);
  const driverVehicles = getDriverVehicles(driverId);
  if (!driverVehicles.length) return null;
  if (profile?.primaryVehicleId) {
    const preferred = driverVehicles.find(vehicle => vehicle.vehicleId === profile.primaryVehicleId && vehicle.status === 'active');
    if (preferred) return preferred;
  }
  return driverVehicles.find(vehicle => vehicle.status === 'active') || null;
}

function sanitizeDriverVehicleProfile(vehicle: any, fallbackPlate?: string): DriverVehicleProfile | null {
  const make = String(vehicle?.make || '').trim();
  const model = String(vehicle?.model || '').trim();
  const year = Number(vehicle?.year);
  const color = String(vehicle?.color || '').trim();
  const plateNumber = String(vehicle?.plateNumber || vehicle?.licensePlate || fallbackPlate || '').trim().toUpperCase();
  const type = String(vehicle?.type || '').trim().toLowerCase();
  const photoUrl = String(vehicle?.photoUrl || '').trim();

  if (!make || !model || !Number.isInteger(year) || year < 1990 || year > 2099 || !color || !plateNumber || !DRIVER_VEHICLE_TYPES.has(type)) {
    return null;
  }

  return {
    make,
    model,
    year,
    color,
    plateNumber,
    type,
    photoUrl: photoUrl || undefined,
    lastUpdated: timestamp()
  };
}

function buildDriverVehicleProfile(driverId: string) {
  const profile = getProfile(driverId);
  if (!profile) return null;
  if (profile.vehicle) return profile.vehicle;

  const activeVehicle = getActiveDriverVehicle(driverId);
  if (!activeVehicle) return null;
  return {
    make: activeVehicle.make,
    model: activeVehicle.model,
    year: activeVehicle.year,
    color: activeVehicle.color,
    plateNumber: activeVehicle.licensePlate,
    type: activeVehicle.vehicleType === 'xl' ? 'suv' : activeVehicle.vehicleType,
    lastUpdated: activeVehicle.createdAt
  };
}

function ensureVerificationData(profile: DriverProfile) {
  if (!Array.isArray(profile.vehicleIds)) {
    profile.vehicleIds = [];
  }
  if (!Array.isArray(profile.verificationDocuments)) {
    profile.verificationDocuments = [];
  }
  if (!profile.selfieVerification) {
    profile.selfieVerification = {
      status: 'missing',
      score: 0
    };
  }
  if (!profile.verificationReview) {
    profile.verificationReview = {
      status: 'pending_review'
    };
  }
  if (!Array.isArray(profile.documents)) {
    profile.documents = [];
  }

  const now = timestamp();
  if (!profile.verificationDocuments.length && profile.documents.length) {
    profile.verificationDocuments = profile.documents.map((documentValue, index) => {
      const legacy = parseLegacyDocument(documentValue);
      const normalizedDocument: DriverVerificationDocument = {
        id: `legacy_${profile.userId}_${index + 1}`,
        type: legacy.type,
        fileName: legacy.fileName,
        expiryDate: legacy.expiryDate,
        uploadedAt: now,
        verificationStatus: 'pending_review'
      };
      if (legacy.type === LICENSE_DOCUMENT_TYPE) {
        normalizedDocument.ocrText = buildLicenseOcrText(profile.userId, legacy);
        normalizedDocument.extractedFields = {
          licenseNumber: buildFallbackLicenseNumber(profile.userId),
          expiryDate: legacy.expiryDate
        };
      }
      return normalizedDocument;
    });
  }

  const selfieDocument = profile.verificationDocuments.find(document => document.type === SELFIE_DOCUMENT_TYPE);
  if (selfieDocument && profile.selfieVerification.status === 'missing') {
    profile.selfieVerification = {
      status: 'pending_review',
      score: 0,
      fileName: selfieDocument.fileName,
      checkedAt: selfieDocument.uploadedAt
    };
  }
}

function serializeDocuments(profile: DriverProfile) {
  ensureVerificationData(profile);
  profile.documents = profile.verificationDocuments!.map(document => [
    document.type,
    document.expiryDate,
    document.fileName
  ].filter(Boolean).join(':'));
}

function hasCompletedVerificationUploads(profile: DriverProfile) {
  ensureVerificationData(profile);
  const hasLicense = profile.verificationDocuments!.some(document => document.type === LICENSE_DOCUMENT_TYPE);
  const selfieStatus = profile.selfieVerification?.status || 'missing';
  return hasLicense && selfieStatus !== 'missing' && selfieStatus !== 'failed';
}

function syncProfileState(profile: any) {
  ensureVerificationData(profile);
  serializeDocuments(profile);

  if (profile.verificationReview?.status === 'rejected' || profile.status === 'rejected') {
    profile.verificationState = 'rejected';
  } else if (!hasCompletedVerificationUploads(profile)) {
    profile.verificationState = 'documents_pending';
  } else {
    const kyc = store.kycStatus.get(profile.userId);
    if (kyc === 'verified') {
      profile.verificationState = profile.verificationReview?.status === 'approved' ? 'verified' : 'review_pending';
    }
    else if (kyc === 'rejected') profile.verificationState = 'rejected';
    else profile.verificationState = 'kyc_pending';
  }

  if (profile.verificationState === 'verified') {
    profile.status = 'approved';
    if (!profile.availabilityStatus || profile.availabilityStatus === 'unavailable') profile.availabilityStatus = 'offline';
  } else if (profile.verificationState === 'rejected') {
    profile.status = 'rejected';
    profile.availabilityStatus = 'unavailable';
  } else {
    profile.status = 'pending';
    if (profile.availabilityStatus === 'online' || profile.availabilityStatus === 'assigned') profile.availabilityStatus = 'offline';
  }

  profile.available = profile.availabilityStatus === 'online';
}

function setAvailability(profile: any, next: 'offline' | 'online' | 'assigned' | 'unavailable') {
  if (next === 'online') {
    if (profile.verificationState !== 'verified') return { error: 'driver is not verified' };
    if (!Number.isFinite(Number(profile.lat)) || !Number.isFinite(Number(profile.lng))) {
      return { error: 'driver location must be set to finite numeric coordinates before going online' };
    }
  }
  profile.availabilityStatus = next;
  profile.available = next === 'online';
  return { ok: true };
}

export function syncDriverVerificationState(userId: string) {
  const profile = getProfile(userId);
  if (!profile) return null;
  syncProfileState(profile);
  markStoreDirty();
  return profile;
}

export function markDriverAssigned(userId: string) {
  const profile = getProfile(userId);
  if (!profile) return { ok: false, error: 'driver not found' as const };
  syncProfileState(profile);
  if (profile.verificationState !== 'verified') return { ok: false, error: 'driver is not verified' as const };
  if (profile.availabilityStatus !== 'online') return { ok: false, error: 'driver is not available for assignment' as const };
  setAvailability(profile, 'assigned');
  markStoreDirty();
  publishDriverStatusChanged(userId);
  return { ok: true, profile } as const;
}

export function releaseDriverFromRide(userId: string) {
  const profile = getProfile(userId);
  if (!profile) return null;
  syncProfileState(profile);
  if (profile.verificationState === 'verified' && profile.availabilityStatus === 'assigned') {
    setAvailability(profile, 'online');
    publishDriverStatusChanged(userId);
  }
  markStoreDirty();
  return profile;
}

export function isDriverDispatchEligible(profile: any) {
  return (
    profile?.status === 'approved' &&
    profile?.verificationState === 'verified' &&
    profile?.availabilityStatus === 'online' &&
    Number.isFinite(Number(profile?.lat)) &&
    Number.isFinite(Number(profile?.lng))
  );
}

export function getDriverDispatchVehicleType(driverId: string) {
  return getActiveDriverVehicle(driverId)?.vehicleType;
}

export async function apply(body: any, _params?: any, _query?: any) {
  const userId = body?.actor?.id || body?.userId;
  if (!userId) return { module: 'drivers', action: 'apply', error: 'actor ID or userId is required' };

  const existing = getProfile(userId);
  if (existing) {
    ensureVerificationData(existing);
    existing.lat = body?.lat ?? existing.lat;
    existing.lng = body?.lng ?? existing.lng;
    if (existing.status === 'rejected') {
      existing.status = 'pending';
      existing.documents = [];
      existing.verificationDocuments = [];
      existing.selfieVerification = {
        status: 'missing',
        score: 0
      };
      existing.verificationReview = {
        status: 'pending_review'
      };
      existing.available = false;
    }
    syncProfileState(existing);
    markStoreDirty();
    return { module: 'drivers', action: 'apply', ok: true, profile: existing };
  }

  const profile = {
    userId,
    vehicleIds: [] as string[],
    status: 'pending' as const,
    verificationState: 'documents_pending' as const,
    availabilityStatus: 'offline' as const,
    available: false,
    lat: body?.lat,
    lng: body?.lng,
    rating: 5,
    acceptanceRate: 1,
    cancellationRate: 0,
    earningsCents: 0,
    documents: [] as string[],
    verificationDocuments: [] as DriverVerificationDocument[],
    selfieVerification: {
      status: 'missing' as const,
      score: 0
    },
    verificationReview: {
      status: 'pending_review' as const
    }
  };
  store.drivers.set(userId, profile);
  return { module: 'drivers', action: 'apply', ok: true, profile };
}

export async function createVehicle(body: any, params?: any, _query?: any) {
  const driverId = params?.id || body?.driverId || body?.userId;
  if (!driverId) return { module: 'drivers', action: 'create-vehicle', error: 'driverId is required' };
  if (!canManageDriver(body?.actor, driverId)) return { module: 'drivers', action: 'create-vehicle', error: 'forbidden' };

  const profile = getProfile(driverId);
  if (!profile) return { module: 'drivers', action: 'create-vehicle', error: 'driver not found' };

  const vehicleType = normalizeVehicleType(body?.vehicleType);
  if (!vehicleType) return { module: 'drivers', action: 'create-vehicle', error: 'vehicleType must be economy, comfort, premium, or xl' };

  const year = Number(body?.year);
  const seats = Number(body?.seats);
  if (!Number.isInteger(year) || year < 1980 || year > 2100) return { module: 'drivers', action: 'create-vehicle', error: 'year must be a valid integer between 1980 and 2100' };
  if (!Number.isInteger(seats) || seats < 1 || seats > 12) return { module: 'drivers', action: 'create-vehicle', error: 'seats must be an integer between 1 and 12' };

  const make = String(body?.make || '').trim();
  const model = String(body?.model || '').trim();
  const color = String(body?.color || '').trim();
  const licensePlate = String(body?.licensePlate || '').trim().toUpperCase();
  if (!make || !model || !color || !licensePlate) {
    return { module: 'drivers', action: 'create-vehicle', error: 'make, model, color, and licensePlate are required' };
  }
  const existingVehicle = Array.from(store.vehicles.values()).find(vehicle => vehicle.licensePlate === licensePlate);
  if (existingVehicle) return { module: 'drivers', action: 'create-vehicle', error: 'license plate already exists' };

  const insuranceExpiry = String(body?.insuranceExpiry || '').trim();
  const registrationExpiry = String(body?.registrationExpiry || '').trim();
  if (!insuranceExpiry || !registrationExpiry) {
    return { module: 'drivers', action: 'create-vehicle', error: 'insuranceExpiry and registrationExpiry are required' };
  }

  ensureVerificationData(profile);
  const createdAt = timestamp();
  const vehicle: Vehicle = {
    vehicleId: makeId('vehicle'),
    driverId,
    make,
    model,
    year,
    licensePlate,
    color,
    seats,
    vehicleType,
    insuranceExpiry,
    registrationExpiry,
    status: body?.status === 'active' || body?.status === 'inactive' || body?.status === 'rejected'
      ? body.status
      : 'pending_verification',
    verificationDocuments: Array.isArray(body?.verificationDocuments) ? body.verificationDocuments.map((entry: unknown) => String(entry)) : [],
    createdAt
  };

  if (vehicle.status === 'active') {
    getDriverVehicles(driverId)
      .filter(existing => existing.status === 'active')
      .forEach(existing => {
        existing.status = 'inactive';
        store.vehicles.set(existing.vehicleId, existing);
      });
    profile.primaryVehicleId = vehicle.vehicleId;
  }

  store.vehicles.set(vehicle.vehicleId, vehicle);
  if (!profile.vehicleIds!.includes(vehicle.vehicleId)) profile.vehicleIds!.push(vehicle.vehicleId);
  markStoreDirty();
  return { module: 'drivers', action: 'create-vehicle', ok: true, vehicle, vehicles: getDriverVehicles(driverId) };
}

export async function listVehicles(body: any, params?: any, _query?: any) {
  const driverId = params?.id || body?.driverId || body?.userId;
  if (!driverId) return { module: 'drivers', action: 'list-vehicles', error: 'driverId is required' };
  if (!canManageDriver(body?.actor, driverId)) return { module: 'drivers', action: 'list-vehicles', error: 'forbidden' };
  const profile = getProfile(driverId);
  if (!profile) return { module: 'drivers', action: 'list-vehicles', error: 'driver not found' };
  ensureVerificationData(profile);
  return { module: 'drivers', action: 'list-vehicles', ok: true, vehicles: getDriverVehicles(driverId), primaryVehicleId: profile.primaryVehicleId };
}

export async function deleteVehicle(body: any, params?: any, _query?: any) {
  const driverId = params?.id || body?.driverId || body?.userId;
  const vehicleId = params?.vehicleId || body?.vehicleId;
  if (!driverId) return { module: 'drivers', action: 'delete-vehicle', error: 'driverId is required' };
  if (!vehicleId) return { module: 'drivers', action: 'delete-vehicle', error: 'vehicleId is required' };
  if (!canManageDriver(body?.actor, driverId)) return { module: 'drivers', action: 'delete-vehicle', error: 'forbidden' };

  const profile = getProfile(driverId);
  if (!profile) return { module: 'drivers', action: 'delete-vehicle', error: 'driver not found' };
  const existing = store.vehicles.get(vehicleId);
  if (!existing || existing.driverId !== driverId) return { module: 'drivers', action: 'delete-vehicle', error: 'vehicle not found' };
  if (profile.primaryVehicleId === vehicleId && existing.status === 'active') {
    return { module: 'drivers', action: 'delete-vehicle', error: 'cannot delete active vehicle' };
  }

  store.vehicles.delete(vehicleId);
  ensureVerificationData(profile);
  profile.vehicleIds = profile.vehicleIds!.filter(id => id !== vehicleId);
  if (profile.primaryVehicleId === vehicleId) {
    profile.primaryVehicleId = getDriverVehicles(driverId).find(vehicle => vehicle.status === 'active')?.vehicleId;
  }
  markStoreDirty();
  return { module: 'drivers', action: 'delete-vehicle', ok: true, vehicleId, vehicles: getDriverVehicles(driverId) };
}

export async function setActiveVehicle(body: any, params?: any, _query?: any) {
  const driverId = params?.id || body?.driverId || body?.actor?.id || body?.userId;
  const vehicleId = params?.vehicleId || body?.vehicleId;
  if (!driverId) return { module: 'drivers', action: 'set-active-vehicle', error: 'driverId is required' };
  if (!vehicleId) return { module: 'drivers', action: 'set-active-vehicle', error: 'vehicleId is required' };
  if (!canManageDriver(body?.actor, driverId)) return { module: 'drivers', action: 'set-active-vehicle', error: 'forbidden' };
  const profile = getProfile(driverId);
  if (!profile) return { module: 'drivers', action: 'set-active-vehicle', error: 'driver not found' };
  const vehicle = store.vehicles.get(vehicleId);
  if (!vehicle || vehicle.driverId !== driverId) return { module: 'drivers', action: 'set-active-vehicle', error: 'vehicle not found' };
  if (vehicle.status === 'pending_verification' || vehicle.status === 'rejected') {
    return { module: 'drivers', action: 'set-active-vehicle', error: 'vehicle not verified' };
  }

  getDriverVehicles(driverId).forEach(existing => {
    if (existing.vehicleId !== vehicleId && existing.status === 'active') {
      existing.status = 'inactive';
      store.vehicles.set(existing.vehicleId, existing);
    }
  });
  vehicle.status = 'active';
  store.vehicles.set(vehicle.vehicleId, vehicle);
  profile.primaryVehicleId = vehicle.vehicleId;
  markStoreDirty();
  return { module: 'drivers', action: 'set-active-vehicle', ok: true, vehicle, vehicles: getDriverVehicles(driverId) };
}

export async function getVehicleProfile(body: any, _params?: any, _query?: any) {
  const driverId = body?.actor?.id || body?.driverId || body?.userId;
  if (!driverId) return { module: 'drivers', action: 'get-vehicle-profile', error: 'driverId is required' };
  const profile = getProfile(driverId);
  if (!profile) return { module: 'drivers', action: 'get-vehicle-profile', error: 'driver not found' };
  return { module: 'drivers', action: 'get-vehicle-profile', ok: true, vehicle: buildDriverVehicleProfile(driverId) };
}

export async function saveVehicleProfile(body: any, _params?: any, _query?: any) {
  const driverId = body?.actor?.id || body?.driverId || body?.userId;
  if (!driverId) return { module: 'drivers', action: 'save-vehicle-profile', error: 'driverId is required' };
  const profile = getProfile(driverId);
  if (!profile) return { module: 'drivers', action: 'save-vehicle-profile', error: 'driver not found' };

  const existing = profile.vehicle;
  const normalized = sanitizeDriverVehicleProfile({
    ...body,
    photoUrl: body?.photoUrl || existing?.photoUrl
  }, existing?.plateNumber);
  if (!normalized) {
    return { module: 'drivers', action: 'save-vehicle-profile', error: 'make, model, year, color, plateNumber, and valid type are required' };
  }

  profile.vehicle = normalized;
  markStoreDirty();
  return { module: 'drivers', action: 'save-vehicle-profile', ok: true, vehicle: normalized };
}

export async function uploadVehiclePhoto(body: any, _params?: any, _query?: any) {
  const driverId = body?.actor?.id || body?.driverId || body?.userId;
  if (!driverId) return { module: 'drivers', action: 'upload-vehicle-photo', error: 'driverId is required' };
  const profile = getProfile(driverId);
  if (!profile) return { module: 'drivers', action: 'upload-vehicle-photo', error: 'driver not found' };
  const file = body?.file;
  if (!file?.buffer || !file?.mimetype) {
    return { module: 'drivers', action: 'upload-vehicle-photo', error: 'photo file is required' };
  }
  const extension = VEHICLE_PHOTO_MIME_TO_EXTENSION[String(file.mimetype || '').toLowerCase()];
  if (!extension) {
    return { module: 'drivers', action: 'upload-vehicle-photo', error: 'photo must be an image' };
  }

  const fileName = `photo.${extension}`;
  const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'vehicles', driverId);
  mkdirSync(uploadDir, { recursive: true });
  writeFileSync(path.join(uploadDir, fileName), file.buffer);
  const photoUrl = `/uploads/vehicles/${encodeURIComponent(driverId)}/${fileName}`;

  if (profile.vehicle) {
    profile.vehicle = {
      ...profile.vehicle,
      photoUrl,
      lastUpdated: timestamp()
    };
  }

  markStoreDirty();
  return { module: 'drivers', action: 'upload-vehicle-photo', ok: true, photoUrl };
}

export async function register(body: any, _params?: any, _query?: any) {
  const result: any = await authService.signup({ ...body, role: 'driver' });
  if (!result?.ok || !result?.user?.id) return result;
  const profile = getOrCreateProfile(result.user.id, 'driver');
  return { ...result, profile };
}

export async function availability(body: any, _params?: any, _query?: any) {
  const userId = body?.actor?.id || body?.userId;
  const profile = getProfile(userId);
  if (!profile) return { module: 'drivers', action: 'availability', error: 'driver not found' };
  syncProfileState(profile);
  const rawState = body?.status;
  let requestedState: 'offline' | 'online' | 'unavailable' | null = null;
  if (rawState === 'offline' || rawState === 'online' || rawState === 'unavailable') {
    requestedState = rawState;
  } else if (body?.available === true) {
    requestedState = 'online';
  } else if (body?.available === false) {
    requestedState = 'offline';
  }
  if (!requestedState) {
    return {
      module: 'drivers',
      action: 'availability',
      error: 'status must be one of offline, online, unavailable for this endpoint (or use available: true/false)'
    };
  }
  const result = setAvailability(profile, requestedState);
  if ('error' in result) return { module: 'drivers', action: 'availability', error: result.error };
  markStoreDirty();
  publishDriverStatusChanged(userId);
  return { module: 'drivers', action: 'availability', ok: true, profile };
}

export async function availabilityById(body: any, params?: any, query?: any) {
  const driverId = params?.id || body?.userId;
  if (!driverId) return { module: 'drivers', action: 'availability', error: 'driverId is required' };
  if (!canManageDriver(body?.actor, driverId)) return { module: 'drivers', action: 'availability', error: 'forbidden' };
  return availability({ ...body, userId: driverId }, params, query);
}

export async function location(body: any, _params?: any, _query?: any) {
  const userId = body?.actor?.id || body?.userId;
  const profile = getProfile(userId);
  if (!profile) return { module: 'drivers', action: 'location', error: 'driver not found' };
  const lat = Number(body?.lat);
  const lng = Number(body?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return { module: 'drivers', action: 'location', error: 'lat and lng must be valid finite numbers' };
  const updatedAt = timestamp();
  profile.lat = lat;
  profile.lng = lng;
  profile.lastLocationUpdatedAt = updatedAt;
  const accuracy = Number(body?.accuracy);
  const heading = Number(body?.heading);
  const speed = Number(body?.speed);
  store.locationHistory.push({
    driverId: userId,
    lat,
    lng,
    accuracy: Number.isFinite(accuracy) ? accuracy : undefined,
    heading: Number.isFinite(heading) ? heading : undefined,
    speed: Number.isFinite(speed) ? speed : undefined,
    timestamp: updatedAt
  });
  if (store.locationHistory.length > LOCATION_HISTORY_LIMIT) {
    store.locationHistory.splice(0, store.locationHistory.length - LOCATION_HISTORY_LIMIT);
  }
  markStoreDirty();
  publishDriverRealtimeLocation(userId);
  return { module: 'drivers', action: 'location', ok: true, profile };
}

export async function locationById(body: any, params?: any, query?: any) {
  const driverId = params?.id || body?.userId;
  if (!driverId) return { module: 'drivers', action: 'location', error: 'driverId is required' };
  if (!canManageDriver(body?.actor, driverId)) return { module: 'drivers', action: 'location', error: 'forbidden' };
  return location({ ...body, userId: driverId }, params, query);
}

export async function me(body: any, _params?: any, _query?: any) {
  const userId = body?.actor?.id || body?.userId;
  if (!userId) return { module: 'drivers', action: 'me', error: 'actor ID or userId is required' };
  const profile = getOrCreateProfile(userId, body?.actor?.role);
  if (!profile) return { module: 'drivers', action: 'me', error: 'driver not found' };
  syncProfileState(profile);
  markStoreDirty();
  return { module: 'drivers', action: 'me', ok: true, profile };
}

export async function currentTrip(body: any, _params?: any, _query?: any) {
  const userId = body?.actor?.id || body?.userId;
  const profile = getProfile(userId);
  if (!profile) return { module: 'drivers', action: 'current-trip', error: 'driver not found' };
  if (profile.currentTripId) {
    const activeRide = store.rides.get(profile.currentTripId);
    if (activeRide && ['accepted', 'arrived_at_pickup', 'started'].includes(activeRide.status)) {
      return { module: 'drivers', action: 'current-trip', ok: true, ride: activeRide };
    }
  }
  const ride = Array.from(store.rides.values())
    .filter(candidate => candidate.driverId === userId && ['accepted', 'arrived_at_pickup', 'started'].includes(candidate.status))
    .sort((left, right) => (right.updatedAt > left.updatedAt ? 1 : -1))[0] || null;
  if (ride) profile.currentTripId = ride.id;
  return { module: 'drivers', action: 'current-trip', ok: true, ride };
}

export async function earnings(body: any, _params?: any, _query?: any) {
  const userId = body?.actor?.id || body?.userId;
  if (!userId) return { module: 'drivers', action: 'earnings', error: 'actor ID or userId is required' };
  const profile = getOrCreateProfile(userId, body?.actor?.role);
  if (!profile) return { module: 'drivers', action: 'earnings', error: 'driver not found' };
  const txs = store.walletTx.filter(tx => tx.userId === userId && tx.kind === 'credit');
  const total = txs.reduce((sum, tx) => sum + tx.amountCents, 0);
  profile.earningsCents = total;
  markStoreDirty();
  const rideTxs = txs.filter(tx => tx.reason.startsWith('ride:') && tx.reason.endsWith(':payout'));
  const rideEarnings = rideTxs.map(tx => {
    const rideId = tx.reason.split(':')[1];
    return { rideId, amountCents: tx.amountCents, createdAt: tx.createdAt };
  });
  return {
    module: 'drivers',
    action: 'earnings',
    ok: true,
    earningsCents: total,
    rideCount: rideEarnings.length,
    rideEarnings
  };
}

export async function sendPayoutConfirmation(body: {
  userId?: string;
  amountCents?: number;
  bankLast4?: string;
  payoutId?: string;
}) {
  const userId = body?.userId;
  if (!userId) return { module: 'drivers', action: 'payout-confirmation', error: 'userId is required' };
  const user = store.users.get(userId);
  if (!user?.email) return { module: 'drivers', action: 'payout-confirmation', ok: true, skipped: true };

  const template = emailTemplates.DRIVER_PAYOUT_CONFIRMATION({
    amount: Number(body?.amountCents || 0),
    bankLast4: body?.bankLast4 || 'N/A',
    statementLink: `${env.appBaseUrl || 'https://app.drive.com'}/wallet/payouts/${body?.payoutId || ''}`
  });
  await sendEmail(user.email, template.subject, template.html, { template: 'driver_payout_confirmation', userId });
  return { module: 'drivers', action: 'payout-confirmation', ok: true };
}

export async function nearby(body: any, _params?: any, query?: any) {
  const lat = Number(query?.lat ?? body?.lat);
  const lng = Number(query?.lng ?? body?.lng);
  const radiusMiles = Math.max(0.1, Math.min(100, Number(query?.radiusMiles ?? body?.radiusMiles ?? 10)));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { module: 'drivers', action: 'nearby', error: 'lat and lng query parameters are required' };
  }
  const ranked = rankDrivers(await findNearbyDrivers(lat, lng));
  const drivers = ranked.filter(driver => driver.distanceMiles <= radiusMiles);
  return {
    module: 'drivers',
    action: 'nearby',
    ok: true,
    drivers,
    meta: {
      lat,
      lng,
      radiusMiles,
      count: drivers.length
    }
  };
}

export async function documents(body: any, _params?: any, _query?: any) {
  const userId = body?.actor?.id || body?.userId;
  const profile = getProfile(userId);
  if (!profile) return { module: 'drivers', action: 'documents', error: 'driver not found' };
  ensureVerificationData(profile);
  const docs = Array.isArray(body?.documents) ? body.documents as DriverDocumentInput[] : [];
  const now = timestamp();

  docs.forEach((documentInput, index) => {
    const parsed = typeof documentInput === 'string' ? parseLegacyDocument(documentInput) : {
      id: documentInput?.id,
      type: normalizeDocumentType(documentInput?.type),
      fileName: documentInput?.fileName || `driver-document-${index + 1}.jpg`,
      expiryDate: documentInput?.expiryDate || undefined,
      documentNumber: documentInput?.documentNumber || undefined,
      extractedText: documentInput?.extractedText || undefined,
      selfieMatchScore: documentInput?.selfieMatchScore
    };

    const verificationDocument: DriverVerificationDocument = {
      id: parsed.id || randomUUID(),
      type: parsed.type,
      fileName: parsed.fileName,
      expiryDate: parsed.expiryDate,
      uploadedAt: now,
      verificationStatus: 'pending_review'
    };

    if (parsed.type === LICENSE_DOCUMENT_TYPE) {
      verificationDocument.ocrText = buildLicenseOcrText(userId, parsed);
      verificationDocument.extractedFields = {
        fullName: store.users.get(userId)?.email?.split('@')[0] || userId,
        licenseNumber: parsed.documentNumber || buildFallbackLicenseNumber(userId),
        expiryDate: parsed.expiryDate
      };
    }

    if (parsed.type === SELFIE_DOCUMENT_TYPE) {
      const selfie = scoreSelfieVerification(parsed.selfieMatchScore);
      profile.selfieVerification = {
        status: selfie.status,
        score: Number(selfie.score.toFixed(2)),
        fileName: parsed.fileName,
        checkedAt: now
      };
      verificationDocument.verificationStatus = selfie.status === 'matched' ? 'auto_verified' : 'pending_review';
    }

    const existingIndex = profile.verificationDocuments!.findIndex(existingDocument => {
      if (verificationDocument.type === SELFIE_DOCUMENT_TYPE) {
        return existingDocument.type === SELFIE_DOCUMENT_TYPE;
      }
      return existingDocument.type === verificationDocument.type && existingDocument.fileName === verificationDocument.fileName;
    });

    if (existingIndex >= 0) profile.verificationDocuments!.splice(existingIndex, 1);
    profile.verificationDocuments!.unshift(verificationDocument);
  });

  if (docs.length) {
    profile.verificationReview = {
      status: 'pending_review',
      notes: profile.verificationReview?.status === 'rejected' ? 'Driver resubmitted verification documents for another review.' : profile.verificationReview?.notes
    };
  }

  serializeDocuments(profile);
  syncProfileState(profile);
  markStoreDirty();
  return { module: 'drivers', action: 'documents', ok: true, profile };
}
