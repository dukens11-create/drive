import { Router } from 'express';
import { z } from 'zod';
import * as controller from '../controllers/search.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { validateBody } from '../utils/validate';

const savedSearchSchema = z.object({
  name: z.string().trim().min(1).max(120),
  resource: z.enum(['drivers', 'rides']),
  filters: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()]).transform(value => String(value))).default({})
});

const router = Router();
router.get('/health', controller.health);
router.use(requireAuth);
router.get('/drivers', controller.drivers);
router.get('/rides', controller.rides);
router.post('/saved', validateBody(savedSearchSchema), controller.save);
router.get('/recent', controller.recent);

export default router;
