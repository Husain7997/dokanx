const router = require("express").Router();
const { protect, allowRoles } = require("../middlewares");
const controller = require("../controllers/marketplace.controller");

router.get("/apps", controller.listMarketplaceApps);
router.post("/apps/publish", protect, allowRoles("DEVELOPER", "ADMIN"), controller.publishApp);
router.post("/apps/install", protect, allowRoles("OWNER", "ADMIN"), controller.installApp);
router.post("/apps/uninstall", protect, allowRoles("OWNER", "ADMIN"), controller.uninstallApp);
router.get("/apps/:appId/reviews", controller.listReviews);
router.post("/apps/:appId/reviews", protect, allowRoles("OWNER", "CUSTOMER", "ADMIN"), controller.addReview);

module.exports = router;
