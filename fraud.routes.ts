import { Router } from 'express';
import * as controller from './fraud.controller';
import { requireAuth, requireRole } from './auth.middleware';
import { validateBody } from './validate';
import { z } from 'zod';

const generic = z.object({}).passthrough();

const router = Router();
router.get('/health', controller.health);
router.use(requireAuth, requireRole('admin'));
router.get('/alerts', controller.listAlerts);
router.post('/alerts/:id/review', validateBody(generic), controller.review);
router.post('/check', validateBody(generic), controller.check);
export default router;
