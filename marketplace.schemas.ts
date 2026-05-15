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

export const setSurgeSchema = z.object({
  multiplier: z.number().min(1.0).max(10.0),
  reason: z.string().optional()
}).passthrough();

export const createPromoSchema = z.object({
  code: z.string().min(3).max(32),
  discountType: z.enum(['flat', 'percent']),
  discountValue: z.number().positive(),
  minFareCents: z.number().positive().optional(),
  maxUsages: z.number().int().positive().optional(),
  expiresAt: z.string().datetime().optional()
}).passthrough();

export const registerReferralSchema = z.object({
  referralCode: z.string().min(1),
  referredUserId: z.string().optional()
}).passthrough();

export const createMarketSchema = z.object({
  name: z.string().min(1),
  city: z.string().min(1),
  country: z.string().min(1)
}).passthrough();

export const updateMarketStatusSchema = z.object({
  marketId: z.string().min(1),
  status: z.enum(['pre_launch', 'active', 'paused', 'sunset'])
}).passthrough();

