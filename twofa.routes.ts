import { Router } from 'express';
import * as controller from './twofa.controller';
import { requireAuth } from './auth.middleware';
import { validateBody } from './validate';
import { z } from 'zod';

const generic = z.object({}).passthrough();
const tokenSchema = z.object({ token: z.string() }).passthrough();
const smsSchema = z.object({ phone: z.string() }).passthrough();

const router = Router();
router.get('/health', controller.health);
// SMS OTP does not require auth (used during login)
router.post('/sms-otp/send', validateBody(smsSchema), controller.sendSmsOtp);
router.post('/sms-otp/verify', validateBody(generic), controller.verifySmsOtp);
router.use(requireAuth);
router.post('/setup', validateBody(generic), controller.setup);
router.post('/verify', validateBody(tokenSchema), controller.verify);
router.post('/disable', validateBody(tokenSchema), controller.disable);
router.post('/validate', validateBody(generic), controller.validate);
router.post('/status', validateBody(generic), controller.status);
export default router;
