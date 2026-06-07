import { Router } from 'express';
import * as controller from '../controllers/auth.controller';
import { validateBody } from '../utils/validate';
import { loginSchema, passwordResetRequestSchema, refreshSchema, revokeSessionSchema, signupSchema } from '../schemas/auth.schemas';
import { requireAuth } from '../middleware/auth.middleware';
import { asyncHandler } from '../utils/async-handler';
import { z } from 'zod';

const forgotPasswordSchema = z.object({
  email: z.string().email()
});

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8)
});

const router = Router();

router.get('/health', controller.health);
router.post('/signup', validateBody(signupSchema), asyncHandler(controller.signup));
router.post('/login', validateBody(loginSchema), asyncHandler(controller.login));
router.post('/refresh', validateBody(refreshSchema), asyncHandler(controller.refresh));
router.post('/logout', validateBody(refreshSchema), asyncHandler(controller.logout));
router.post('/forgot-password', validateBody(forgotPasswordSchema), asyncHandler(controller.forgot_password));
router.post('/reset-password', validateBody(resetPasswordSchema), asyncHandler(controller.reset_password));
router.get('/sessions', requireAuth, asyncHandler(controller.sessions));
router.get('/login-history', requireAuth, asyncHandler(controller.login_history));
router.post('/revoke-session', requireAuth, validateBody(revokeSessionSchema), asyncHandler(controller.revoke_session));
router.post('/password-reset/request', validateBody(passwordResetRequestSchema), asyncHandler(controller.password_reset_request));

export default router;
