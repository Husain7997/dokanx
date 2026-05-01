const router = require("express").Router();
const { protect, allowRoles, requirePermissions } = require("../middlewares");
const optionalAuth = require("../middlewares/optionalAuth.middleware");
const controller = require("../controllers/ai.controller");

router.get("/recommendations", optionalAuth, controller.withContext, controller.getRecommendations);
router.get("/trending", optionalAuth, controller.getTrending);
router.get("/similar-products", optionalAuth, controller.getSimilarProducts);
router.get("/demand-forecast", protect, allowRoles("ADMIN", "OWNER"), requirePermissions("AI_VIEW_FORECAST"), controller.getDemandForecast);
router.get("/pricing-insights", protect, allowRoles("ADMIN", "OWNER"), requirePermissions("AI_VIEW_PRICING"), controller.getPricingInsights);
router.get("/merchant-insights", protect, allowRoles("ADMIN", "OWNER"), requirePermissions("AI_VIEW_MERCHANT_INSIGHTS"), controller.getMerchantInsights);
router.get("/merchant-copilot", protect, allowRoles("ADMIN", "OWNER", "STAFF"), requirePermissions("AI_VIEW_OVERVIEW"), controller.getMerchantCopilot);
router.get("/inventory-actions", protect, allowRoles("ADMIN", "OWNER", "STAFF"), requirePermissions("AI_VIEW_INVENTORY"), controller.getInventoryActions);
router.get("/customer-segments", protect, allowRoles("ADMIN", "OWNER", "STAFF"), requirePermissions("AI_VIEW_CUSTOMERS"), controller.getCustomerSegments);
router.get("/credit-insights", protect, allowRoles("ADMIN", "OWNER", "STAFF"), requirePermissions("AI_VIEW_CREDIT"), controller.getCreditInsights);
router.get("/payment-intelligence", protect, allowRoles("ADMIN", "OWNER", "STAFF"), requirePermissions("AI_VIEW_PAYMENTS"), controller.getPaymentIntelligence);
router.get("/search-intelligence", protect, allowRoles("ADMIN"), controller.getSearchIntelligence);
router.get("/location-insights", protect, allowRoles("ADMIN"), controller.getLocationInsights);
router.get("/warehouse/overview", protect, allowRoles("ADMIN"), controller.getWarehouseOverview);
router.get("/warehouse/cohorts", protect, allowRoles("ADMIN"), controller.getWarehouseCohorts);
router.post("/feedback", optionalAuth, controller.recordFeedback);

module.exports = router;
