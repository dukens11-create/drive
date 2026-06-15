import { Router } from 'express';
import multer from 'multer';
import * as controller from '../controllers/drivers.controller';
import { validateBody } from '../utils/validate';
import { applySchema, availabilitySchema, documentsSchema, locationSchema, vehicleCreateSchema, vehicleProfileSchema } from '../schemas/drivers.schemas';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import { signupSchema } from '../schemas/auth.schemas';
import { genericSchema } from '../schemas/kyc.schemas';

const router = Router();
const vehiclePhotoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (String(file.mimetype || '').startsWith('image/')) {
      callback(null, true);
      return;
    }
    callback(new Error('photo must be an image'));
  }
});

router.get('/health', controller.health);
router.post('/register', validateBody(signupSchema), controller.register);
router.use(requireAuth);
router.get('/nearby', controller.nearby);
router.post('/:id/online', controller.online);
router.post('/:id/offline', controller.offline);
router.post('/:id/location', validateBody(locationSchema), controller.locationById);
router.put('/:id/status', validateBody(availabilitySchema), controller.availabilityById);
router.post('/:id/vehicles', validateBody(vehicleCreateSchema), controller.createVehicle);
router.get('/:id/vehicles', controller.listVehicles);
router.delete('/:id/vehicles/:vehicleId', controller.deleteVehicle);
router.post('/:id/vehicles/:vehicleId/activate', controller.setActiveVehicle);
router.use(requireRole('driver'));
router.get('/me', controller.me);
router.get('/vehicle', controller.getVehicleProfile);
router.post('/vehicle', validateBody(vehicleProfileSchema), controller.saveVehicleProfile);
router.post('/vehicle/photo', vehiclePhotoUpload.single('photo'), controller.uploadVehiclePhoto);
router.get('/current-trip', controller.currentTrip);
router.post('/apply', validateBody(applySchema), controller.apply);
router.post('/availability', validateBody(availabilitySchema), controller.availability);
router.post('/location', validateBody(locationSchema), controller.location);
router.post('/earnings', controller.earnings);
router.get('/earnings', controller.earnings);
router.get('/earnings/today', controller.earningsToday);
router.get('/earnings/week', controller.earningsWeek);
router.get('/wallet', controller.wallet);
router.get('/transactions', controller.transactions);
router.get('/trips', controller.trips);
router.get('/trips/:rideId/receipt', controller.tripReceipt);
router.get('/payouts', controller.payouts);
router.get('/payouts/:payoutId', controller.getPayoutById);
router.post('/bank-account', controller.saveBankAccount);
router.post('/payout-preferences', controller.updatePayoutPreferences);
router.get('/earnings/breakdown', controller.earningsBreakdown);
router.get('/pricing-info', controller.pricingInfo);
router.post('/documents', validateBody(documentsSchema), controller.documents);
router.post('/vehicles/activate', validateBody(genericSchema), controller.setActiveVehicle);
router.post('/kyc/create-session', validateBody(genericSchema), controller.create_kyc_session);
router.get('/kyc/status', controller.kyc_status);

export default router;
