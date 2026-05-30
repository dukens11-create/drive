import { Router } from 'express';
import * as controller from './carpool.controller';
import { requireAuth } from './auth.middleware';
import { validateBody } from './validate';
import { z } from 'zod';

const generic = z.object({}).passthrough();

const router = Router();
router.get('/health', controller.health);
router.use(requireAuth);
router.post('/rides', validateBody(generic), controller.create);
router.get('/rides/available', controller.list);
router.get('/rides/:id', controller.get);
router.post('/rides/:id/join', validateBody(generic), controller.join);
router.post('/rides/:id/leave', validateBody(generic), controller.leave);
export default router;
