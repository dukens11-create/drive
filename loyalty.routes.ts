import { Router } from 'express';
import * as controller from './loyalty.controller';
import { requireAuth, requireRole } from './auth.middleware';
import { validateBody } from './validate';
import { z } from 'zod';

const generic = z.object({}).passthrough();
const redeemSchema = z.object({ points: z.number().positive() }).passthrough();

const router = Router();
router.get('/health', controller.health);
router.use(requireAuth);
router.get('/mine', controller.getAccount);
router.get('/transactions', controller.history);
router.post('/redeem', validateBody(redeemSchema), controller.redeem);
router.post('/award', requireRole('admin'), validateBody(generic), controller.award);
export default router;
