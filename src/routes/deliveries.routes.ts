import { Router } from 'express';
import * as controller from '../controllers/deliveries.controller';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import { validateBody } from '../utils/validate';
import { deliveryCreateSchema, deliveryEstimateSchema } from '../schemas/deliveries.schemas';

const router = Router();
router.get('/health', controller.health);
router.use(requireAuth);
router.post('/estimate', requireRole('rider'), validateBody(deliveryEstimateSchema), controller.estimate);
router.post('/', requireRole('rider'), validateBody(deliveryCreateSchema), controller.create);

export default router;

