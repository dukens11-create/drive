import { Router } from 'express';
import * as controller from './marketplace.controller';
import { validateBody } from './validate';
import { genericSchema } from './marketplace.schemas';
const router = Router();
router.get('/health', controller.health);
router.post('/same-day-dispatch', validateBody(genericSchema), controller.same_day_dispatch);
router.post('/delivery-options', validateBody(genericSchema), controller.delivery_options);
export default router;
