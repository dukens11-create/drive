import { Router } from 'express';
import * as controller from '../controllers/auth.controller';
import { validateBody } from '../utils/validate';
import { loginSchema, refreshSchema, revokeSessionSchema, signupSchema } from '../schemas/auth.schemas';
import { requireAuth } from '../middleware/auth.middleware';
import { asyncHandler } from '../utils/async-handler';

const router = Router();

router.get('/health', controller.health);
router.post('/signup', validateBody(signupSchema), asyncHandler(controller.signup));
router.post('/login', validateBody(loginSchema), asyncHandler(controller.login));
router.post('/refresh', validateBody(refreshSchema), asyncHandler(controller.refresh));
router.post('/logout', validateBody(refreshSchema), asyncHandler(controller.logout));
router.get('/sessions', requireAuth, asyncHandler(controller.sessions));
router.get('/login-history', requireAuth, asyncHandler(controller.login_history));
router.post('/revoke-session', requireAuth, validateBody(revokeSessionSchema), asyncHandler(controller.revoke_session));

export default router;
