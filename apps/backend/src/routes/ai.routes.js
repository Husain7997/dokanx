const router = require("express").Router();
const { protect, allowRoles } = require("../middlewares");
const optionalAuth = require("../middlewares/optionalAuth.middleware");
const controller = require("../controllers/ai.controller");

router.get("/recommendations", optionalAuth, controller.withContext, controller.getRecommendations);
router.get("/trending", optionalAuth, controller.getTrending);
router.get("/similar-products", optionalAuth, controller.getSimilarProducts);
router.get("/demand-forecast", protect, allowRoles("ADMIN", "OWNER"), controller.getDemandForecast);
router.get("/pricing-insights", protect, allowRoles("ADMIN", "OWNER"), controller.getPricingInsights);
router.get("/merchant-insights", protect, allowRoles("ADMIN", "OWNER"), controller.getMerchantInsights);
router.get("/search-intelligence", protect, allowRoles("ADMIN"), controller.getSearchIntelligence);
router.get("/location-insights", protect, allowRoles("ADMIN"), controller.getLocationInsights);
router.get("/warehouse/overview", protect, allowRoles("ADMIN"), controller.getWarehouseOverview);
router.get("/warehouse/cohorts", protect, allowRoles("ADMIN"), controller.getWarehouseCohorts);
router.post("/feedback", optionalAuth, controller.recordFeedback);

module.exports = router;
