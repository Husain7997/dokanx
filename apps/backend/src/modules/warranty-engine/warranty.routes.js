const router = require("express").Router();
const controller = require("./warranty.controller");
const { protect, allowRoles } = require("../../middlewares");

router.post("/", protect, allowRoles("CUSTOMER", "ADMIN"), controller.createClaim);
router.get("/", protect, allowRoles("ADMIN"), controller.listClaims);
router.get("/customer/:id", protect, allowRoles("CUSTOMER", "ADMIN"), controller.getCustomerClaims);
router.get("/shop/:shopId", protect, allowRoles("OWNER", "STAFF", "ADMIN"), controller.getShopClaims);
router.put("/:id/status", protect, allowRoles("OWNER", "STAFF", "ADMIN"), controller.updateClaimStatus);
router.get("/analytics/overview", protect, allowRoles("ADMIN"), controller.getAnalytics);

module.exports = router;
