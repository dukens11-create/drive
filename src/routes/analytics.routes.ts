import { Router } from 'express';
import * as controller from '../controllers/analytics.controller';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import { validateBody } from '../utils/validate';
import { z } from 'zod';

const generic = z.object({}).passthrough();

const router = Router();
router.get('/health', controller.health);
router.use(requireAuth, requireRole('admin'));
router.get('/overview', controller.overview);
router.get('/kpis', controller.kpis);
router.get('/churn', controller.churn);
router.get('/drivers', controller.drivers);
router.get('/loyalty', controller.loyalty);
router.get('/revenue-trends', controller.revenueTrends);
router.get('/vehicle-breakdown', controller.vehicleBreakdown);
router.get('/driver-leaderboard', controller.driverLeaderboard);
router.get('/churn-risk', controller.churnRisk);
router.get('/geographic', controller.geographic);
router.get('/demand-forecast', controller.demandForecast);
router.post('/revenue', validateBody(generic), controller.revenue);
router.post('/rides', validateBody(generic), controller.rides);
router.post('/users', validateBody(generic), controller.users);
export default router;
