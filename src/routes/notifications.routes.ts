import { Router } from 'express';
import { z } from 'zod';
import * as controller from '../controllers/notifications.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { validateBody } from '../utils/validate';

const preferencesSchema = z.object({
  emailOptIn: z.boolean().optional(),
  smsOptIn: z.boolean().optional(),
  pushOptIn: z.boolean().optional(),
  frequency: z.enum(['instant', 'hourly', 'daily', 'weekly']).optional(),
  categories: z.array(z.string().min(1)).optional(),
  timezone: z.string().min(1).max(120).optional(),
  quietHours: z.object({
    enabled: z.boolean(),
    start: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
    end: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/)
  }).optional()
});

const deviceTokenSchema = z.object({
  token: z.string().min(1),
  platform: z.enum(['ios', 'android', 'web']).optional(),
  topics: z.array(z.string().min(1)).optional()
});

const pushSchema = z.object({
  userId: z.string().optional(),
  deviceToken: z.string().optional(),
  topic: z.string().optional(),
  category: z.enum(['new_rides', 'trip_updates', 'earnings', 'bonuses', 'support_replies', 'system']).optional(),
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(1000)
}).refine(value => !!value.userId || !!value.deviceToken || !!value.topic, {
  message: 'userId, deviceToken, or topic is required'
});

const emailSchema = z.object({
  userId: z.string().optional(),
  email: z.string().email().optional(),
  template: z.string().min(1).max(100).optional(),
  subject: z.string().min(1).max(200),
  html: z.string().min(1).max(20000)
}).refine(value => !!value.userId || !!value.email, {
  message: 'userId or email is required'
});

const smsSchema = z.object({
  userId: z.string().optional(),
  phone: z.string().min(3).optional(),
  template: z.string().min(1).max(100).optional(),
  message: z.string().min(1).max(1000)
}).refine(value => !!value.userId || !!value.phone, {
  message: 'userId or phone is required'
});

const router = Router();
router.get('/health', controller.health);
router.use(requireAuth);
router.get('/preferences', controller.getPreferences);
router.post('/preferences', validateBody(preferencesSchema), controller.updatePreferences);
router.post('/device-tokens', validateBody(deviceTokenSchema), controller.registerDeviceToken);
router.get('/logs', controller.listLogs);
router.post('/push', validateBody(pushSchema), controller.sendPush);
router.post('/email', validateBody(emailSchema), controller.sendEmail);
router.post('/sms', validateBody(smsSchema), controller.sendSms);
export default router;
