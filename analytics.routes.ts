import { Router } from 'express';
import * as controller from './analytics.controller';
import { requireAuth, requireRole } from './auth.middleware';
import { validateBody } from './validate';
import { z } from 'zod';

const generic = z.object({}).passthrough();

const router = Router();
router.get('/health', controller.health);
router.use(requireAuth, requireRole('admin'));
router.get('/overview', controller.overview);
router.get('/kpis', controller.kpis);
router.get('/churn', controller.churn);
router.get('/drivers', controller.drivers);
router.get('/loyalty', controller.loyalty);
router.post('/revenue', validateBody(generic), controller.revenue);
router.post('/rides', validateBody(generic), controller.rides);
router.post('/users', validateBody(generic), controller.users);
export default router;
