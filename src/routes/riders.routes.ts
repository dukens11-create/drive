import { Router } from 'express';
import * as controller from '../controllers/riders.controller';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import { validateBody } from '../utils/validate';
import { locationSchema } from '../schemas/drivers.schemas';
import { signupSchema } from '../schemas/auth.schemas';
import { z } from 'zod';

const router = Router();
const placeSchema = z.object({
  id: z.string().trim().min(1),
  type: z.enum(['home', 'work', 'favorite']),
  label: z.string().trim().min(1),
  address: z.string().trim().min(1),
  coordinates: z.object({
    lat: z.number().finite(),
    lng: z.number().finite()
  }).optional(),
  notes: z.string().optional(),
  createdAt: z.string().optional(),
  lastUsed: z.string().optional()
});
const placesSchema = z.object({
  places: z.array(placeSchema).max(10)
}).passthrough();

router.get('/health', controller.health);
router.post('/register', validateBody(signupSchema), controller.register);
router.use(requireAuth);
router.use(requireRole('rider'));
router.get('/me', controller.me);
router.get('/profile', controller.profile);
router.put('/profile', controller.update_profile);
router.get('/places', controller.get_places);
router.put('/places', validateBody(placesSchema), controller.update_places);
router.post('/location', validateBody(locationSchema), controller.location);
router.get('/trips', controller.riderTrips);
router.get('/trips/:rideId/receipt', controller.riderTripReceipt);

export default router;
