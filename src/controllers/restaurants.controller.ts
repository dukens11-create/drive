import * as service from '../services/restaurants.service';

function send(res: any, payload: any) {
  if (payload?.error) return res.status(400).json(payload);
  return res.json(payload);
}

export async function register(req: any, res: any) { return send(res, await service.register(req.body)); }
export async function login(req: any, res: any) { return send(res, await service.login(req.body)); }
export async function verify_email(req: any, res: any) { return send(res, await service.verifyEmail(req.body)); }
export async function refresh_token(req: any, res: any) { return send(res, await service.refreshToken(req.body)); }
export async function logout(req: any, res: any) { return send(res, await service.logout(req.body)); }

export async function update_restaurant(req: any, res: any) { return send(res, await service.updateProfile(req.params.id, req.body)); }
export async function get_restaurant(req: any, res: any) { return send(res, await service.details(req.params.id)); }
export async function verify_status(req: any, res: any) { return send(res, await service.verificationStatus(req.user)); }
export async function update_hours(req: any, res: any) { return send(res, await service.updateHours(req.user, req.body)); }
export async function update_delivery_zones(req: any, res: any) { return send(res, await service.updateDeliveryZones(req.user, req.body)); }

export async function create_document(req: any, res: any) { return send(res, await service.createDocument(req.params.id, req.body)); }
export async function list_documents(req: any, res: any) { return send(res, await service.listDocuments(req.params.id)); }
export async function get_document(req: any, res: any) { return send(res, await service.getDocument(req.params.id, req.params.docId)); }
export async function update_document(req: any, res: any) { return send(res, await service.updateDocument(req.params.id, req.params.docId, req.body)); }
export async function delete_document(req: any, res: any) { return send(res, await service.deleteDocument(req.params.id, req.params.docId)); }
export async function submit_verification(req: any, res: any) { return send(res, await service.submitVerification(req.params.id)); }
export async function compliance_status(req: any, res: any) { return send(res, await service.complianceStatus(req.params.id)); }

export async function create_menu_category(req: any, res: any) { return send(res, await service.createMenuCategory(req.params.id, req.body)); }
export async function list_menu_categories(req: any, res: any) { return send(res, await service.listMenuCategories(req.params.id)); }
export async function update_menu_category(req: any, res: any) { return send(res, await service.updateMenuCategory(req.params.id, req.params.categoryId, req.body)); }
export async function delete_menu_category(req: any, res: any) { return send(res, await service.deleteMenuCategory(req.params.id, req.params.categoryId)); }

export async function create_menu_item(req: any, res: any) { return send(res, await service.createMenuItem(req.params.id, req.body)); }
export async function list_menu_items(req: any, res: any) { return send(res, await service.listMenuItems(req.params.id, req.query)); }
export async function get_menu_item(req: any, res: any) { return send(res, await service.getMenuItem(req.params.id, req.params.itemId)); }
export async function update_menu_item(req: any, res: any) { return send(res, await service.updateMenuItem(req.params.id, req.params.itemId, req.body)); }
export async function delete_menu_item(req: any, res: any) { return send(res, await service.deleteMenuItem(req.params.id, req.params.itemId)); }
export async function upload_item_images(req: any, res: any) { return send(res, await service.uploadItemImages(req.params.id, req.params.itemId, req.body)); }
export async function set_item_availability(req: any, res: any) { return send(res, await service.setItemAvailability(req.params.id, req.params.itemId, req.body)); }
export async function bulk_import_menu(req: any, res: any) { return send(res, await service.bulkImportMenu(req.params.id, req.body)); }
export async function export_menu(req: any, res: any) { return send(res, await service.exportMenu(req.params.id)); }

export async function create_variant(req: any, res: any) { return send(res, await service.createVariant(req.params.id, req.params.itemId, req.body)); }
export async function list_variants(req: any, res: any) { return send(res, await service.listVariants(req.params.id, req.params.itemId)); }
export async function update_variant(req: any, res: any) { return send(res, await service.updateVariant(req.params.id, req.params.itemId, req.params.variantId, req.body)); }
export async function delete_variant(req: any, res: any) { return send(res, await service.deleteVariant(req.params.id, req.params.itemId, req.params.variantId)); }
export async function create_addon(req: any, res: any) { return send(res, await service.createAddon(req.params.id, req.params.itemId, req.body)); }
export async function list_addons(req: any, res: any) { return send(res, await service.listAddons(req.params.id, req.params.itemId)); }
export async function update_addon(req: any, res: any) { return send(res, await service.updateAddon(req.params.id, req.params.itemId, req.params.addonId, req.body)); }
export async function delete_addon(req: any, res: any) { return send(res, await service.deleteAddon(req.params.id, req.params.itemId, req.params.addonId)); }

export async function list_orders(req: any, res: any) { return send(res, await service.listOrders(req.params.id, req.query)); }
export async function get_order(req: any, res: any) { return send(res, await service.getOrder(req.params.id, req.params.orderId)); }
export async function update_order_status(req: any, res: any) { return send(res, await service.updateOrderStatus(req.params.id, req.params.orderId, req.body?.status)); }
export async function accept_order(req: any, res: any) { return send(res, await service.updateOrderStatus(req.params.id, req.params.orderId, 'accepted')); }
export async function reject_order(req: any, res: any) { return send(res, await service.rejectOrder(req.params.id, req.params.orderId, req.body?.reason || 'rejected')); }
export async function cancel_order(req: any, res: any) { return send(res, await service.cancelOrder(req.params.id, req.params.orderId, req.body?.reason || 'canceled')); }
export async function ready_order(req: any, res: any) { return send(res, await service.updateOrderStatus(req.params.id, req.params.orderId, 'ready')); }
export async function add_order_note(req: any, res: any) { return send(res, await service.addOrderNote(req.params.id, req.params.orderId, req.body?.note || '')); }
export async function start_preparation(req: any, res: any) { return send(res, await service.startPreparation(req.params.id, req.params.orderId)); }
export async function order_history(req: any, res: any) { return send(res, await service.orderHistory(req.params.id, req.query)); }
export async function active_orders(req: any, res: any) { return send(res, await service.activeOrders(req.params.id)); }
export async function refund_order(req: any, res: any) { return send(res, await service.refundOrder(req.params.id, req.params.orderId, req.body?.reason || 'refund')); }

export async function create_food_order(req: any, res: any) { return send(res, await service.createFoodOrder(req.body)); }
export async function get_food_order(req: any, res: any) { return send(res, await service.getFoodOrder(req.params.orderId)); }
export async function list_food_orders_by_user(req: any, res: any) { return send(res, await service.listFoodOrdersByUser(req.params.userId, req.query)); }
export async function cancel_food_order(req: any, res: any) { return send(res, await service.updateFoodOrderStatus(req.params.orderId, 'canceled')); }
export async function update_food_order_status(req: any, res: any) { return send(res, await service.updateFoodOrderStatus(req.params.orderId, req.body?.status)); }
export async function track_food_order(req: any, res: any) { return send(res, await service.trackFoodOrder(req.params.orderId)); }
export async function rate_food_order(req: any, res: any) { return send(res, await service.rateFoodOrder(req.params.orderId, req.body)); }
export async function food_order_receipt(req: any, res: any) { return send(res, await service.foodOrderReceipt(req.params.orderId)); }
export async function refund_request(req: any, res: any) { return send(res, await service.requestFoodOrderRefund(req.params.orderId, req.body)); }
export async function active_food_orders(req: any, res: any) { return send(res, await service.activeFoodOrders(req.query?.userId)); }

export async function search_restaurants(req: any, res: any) { return send(res, await service.searchRestaurants(req.query)); }
export async function nearby_restaurants(req: any, res: any) { return send(res, await service.nearbyRestaurants(req.query)); }
export async function featured_restaurants(req: any, res: any) { return send(res, await service.featuredRestaurants()); }
export async function restaurants_by_cuisine(req: any, res: any) { return send(res, await service.restaurantsByCuisine(req.params.cuisine)); }
export async function restaurants_by_location(req: any, res: any) { return send(res, await service.restaurantsByCity(req.params.city)); }
export async function trending_restaurants(req: any, res: any) { return send(res, await service.trendingRestaurants()); }
export async function restaurant_reviews(req: any, res: any) { return send(res, await service.restaurantReviews(req.params.id)); }
export async function restaurant_menu(req: any, res: any) { return send(res, await service.publicRestaurantMenu(req.params.id)); }

export async function analytics_overview(req: any, res: any) { return send(res, await service.analyticsOverview(req.params.id)); }
export async function analytics_orders(req: any, res: any) { return send(res, await service.analyticsOrders(req.params.id)); }
export async function analytics_items(req: any, res: any) { return send(res, await service.analyticsItems(req.params.id)); }
export async function analytics_revenue(req: any, res: any) { return send(res, await service.analyticsRevenue(req.params.id)); }
export async function analytics_ratings(req: any, res: any) { return send(res, await service.analyticsRatings(req.params.id)); }
export async function analytics_delivery_time(req: any, res: any) { return send(res, await service.analyticsDeliveryTime(req.params.id)); }
export async function analytics_export(req: any, res: any) { return send(res, await service.analyticsExport(req.params.id)); }

export async function earnings(req: any, res: any) { return send(res, await service.earnings(req.params.id)); }
export async function earnings_breakdown(req: any, res: any) { return send(res, await service.earningsBreakdown(req.params.id)); }
export async function payouts(req: any, res: any) { return send(res, await service.payoutHistory(req.params.id)); }
export async function payout_details(req: any, res: any) { return send(res, await service.payoutDetails(req.params.id, req.params.payoutId)); }
export async function request_payout(req: any, res: any) { return send(res, await service.requestPayout(req.params.id, req.body)); }
export async function update_bank_account(req: any, res: any) { return send(res, await service.updateBankAccount(req.params.id, req.body)); }
export async function commission_structure(req: any, res: any) { return send(res, await service.commissionStructure(req.params.id)); }

export async function update_settings(req: any, res: any) { return send(res, await service.updateSettings(req.params.id, req.body)); }
export async function update_taxes(req: any, res: any) { return send(res, await service.updateSettings(req.params.id, { taxes: req.body })); }
export async function update_delivery_fee(req: any, res: any) { return send(res, await service.updateSettings(req.params.id, { deliveryFee: req.body })); }
export async function update_minimum_order(req: any, res: any) { return send(res, await service.updateSettings(req.params.id, { minimumOrder: req.body })); }
export async function update_preparation_time(req: any, res: any) { return send(res, await service.updateSettings(req.params.id, { preparationTime: req.body })); }
export async function get_settings(req: any, res: any) { return send(res, await service.getSettings(req.params.id)); }

export async function update_notification_preferences(req: any, res: any) { return send(res, await service.updateNotificationPreferences(req.params.id, req.body)); }
export async function get_notification_preferences(req: any, res: any) { return send(res, await service.getNotificationPreferences(req.params.id)); }
export async function notification_history(req: any, res: any) { return send(res, await service.notificationsHistory(req.params.id)); }
export async function send_test_notification(req: any, res: any) { return send(res, await service.sendTestNotification(req.params.id)); }

export async function add_staff(req: any, res: any) { return send(res, await service.addStaff(req.params.id, req.body)); }
export async function list_staff(req: any, res: any) { return send(res, await service.listStaff(req.params.id)); }
export async function get_staff(req: any, res: any) { return send(res, await service.getStaff(req.params.id, req.params.staffId)); }
export async function update_staff(req: any, res: any) { return send(res, await service.updateStaff(req.params.id, req.params.staffId, req.body)); }
export async function remove_staff(req: any, res: any) { return send(res, await service.removeStaff(req.params.id, req.params.staffId)); }
export async function update_staff_role(req: any, res: any) { return send(res, await service.updateStaffRole(req.params.id, req.params.staffId, req.body?.role)); }

export async function create_promotion(req: any, res: any) { return send(res, await service.createPromotion(req.params.id, req.body)); }
export async function list_promotions(req: any, res: any) { return send(res, await service.listPromotions(req.params.id)); }
export async function update_promotion(req: any, res: any) { return send(res, await service.updatePromotion(req.params.id, req.params.promoId, req.body)); }
export async function delete_promotion(req: any, res: any) { return send(res, await service.deletePromotion(req.params.id, req.params.promoId)); }
export async function promotion_performance(req: any, res: any) { return send(res, await service.promotionPerformance(req.params.id, req.params.promoId)); }

export async function list_reviews(req: any, res: any) { return send(res, await service.restaurantReviews(req.params.id)); }
export async function get_review(req: any, res: any) { return send(res, await service.reviewById(req.params.id, req.params.reviewId)); }
export async function respond_review(req: any, res: any) { return send(res, await service.respondToReview(req.params.id, req.params.reviewId, req.body)); }
export async function list_feedback(req: any, res: any) { return send(res, await service.listFeedback(req.params.id)); }
export async function resolve_feedback(req: any, res: any) { return send(res, await service.resolveFeedback(req.params.id, req.params.feedbackId)); }

export async function compliance_checklist(req: any, res: any) { return send(res, await service.complianceChecklist(req.params.id)); }
export async function upload_compliance_documents(req: any, res: any) { return send(res, await service.uploadComplianceDocuments(req.params.id, req.body)); }
export async function compliance_status_route(req: any, res: any) { return send(res, await service.complianceStatus(req.params.id)); }
export async function submit_compliance(req: any, res: any) { return send(res, await service.submitCompliance(req.params.id)); }
export async function compliance_history(req: any, res: any) { return send(res, await service.complianceHistory(req.params.id)); }

export async function admin_list_restaurants(_req: any, res: any) { return send(res, await service.adminListRestaurants()); }
export async function admin_verify_restaurant(req: any, res: any) { return send(res, await service.adminVerifyRestaurant(req.params.id)); }
export async function admin_suspend_restaurant(req: any, res: any) { return send(res, await service.adminSuspendRestaurant(req.params.id)); }
export async function admin_approve_restaurant(req: any, res: any) { return send(res, await service.adminApproveRestaurant(req.params.id)); }
export async function admin_update_commission(req: any, res: any) { return send(res, await service.adminUpdateCommission(req.params.id, req.body)); }

export async function batch_update_items(req: any, res: any) { return send(res, await service.batchUpdateItems(req.params.id, req.body)); }
export async function batch_delete_items(req: any, res: any) { return send(res, await service.batchDeleteItems(req.params.id, req.body)); }
export async function batch_order_status(req: any, res: any) { return send(res, await service.batchOrderStatus(req.params.id, req.body)); }

export async function create_webhook(req: any, res: any) { return send(res, await service.createWebhook(req.params.id, req.body)); }
export async function list_webhooks(req: any, res: any) { return send(res, await service.listWebhooks(req.params.id)); }
export async function delete_webhook(req: any, res: any) { return send(res, await service.deleteWebhook(req.params.id, req.params.webhookId)); }
