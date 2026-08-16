import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import { validateBody } from '../utils/validate';
import { z } from 'zod';
import * as controller from '../controllers/promos.controller';

const router = Router();

const validateSchema = z.object({
  code: z.string().trim().min(1).max(40),
  rideType: z.string().optional(),
  fare: z.number().positive()
}).passthrough();

router.use(requireAuth, requireRole('rider'));
router.post('/validate', validateBody(validateSchema), controller.validate);

export default router;