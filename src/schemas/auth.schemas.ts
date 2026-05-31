import { z } from 'zod';

export const rideEstimateSchema = z.object({
  pickupLat: z.number().optional(),
  pickupLng: z.number().optional(),
  dropoffLat: z.number().optional(),
  dropoffLng: z.number().optional(),
  miles: z.number().optional(),
  minutes: z.number().optional()
}).passthrough();

export const signupSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().optional(),
  password: z
    .string()
    .min(12, 'password must be at least 12 characters long')
    .regex(/[a-z]/, 'password must include a lowercase letter')
    .regex(/[A-Z]/, 'password must include an uppercase letter')
    .regex(/[0-9]/, 'password must include a number')
    .regex(/[^A-Za-z0-9]/, 'password must include a symbol')
}).passthrough();

export const loginSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().optional(),
  password: z.string().min(1).optional(),
  otpToken: z.string().min(6).optional()
}).passthrough();

export const refreshSchema = z.object({
  refreshToken: z.string().min(20)
});

export const revokeSessionSchema = z.object({
  sessionId: z.string().min(1)
}).passthrough();
