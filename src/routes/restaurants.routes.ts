import { Router } from 'express';
import * as controller from '../controllers/restaurants.controller';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import { validateBody } from '../utils/validate';
import {
  foodOrderSchema,
  genericPassthroughSchema,
  menuCategorySchema,
  menuItemSchema,
  restaurantLoginSchema,
  restaurantProfileSchema,
  restaurantRegisterSchema
} from '../schemas/restaurants.schemas';

const router = Router();

router.get('/restaurants/health', (_req, res) => res.json({ module: 'restaurants', ok: true }));

router.post('/restaurants/register', validateBody(restaurantRegisterSchema), controller.register);
router.post('/restaurants/login', validateBody(restaurantLoginSchema), controller.login);
router.post('/restaurants/verify-email', validateBody(genericPassthroughSchema), controller.verify_email);
router.post('/restaurants/refresh-token', validateBody(genericPassthroughSchema), controller.refresh_token);
router.post('/restaurants/logout', validateBody(genericPassthroughSchema), controller.logout);

router.get('/restaurants/search', controller.search_restaurants);
router.get('/restaurants/nearby', controller.nearby_restaurants);
router.get('/restaurants/featured', controller.featured_restaurants);
router.get('/restaurants/by-cuisine/:cuisine', controller.restaurants_by_cuisine);
router.get('/restaurants/by-location/:city', controller.restaurants_by_location);
router.get('/restaurants/trending', controller.trending_restaurants);
router.get('/restaurants/:id/reviews', controller.restaurant_reviews);
router.get('/restaurants/:id/menu', controller.restaurant_menu);

router.post('/orders/food', validateBody(foodOrderSchema), controller.create_food_order);
router.get('/orders/food/active', controller.active_food_orders);
router.get('/orders/food/:orderId', controller.get_food_order);
router.get('/orders/food/user/:userId', controller.list_food_orders_by_user);
router.put('/orders/food/:orderId/cancel', validateBody(genericPassthroughSchema), controller.cancel_food_order);
router.put('/orders/food/:orderId/status', validateBody(genericPassthroughSchema), controller.update_food_order_status);
router.get('/orders/food/:orderId/track', controller.track_food_order);
router.post('/orders/food/:orderId/rate', validateBody(genericPassthroughSchema), controller.rate_food_order);
router.get('/orders/food/:orderId/receipt', controller.food_order_receipt);
router.post('/orders/food/:orderId/refund-request', validateBody(genericPassthroughSchema), controller.refund_request);

router.use(requireAuth);

router.get('/restaurants/verify-status', requireRole('merchant'), controller.verify_status);
router.put('/restaurants/hours', requireRole('merchant'), validateBody(genericPassthroughSchema), controller.update_hours);
router.put('/restaurants/delivery-zones', requireRole('merchant'), validateBody(genericPassthroughSchema), controller.update_delivery_zones);

router.put('/restaurants/:id', requireRole('merchant', 'admin'), validateBody(restaurantProfileSchema), controller.update_restaurant);
router.get('/restaurants/:id', requireRole('merchant', 'admin'), controller.get_restaurant);

router.post('/restaurants/:id/documents', requireRole('merchant', 'admin'), validateBody(genericPassthroughSchema), controller.create_document);
router.get('/restaurants/:id/documents', requireRole('merchant', 'admin'), controller.list_documents);
router.get('/restaurants/:id/documents/:docId', requireRole('merchant', 'admin'), controller.get_document);
router.put('/restaurants/:id/documents/:docId', requireRole('merchant', 'admin'), validateBody(genericPassthroughSchema), controller.update_document);
router.delete('/restaurants/:id/documents/:docId', requireRole('merchant', 'admin'), controller.delete_document);
router.post('/restaurants/:id/verify', requireRole('merchant', 'admin'), controller.submit_verification);
router.get('/restaurants/:id/compliance-status', requireRole('merchant', 'admin'), controller.compliance_status);

router.post('/restaurants/:id/menu/categories', requireRole('merchant', 'admin'), validateBody(menuCategorySchema), controller.create_menu_category);
router.get('/restaurants/:id/menu/categories', requireRole('merchant', 'admin'), controller.list_menu_categories);
router.put('/restaurants/:id/menu/categories/:categoryId', requireRole('merchant', 'admin'), validateBody(genericPassthroughSchema), controller.update_menu_category);
router.delete('/restaurants/:id/menu/categories/:categoryId', requireRole('merchant', 'admin'), controller.delete_menu_category);
router.post('/restaurants/:id/menu/items', requireRole('merchant', 'admin'), validateBody(menuItemSchema), controller.create_menu_item);
router.get('/restaurants/:id/menu/items', requireRole('merchant', 'admin'), controller.list_menu_items);
router.get('/restaurants/:id/menu/items/:itemId', requireRole('merchant', 'admin'), controller.get_menu_item);
router.put('/restaurants/:id/menu/items/:itemId', requireRole('merchant', 'admin'), validateBody(genericPassthroughSchema), controller.update_menu_item);
router.delete('/restaurants/:id/menu/items/:itemId', requireRole('merchant', 'admin'), controller.delete_menu_item);
router.post('/restaurants/:id/menu/items/:itemId/images', requireRole('merchant', 'admin'), validateBody(genericPassthroughSchema), controller.upload_item_images);
router.put('/restaurants/:id/menu/items/:itemId/availability', requireRole('merchant', 'admin'), validateBody(genericPassthroughSchema), controller.set_item_availability);
router.post('/restaurants/:id/menu/bulk-import', requireRole('merchant', 'admin'), validateBody(genericPassthroughSchema), controller.bulk_import_menu);
router.get('/restaurants/:id/menu/export', requireRole('merchant', 'admin'), controller.export_menu);

router.post('/restaurants/:id/menu/items/:itemId/variants', requireRole('merchant', 'admin'), validateBody(genericPassthroughSchema), controller.create_variant);
router.get('/restaurants/:id/menu/items/:itemId/variants', requireRole('merchant', 'admin'), controller.list_variants);
router.put('/restaurants/:id/menu/items/:itemId/variants/:variantId', requireRole('merchant', 'admin'), validateBody(genericPassthroughSchema), controller.update_variant);
router.delete('/restaurants/:id/menu/items/:itemId/variants/:variantId', requireRole('merchant', 'admin'), controller.delete_variant);
router.post('/restaurants/:id/menu/items/:itemId/add-ons', requireRole('merchant', 'admin'), validateBody(genericPassthroughSchema), controller.create_addon);
router.get('/restaurants/:id/menu/items/:itemId/add-ons', requireRole('merchant', 'admin'), controller.list_addons);
router.put('/restaurants/:id/menu/items/:itemId/add-ons/:addonId', requireRole('merchant', 'admin'), validateBody(genericPassthroughSchema), controller.update_addon);
router.delete('/restaurants/:id/menu/items/:itemId/add-ons/:addonId', requireRole('merchant', 'admin'), controller.delete_addon);

router.get('/restaurants/:id/orders/history', requireRole('merchant', 'admin'), controller.order_history);
router.get('/restaurants/:id/orders/active', requireRole('merchant', 'admin'), controller.active_orders);
router.get('/restaurants/:id/orders', requireRole('merchant', 'admin'), controller.list_orders);
router.get('/restaurants/:id/orders/:orderId', requireRole('merchant', 'admin'), controller.get_order);
router.put('/restaurants/:id/orders/:orderId/status', requireRole('merchant', 'admin'), validateBody(genericPassthroughSchema), controller.update_order_status);
router.post('/restaurants/:id/orders/:orderId/accept', requireRole('merchant', 'admin'), controller.accept_order);
router.post('/restaurants/:id/orders/:orderId/reject', requireRole('merchant', 'admin'), validateBody(genericPassthroughSchema), controller.reject_order);
router.post('/restaurants/:id/orders/:orderId/cancel', requireRole('merchant', 'admin'), validateBody(genericPassthroughSchema), controller.cancel_order);
router.post('/restaurants/:id/orders/:orderId/ready', requireRole('merchant', 'admin'), controller.ready_order);
router.post('/restaurants/:id/orders/:orderId/notes', requireRole('merchant', 'admin'), validateBody(genericPassthroughSchema), controller.add_order_note);
router.post('/restaurants/:id/orders/:orderId/start-preparation', requireRole('merchant', 'admin'), controller.start_preparation);
router.post('/restaurants/:id/orders/:orderId/refund', requireRole('merchant', 'admin'), validateBody(genericPassthroughSchema), controller.refund_order);

router.get('/restaurants/:id/analytics/overview', requireRole('merchant', 'admin'), controller.analytics_overview);
router.get('/restaurants/:id/analytics/orders', requireRole('merchant', 'admin'), controller.analytics_orders);
router.get('/restaurants/:id/analytics/items', requireRole('merchant', 'admin'), controller.analytics_items);
router.get('/restaurants/:id/analytics/revenue', requireRole('merchant', 'admin'), controller.analytics_revenue);
router.get('/restaurants/:id/analytics/ratings', requireRole('merchant', 'admin'), controller.analytics_ratings);
router.get('/restaurants/:id/analytics/delivery-time', requireRole('merchant', 'admin'), controller.analytics_delivery_time);
router.get('/restaurants/:id/analytics/export', requireRole('merchant', 'admin'), controller.analytics_export);

router.get('/restaurants/:id/earnings', requireRole('merchant', 'admin'), controller.earnings);
router.get('/restaurants/:id/earnings/breakdown', requireRole('merchant', 'admin'), controller.earnings_breakdown);
router.get('/restaurants/:id/payouts', requireRole('merchant', 'admin'), controller.payouts);
router.get('/restaurants/:id/payouts/:payoutId', requireRole('merchant', 'admin'), controller.payout_details);
router.post('/restaurants/:id/payouts/request', requireRole('merchant', 'admin'), validateBody(genericPassthroughSchema), controller.request_payout);
router.put('/restaurants/:id/bank-account', requireRole('merchant', 'admin'), validateBody(genericPassthroughSchema), controller.update_bank_account);
router.get('/restaurants/:id/commission-structure', requireRole('merchant', 'admin'), controller.commission_structure);

router.put('/restaurants/:id/settings', requireRole('merchant', 'admin'), validateBody(genericPassthroughSchema), controller.update_settings);
router.put('/restaurants/:id/settings/taxes', requireRole('merchant', 'admin'), validateBody(genericPassthroughSchema), controller.update_taxes);
router.put('/restaurants/:id/settings/delivery-fee', requireRole('merchant', 'admin'), validateBody(genericPassthroughSchema), controller.update_delivery_fee);
router.put('/restaurants/:id/settings/minimum-order', requireRole('merchant', 'admin'), validateBody(genericPassthroughSchema), controller.update_minimum_order);
router.put('/restaurants/:id/settings/preparation-time', requireRole('merchant', 'admin'), validateBody(genericPassthroughSchema), controller.update_preparation_time);
router.get('/restaurants/:id/settings', requireRole('merchant', 'admin'), controller.get_settings);

router.post('/restaurants/:id/notifications/preferences', requireRole('merchant', 'admin'), validateBody(genericPassthroughSchema), controller.update_notification_preferences);
router.get('/restaurants/:id/notifications/preferences', requireRole('merchant', 'admin'), controller.get_notification_preferences);
router.get('/restaurants/:id/notifications', requireRole('merchant', 'admin'), controller.notification_history);
router.post('/restaurants/:id/notifications/send-test', requireRole('merchant', 'admin'), controller.send_test_notification);

router.post('/restaurants/:id/staff', requireRole('merchant', 'admin'), validateBody(genericPassthroughSchema), controller.add_staff);
router.get('/restaurants/:id/staff', requireRole('merchant', 'admin'), controller.list_staff);
router.get('/restaurants/:id/staff/:staffId', requireRole('merchant', 'admin'), controller.get_staff);
router.put('/restaurants/:id/staff/:staffId', requireRole('merchant', 'admin'), validateBody(genericPassthroughSchema), controller.update_staff);
router.delete('/restaurants/:id/staff/:staffId', requireRole('merchant', 'admin'), controller.remove_staff);
router.put('/restaurants/:id/staff/:staffId/role', requireRole('merchant', 'admin'), validateBody(genericPassthroughSchema), controller.update_staff_role);

router.post('/restaurants/:id/promotions', requireRole('merchant', 'admin'), validateBody(genericPassthroughSchema), controller.create_promotion);
router.get('/restaurants/:id/promotions', requireRole('merchant', 'admin'), controller.list_promotions);
router.put('/restaurants/:id/promotions/:promoId', requireRole('merchant', 'admin'), validateBody(genericPassthroughSchema), controller.update_promotion);
router.delete('/restaurants/:id/promotions/:promoId', requireRole('merchant', 'admin'), controller.delete_promotion);
router.get('/restaurants/:id/promotions/:promoId/performance', requireRole('merchant', 'admin'), controller.promotion_performance);

router.get('/restaurants/:id/reviews/:reviewId', requireRole('merchant', 'admin'), controller.get_review);
router.post('/restaurants/:id/reviews/:reviewId/response', requireRole('merchant', 'admin'), validateBody(genericPassthroughSchema), controller.respond_review);
router.get('/restaurants/:id/feedback', requireRole('merchant', 'admin'), controller.list_feedback);
router.post('/restaurants/:id/feedback/:feedbackId/resolve', requireRole('merchant', 'admin'), controller.resolve_feedback);

router.get('/restaurants/:id/compliance/checklist', requireRole('merchant', 'admin'), controller.compliance_checklist);
router.put('/restaurants/:id/compliance/documents', requireRole('merchant', 'admin'), validateBody(genericPassthroughSchema), controller.upload_compliance_documents);
router.get('/restaurants/:id/compliance/status', requireRole('merchant', 'admin'), controller.compliance_status_route);
router.post('/restaurants/:id/compliance/submit', requireRole('merchant', 'admin'), controller.submit_compliance);
router.get('/restaurants/:id/compliance/history', requireRole('merchant', 'admin'), controller.compliance_history);

router.post('/restaurants/:id/menu/items/batch-update', requireRole('merchant', 'admin'), validateBody(genericPassthroughSchema), controller.batch_update_items);
router.post('/restaurants/:id/menu/items/batch-delete', requireRole('merchant', 'admin'), validateBody(genericPassthroughSchema), controller.batch_delete_items);
router.post('/restaurants/:id/orders/batch-status', requireRole('merchant', 'admin'), validateBody(genericPassthroughSchema), controller.batch_order_status);

router.post('/restaurants/:id/webhooks', requireRole('merchant', 'admin'), validateBody(genericPassthroughSchema), controller.create_webhook);
router.get('/restaurants/:id/webhooks', requireRole('merchant', 'admin'), controller.list_webhooks);
router.delete('/restaurants/:id/webhooks/:webhookId', requireRole('merchant', 'admin'), controller.delete_webhook);

router.get('/admin/restaurants', requireRole('admin'), controller.admin_list_restaurants);
router.post('/admin/restaurants/:id/verify', requireRole('admin'), controller.admin_verify_restaurant);
router.post('/admin/restaurants/:id/suspend', requireRole('admin'), controller.admin_suspend_restaurant);
router.post('/admin/restaurants/:id/approve', requireRole('admin'), controller.admin_approve_restaurant);
router.put('/admin/restaurants/:id/commission', requireRole('admin'), validateBody(genericPassthroughSchema), controller.admin_update_commission);

export default router;
