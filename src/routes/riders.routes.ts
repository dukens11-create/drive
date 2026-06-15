import { Router } from 'express';
import * as controller from '../controllers/riders.controller';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import { validateBody } from '../utils/validate';
import { locationSchema } from '../schemas/drivers.schemas';
import { signupSchema } from '../schemas/auth.schemas';
import { z } from 'zod';

const router = Router();
const placesSchema = z.object({
  places: z.array(z.object({}).passthrough()).max(10)
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

export default router;
