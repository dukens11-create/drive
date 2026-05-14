import { z } from 'zod';

export const genericSchema = z.object({}).passthrough();

export const rideEstimateSchema = z.object({
  pickupLat: z.number().optional(),
  pickupLng: z.number().optional(),
  dropoffLat: z.number().optional(),
  dropoffLng: z.number().optional(),
  miles: z.number().optional(),
  minutes: z.number().optional()
}).passthrough();

export const authSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().optional(),
  password: z.string().min(6).optional()
}).passthrough();

export const refreshSchema = z.object({
  refreshToken: z.string().min(20)
});
