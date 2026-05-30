import { Router } from 'express';
import * as controller from '../controllers/marketplace.controller';
import { validateBody } from '../utils/validate';
import {
  createMarketSchema,
  createPromoSchema,
  genericSchema,
  registerReferralSchema,
  setSurgeSchema,
  updateMarketStatusSchema
} from '../schemas/marketplace.schemas';
import { requireAuth, requireRole } from '../middleware/auth.middleware';

const router = Router();

router.get('/health', controller.health);

// Surge: anyone authenticated can read, only admin can write
router.get('/surge', requireAuth, controller.get_surge);
router.post('/surge', requireAuth, requireRole('admin'), validateBody(setSurgeSchema), controller.set_surge);

// Promos: list is public-ish (auth required); create is admin-only
router.get('/promos', requireAuth, controller.list_promos);
router.post('/promos', requireAuth, requireRole('admin'), validateBody(createPromoSchema), controller.create_promo);

// Referrals: any authenticated user
router.get('/referral/code', requireAuth, controller.get_referral_code);
router.post('/referral/register', requireAuth, validateBody(registerReferralSchema), controller.register_referral);
router.get('/referral/list', requireAuth, controller.list_referrals);

// Markets: list is authenticated; create/update is admin-only
router.get('/markets', requireAuth, controller.list_markets);
router.post('/markets', requireAuth, requireRole('admin'), validateBody(createMarketSchema), controller.create_market);
router.post('/markets/status', requireAuth, requireRole('admin'), validateBody(updateMarketStatusSchema), controller.update_market_status);

// Same-day delivery (existing)
router.post('/same-day-dispatch', requireAuth, validateBody(genericSchema), controller.same_day_dispatch);
router.post('/delivery-options', requireAuth, validateBody(genericSchema), controller.delivery_options);

export default router;

