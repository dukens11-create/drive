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
