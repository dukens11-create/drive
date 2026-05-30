import { Router } from 'express';
import * as controller from './corporate.controller';
import { requireAuth, requireRole } from './auth.middleware';
import { validateBody } from './validate';
import { z } from 'zod';

const generic = z.object({}).passthrough();

const router = Router();
router.get('/health', controller.health);
router.use(requireAuth);
router.post('/accounts', requireRole('admin'), validateBody(generic), controller.create);
router.get('/accounts', requireRole('admin'), controller.list);
router.get('/accounts/:id', controller.get);
router.get('/accounts/:id/invoice', controller.invoice);
router.post('/accounts/:id/employees', requireRole('admin'), validateBody(generic), controller.addEmployee);
router.delete('/accounts/:id/employees', requireRole('admin'), validateBody(generic), controller.removeEmployee);
router.post('/tag-ride', validateBody(generic), controller.tagRide);
export default router;
