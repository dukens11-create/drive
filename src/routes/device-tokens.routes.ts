import { Router } from 'express';
import { z } from 'zod';
import * as controller from '../controllers/notifications.controller';
import { validateBody } from '../utils/validate';

const deviceTokenSchema = z.object({
  token: z.string().min(1),
  platform: z.enum(['ios', 'android', 'web']).optional(),
  topics: z.array(z.string().min(1)).optional()
});

const unregisterSchema = z.object({
  token: z.string().min(1).optional()
});

const router = Router();
router.get('/', controller.listDeviceTokens);
router.post('/', validateBody(deviceTokenSchema), controller.registerDeviceToken);
router.delete('/:deviceTokenId', controller.unregisterDeviceToken);
router.delete('/', validateBody(unregisterSchema), controller.unregisterDeviceToken);

export default router;
