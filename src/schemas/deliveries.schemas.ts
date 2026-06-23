import { z } from 'zod';

const packageSizeSchema = z.enum(['small', 'medium', 'large']).optional();

export const deliveryEstimateSchema = z.object({
  pickupAddress: z.string().trim().min(1).optional(),
  dropoffAddress: z.string().trim().min(1).optional(),
  packageSize: packageSizeSchema,
  packageWeight: z.number().min(0).optional(),
  pickupLat: z.number().optional(),
  pickupLng: z.number().optional(),
  dropoffLat: z.number().optional(),
  dropoffLng: z.number().optional()
}).passthrough();

export const deliveryCreateSchema = z.object({
  pickupAddress: z.string().trim().min(1),
  dropoffAddress: z.string().trim().min(1),
  recipientName: z.string().trim().min(1),
  recipientPhone: z.string().trim().min(1),
  packageSize: packageSizeSchema,
  packageWeight: z.number().min(0).optional(),
  packageDescription: z.string().trim().max(500).optional(),
  pickupLat: z.number().optional(),
  pickupLng: z.number().optional(),
  dropoffLat: z.number().optional(),
  dropoffLng: z.number().optional(),
  senderName: z.string().trim().min(1).optional(),
  senderPhone: z.string().trim().min(1).optional(),
  deliveryFee: z.number().min(0).optional()
}).passthrough();

