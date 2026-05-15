import { z } from 'zod';

export const applySchema = z.object({
  lat: z.number().optional(),
  lng: z.number().optional()
}).passthrough();

export const availabilitySchema = z.object({
  available: z.boolean().optional(),
  status: z.enum(['offline', 'online', 'unavailable']).optional()
}).passthrough().refine(body => {
  const hasValidStatus = body.status === 'offline' || body.status === 'online' || body.status === 'unavailable';
  return typeof body.available === 'boolean' || hasValidStatus;
}, {
  message: 'either available (boolean) or status (string) must be provided'
});

export const locationSchema = z.object({
  lat: z.number(),
  lng: z.number()
}).passthrough();

export const documentsSchema = z.object({
  documents: z.array(z.string().min(1)).min(1)
}).passthrough();
