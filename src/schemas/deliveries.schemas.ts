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
  senderName: z.string().trim().min(1).optional(),
  senderPhone: z.string().trim().min(1).optional(),
  pickupLat: z.number().optional(),
  pickupLng: z.number().optional(),
  dropoffLat: z.number().optional(),
  dropoffLng: z.number().optional(),
  packageType: z.string().trim().min(1).optional(),
  packageSize: packageSizeSchema,
  packageWeight: z.number().min(0).optional(),
  deliveryFee: z.number().nonnegative().optional(),
  packageDescription: z.string().trim().max(500).optional()
}).passthrough();

export const deliveryStatusSchema = z.object({
  status: z.enum(['accepted', 'picked_up', 'in_transit', 'delivered', 'cancelled']),
  pickupPhotoUrl: z.string().trim().min(1).optional(),
  dropoffPhotoUrl: z.string().trim().min(1).optional(),
  recipientSignature: z.string().trim().min(1).optional(),
  recipientPinCode: z.string().trim().min(1).optional(),
  cancellationReason: z.string().trim().max(200).optional()
}).passthrough();
