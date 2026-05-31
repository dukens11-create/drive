import { Router } from 'express';
import { z } from 'zod';
import * as controller from '../controllers/ml.controller';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import { validateBody } from '../utils/validate';

const surgePredictSchema = z.object({
  demand: z.number().nonnegative().optional(),
  availableDrivers: z.number().positive().optional(),
  weatherSeverity: z.number().min(0).max(1).optional(),
  specialEvent: z.boolean().optional(),
  area: z.string().max(120).optional()
}).passthrough();

const applySurgeSchema = z.object({
  multiplier: z.number().min(1).max(10),
  reason: z.string().max(200).optional()
});

const demandSchema = z.object({
  area: z.string().max(120).optional(),
  horizonHours: z.number().int().min(1).max(24).optional()
}).passthrough();

const churnSchema = z.object({
  userId: z.string().optional(),
  windowDays: z.number().int().min(1).max(365).optional()
}).passthrough();

const router = Router();
router.get('/health', controller.health);
router.use(requireAuth);
router.get('/surge/current', controller.getCurrentSurge);
router.post('/surge/predict', validateBody(surgePredictSchema), controller.predictSurge);
router.post('/surge/apply', requireRole('admin'), validateBody(applySurgeSchema), controller.applySurge);
router.post('/demand/predict', validateBody(demandSchema), controller.predictDemand);
router.get('/recommendations', controller.getRecommendations);
router.post('/churn/predict', validateBody(churnSchema), controller.predictChurn);
export default router;
