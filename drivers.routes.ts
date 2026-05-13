import { Router } from 'express';
import * as controller from './drivers.controller';
import { validateBody } from './validate';
import { genericSchema } from './drivers.schemas';
import { requireAuth } from './auth.middleware';

const router = Router();

router.get('/health', controller.health);
router.use(requireAuth);
router.post('/apply', validateBody(genericSchema), controller.apply);
router.post('/availability', validateBody(genericSchema), controller.availability);
router.post('/location', validateBody(genericSchema), controller.location);
router.post('/earnings', validateBody(genericSchema), controller.earnings);
router.post('/documents', validateBody(genericSchema), controller.documents);

export default router;
