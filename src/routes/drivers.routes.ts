import { Router } from 'express';
import * as controller from '../controllers/drivers.controller';
import { validateBody } from '../utils/validate';
import { applySchema, availabilitySchema, documentsSchema, locationSchema, vehicleCreateSchema } from '../schemas/drivers.schemas';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import { signupSchema } from '../schemas/auth.schemas';
import { genericSchema } from '../schemas/kyc.schemas';

const router = Router();

router.get('/health', controller.health);
router.post('/register', validateBody(signupSchema), controller.register);
router.use(requireAuth);
router.get('/nearby', controller.nearby);
router.post('/:id/location', validateBody(locationSchema), controller.locationById);
router.put('/:id/status', validateBody(availabilitySchema), controller.availabilityById);
router.post('/:id/vehicles', validateBody(vehicleCreateSchema), controller.createVehicle);
router.get('/:id/vehicles', controller.listVehicles);
router.delete('/:id/vehicles/:vehicleId', controller.deleteVehicle);
router.post('/:id/vehicles/:vehicleId/activate', controller.setActiveVehicle);
router.use(requireRole('driver'));
router.get('/me', controller.me);
router.get('/current-trip', controller.currentTrip);
router.post('/apply', validateBody(applySchema), controller.apply);
router.post('/availability', validateBody(availabilitySchema), controller.availability);
router.post('/location', validateBody(locationSchema), controller.location);
router.post('/earnings', controller.earnings);
router.post('/documents', validateBody(documentsSchema), controller.documents);
router.post('/vehicles/activate', validateBody(genericSchema), controller.setActiveVehicle);
router.post('/kyc/create-session', validateBody(genericSchema), controller.create_kyc_session);
router.get('/kyc/status', controller.kyc_status);

export default router;
