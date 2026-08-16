import { Router } from 'express';
import * as controller from '../controllers/deliveries.controller';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import { validateBody } from '../utils/validate';
import { deliveryCreateSchema, deliveryEstimateSchema, deliveryStatusSchema } from '../schemas/deliveries.schemas';

const router = Router();
router.get('/health', controller.health);
router.use(requireAuth);
router.post('/estimate', requireRole('rider'), validateBody(deliveryEstimateSchema), controller.estimate);
router.post('/', requireRole('rider'), validateBody(deliveryCreateSchema), controller.create);
router.get('/available', requireRole('driver'), controller.available);
router.get('/:id', requireRole('rider', 'driver', 'admin'), controller.detail);
router.patch('/:id/accept', requireRole('driver'), controller.accept);
router.patch('/:id/status', requireRole('driver', 'rider', 'admin'), validateBody(deliveryStatusSchema), controller.updateStatus);

export default router;
