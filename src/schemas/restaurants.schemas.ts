import { z } from 'zod';

export const restaurantRegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1)
});

export const restaurantLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export const restaurantProfileSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().min(5).optional(),
  cuisine: z.string().min(1).optional(),
  city: z.string().min(1).optional(),
  address: z.string().min(1).optional(),
  description: z.string().optional(),
  featured: z.boolean().optional(),
  location: z.object({ lat: z.number(), lng: z.number() }).optional()
}).passthrough();

export const menuCategorySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional()
});

export const menuItemSchema = z.object({
  name: z.string().min(1),
  priceCents: z.number().int().nonnegative(),
  categoryId: z.string().optional(),
  description: z.string().optional()
}).passthrough();

export const foodOrderSchema = z.object({
  restaurantId: z.string().min(1),
  userId: z.string().min(1),
  items: z.array(
    z.object({ itemId: z.string().min(1), quantity: z.number().int().positive().default(1) }).passthrough()
  ).min(1)
}).passthrough();

export const genericPassthroughSchema = z.object({}).passthrough();
