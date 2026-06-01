import { Router } from 'express';
import * as controller from '../controllers/riders.controller';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import { validateBody } from '../utils/validate';
import { locationSchema } from '../schemas/drivers.schemas';
import { signupSchema } from '../schemas/auth.schemas';

const router = Router();

router.get('/health', controller.health);
router.post('/register', validateBody(signupSchema), controller.register);
router.use(requireAuth);
router.use(requireRole('rider'));
router.get('/me', controller.me);
router.post('/location', validateBody(locationSchema), controller.location);

export default router;
