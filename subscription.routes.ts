import { Router } from 'express';
import * as controller from './subscription.controller';
import { requireAuth } from './auth.middleware';
import { validateBody } from './validate';
import { z } from 'zod';

const subscribeSchema = z.object({ planId: z.string() }).passthrough();
const generic = z.object({}).passthrough();

const router = Router();
router.get('/health', controller.health);
router.get('/plans', controller.listPlans);
router.use(requireAuth);
router.get('/mine', controller.getMySubscription);
router.post('/subscribe', validateBody(subscribeSchema), controller.subscribe);
router.post('/cancel', validateBody(generic), controller.cancel);
export default router;
