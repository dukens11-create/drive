import { Router } from 'express';
import * as controller from './drivers.controller';
import { validateBody } from './validate';
import { applySchema, availabilitySchema, documentsSchema, locationSchema } from './drivers.schemas';
import { requireAuth, requireRole } from './auth.middleware';

const router = Router();

router.get('/health', controller.health);
router.use(requireAuth);
router.use(requireRole('driver'));
router.get('/me', controller.me);
router.get('/current-trip', controller.currentTrip);
router.post('/apply', validateBody(applySchema), controller.apply);
router.post('/availability', validateBody(availabilitySchema), controller.availability);
router.post('/location', validateBody(locationSchema), controller.location);
router.post('/earnings', controller.earnings);
router.post('/documents', validateBody(documentsSchema), controller.documents);

export default router;
