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

export const rideDriverCancelSchema = z.object({
  rideId: z.string().min(1),
  reason: z.string().trim().max(200).optional()
}).passthrough();

export const rideRateSchema = z.object({
  rideId: z.string().min(1),
  rating: z.number().min(1).max(5),
  review: z.string().trim().max(280).optional()
}).passthrough();

export const ridePassengerRateSchema = z.object({
  rideId: z.string().min(1),
  rating: z.number().min(1).max(5),
  comment: z.string().trim().max(280).optional()
}).passthrough();

export const rideMessageSchema = z.object({
  rideId: z.string().min(1),
  message: z.string().trim().min(1).max(500)
}).passthrough();

export const rideLookupSchema = z.object({
  rideId: z.string().min(1)
}).passthrough();

export const rideHistorySchema = z.object({
  limit: z.number().int().min(1).max(100).optional(),
  status: z.enum(['requested', 'accepted', 'started', 'completed', 'canceled']).optional()
}).passthrough();

export const rideNotificationsSchema = z.object({
  rideId: z.string().min(1).optional(),
  limit: z.number().int().min(1).max(100).optional()
}).passthrough();
