import { z } from 'zod';

export const deliveryCreateSchema = z.object({
  senderName: z.string().trim().min(1),
  senderPhone: z.string().trim().min(1),
  pickupAddress: z.string().trim().min(1),
  pickupLat: z.number(),
  pickupLng: z.number(),
  recipientName: z.string().trim().min(1),
  recipientPhone: z.string().trim().min(1),
  dropoffAddress: z.string().trim().min(1),
  dropoffLat: z.number(),
  dropoffLng: z.number(),
  packageType: z.string().trim().min(1),
  packageSize: z.string().trim().min(1),
  packageWeight: z.number().positive(),
  deliveryFee: z.number().nonnegative()
}).passthrough();

export const deliveryStatusSchema = z.object({
  status: z.enum(['accepted', 'picked_up', 'in_transit', 'delivered', 'cancelled']),
  pickupPhotoUrl: z.string().trim().min(1).optional(),
  dropoffPhotoUrl: z.string().trim().min(1).optional(),
  recipientSignature: z.string().trim().min(1).optional(),
  recipientPinCode: z.string().trim().min(1).optional(),
  cancellationReason: z.string().trim().max(200).optional()
}).passthrough();

