import { Router } from 'express';
import * as controller from '../controllers/admin.controller';
import { validateBody } from '../utils/validate';
import { genericSchema } from '../schemas/admin.schemas';
import { requireAuth, requireRole } from '../middleware/auth.middleware';

const router = Router();

router.get('/health', controller.health);
router.use(requireAuth, requireRole('admin'));
router.post('/drivers-pending', validateBody(genericSchema), controller.drivers_pending);
router.post('/approve-driver', validateBody(genericSchema), controller.approve_driver);
router.post('/live-rides', validateBody(genericSchema), controller.live_rides);
router.post('/risk-alerts', validateBody(genericSchema), controller.risk_alerts);
router.post('/refunds', validateBody(genericSchema), controller.refunds);
router.get('/stats', controller.platform_stats);
router.get('/overview', controller.admin_overview);
router.post('/list-users', validateBody(genericSchema), controller.list_users);
router.post('/suspend-user', validateBody(genericSchema), controller.suspend_user);
router.post('/update-ticket', validateBody(genericSchema), controller.update_ticket);
router.post('/update-settings', validateBody(genericSchema), controller.update_settings);
router.post('/upsert-promo', validateBody(genericSchema), controller.upsert_promo);
router.post('/upsert-market', validateBody(genericSchema), controller.upsert_market);
router.post('/create-api-key', validateBody(genericSchema), controller.create_api_key);
router.post('/revoke-api-key', validateBody(genericSchema), controller.revoke_api_key);
router.get('/audit-log', controller.audit_log);

export default router;
