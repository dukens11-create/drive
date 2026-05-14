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

export const rideRequestSchema = z.object({
  pickupLat: z.number().optional(),
  pickupLng: z.number().optional(),
  dropoffLat: z.number().optional(),
  dropoffLng: z.number().optional(),
  miles: z.number().optional(),
  minutes: z.number().optional()
}).passthrough();

export const rideAcceptSchema = z.object({
  rideId: z.string().min(1)
}).passthrough();

export const rideStartCompleteCancelSchema = z.object({
  rideId: z.string().min(1)
}).passthrough();

export const rideRateSchema = z.object({
  rideId: z.string().min(1),
  rating: z.number().min(1).max(5)
}).passthrough();
