import { Router } from 'express';
import * as controller from '../controllers/rides.controller';
import { validateBody } from '../utils/validate';
import {
  rideAcceptSchema,
  rideAcceptPathSchema,
  rideDriverCancelSchema,
  rideEstimateSchema,
  rideHistorySchema,
  rideLookupSchema,
  rideMessageSchema,
  rideNotificationsSchema,
  ridePassengerRateSchema,
  rideRatePathSchema,
  rideRateSchema,
  rideRequestSchema,
  rideStatusUpdateSchema,
  rideStartCompleteCancelSchema
} from '../schemas/rides.schemas';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
const router = Router();
router.get('/health', controller.health);
router.use(requireAuth);
router.post('/estimate', validateBody(rideEstimateSchema), controller.estimate);
router.get('/history', controller.history);
router.get('/:rideId', controller.detail);
router.post('/request', requireRole('rider'), validateBody(rideRequestSchema), controller.request);
router.post('/:rideId/accept', requireRole('driver'), validateBody(rideAcceptPathSchema), controller.accept);
router.put('/:rideId/status', requireRole('driver', 'rider', 'admin'), validateBody(rideStatusUpdateSchema), controller.updateStatus);
router.post('/:rideId/rate', requireRole('driver', 'rider'), validateBody(rideRatePathSchema), controller.submitRating);
router.post('/history', requireRole('rider'), validateBody(rideHistorySchema), controller.history);
router.post('/detail', requireRole('rider'), validateBody(rideLookupSchema), controller.detail);
router.post('/receipt', requireRole('rider'), validateBody(rideLookupSchema), controller.receipt);
router.post('/notifications', requireRole('rider'), validateBody(rideNotificationsSchema), controller.notifications);
router.post('/accept', requireRole('driver'), validateBody(rideAcceptSchema), controller.accept);
router.post('/arrive', requireRole('driver'), validateBody(rideStartCompleteCancelSchema), controller.arrive);
router.post('/start', requireRole('driver'), validateBody(rideStartCompleteCancelSchema), controller.start);
router.post('/complete', requireRole('driver'), validateBody(rideStartCompleteCancelSchema), controller.complete);
router.post('/no-show', requireRole('driver'), validateBody(rideStartCompleteCancelSchema), controller.noShow);
router.post('/driver-cancel', requireRole('driver'), validateBody(rideDriverCancelSchema), controller.driverCancel);
router.post('/rate-passenger', requireRole('driver'), validateBody(ridePassengerRateSchema), controller.ratePassenger);
router.post('/message', validateBody(rideMessageSchema), controller.message);
router.post('/cancel', requireRole('rider'), validateBody(rideStartCompleteCancelSchema), controller.cancel);
router.post('/rate', requireRole('rider'), validateBody(rideRateSchema), controller.rate);
export default router;
