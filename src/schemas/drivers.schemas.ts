import { z } from 'zod';

export const applySchema = z.object({
  lat: z.number().optional(),
  lng: z.number().optional()
}).passthrough();

export const availabilitySchema = z.object({
  available: z.boolean().optional(),
  status: z.enum(['offline', 'online', 'unavailable']).optional()
}).passthrough().refine(body => {
  return typeof body.available === 'boolean' || body.status !== undefined;
}, {
  message: 'either available (boolean) or status (string) must be provided'
});

export const locationSchema = z.object({
  lat: z.number(),
  lng: z.number()
}).passthrough();

const driverDocumentSchema = z.object({
  id: z.string().min(1).optional(),
  type: z.string().min(1),
  fileName: z.string().min(1),
  expiryDate: z.string().min(1).optional(),
  documentNumber: z.string().min(1).optional(),
  extractedText: z.string().min(1).optional(),
  selfieMatchScore: z.number().min(0).max(1).optional()
}).passthrough();

export const documentsSchema = z.object({
  documents: z.array(z.union([z.string().min(1), driverDocumentSchema])).min(1)
}).passthrough();

export const vehicleCreateSchema = z.object({
  make: z.string().min(1),
  model: z.string().min(1),
  year: z.number().int().min(1980).max(2100),
  licensePlate: z.string().min(1),
  color: z.string().min(1),
  seats: z.number().int().min(1).max(12),
  vehicleType: z.enum(['economy', 'comfort', 'premium', 'xl']),
  insuranceExpiry: z.string().min(1),
  registrationExpiry: z.string().min(1),
  status: z.enum(['active', 'inactive', 'pending_verification', 'rejected']).optional(),
  verificationDocuments: z.array(z.string()).optional()
}).passthrough();

export const vehicleProfileSchema = z.object({
  make: z.string().min(1),
  model: z.string().min(1),
  year: z.number().int().min(1990).max(2099),
  color: z.string().min(1),
  plateNumber: z.string().min(1).max(10),
  type: z.enum(['sedan', 'suv', 'minivan', 'truck', 'hybrid']),
  photoUrl: z.string().min(1).optional()
}).passthrough();
