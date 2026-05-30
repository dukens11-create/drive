import { Router } from 'express';
import * as controller from './scheduled.controller';
import { requireAuth } from './auth.middleware';
import { validateBody } from './validate';
import { z } from 'zod';

const bookSchema = z.object({ scheduledAt: z.string() }).passthrough();
const generic = z.object({}).passthrough();

const router = Router();
router.get('/health', controller.health);
router.use(requireAuth);
router.post('/book', validateBody(bookSchema), controller.book);
router.get('/mine', controller.list);
router.post('/:id/cancel', controller.cancel);
router.get('/:id', controller.get);
export default router;
