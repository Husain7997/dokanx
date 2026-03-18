const router = require("express").Router();

const controller = require("../controllers/analytics.controller");
const { protect, allowRoles } = require("../middlewares");
const optionalAuth = require("../middlewares/optionalAuth.middleware");

router.get(
  "/warehouse",
  protect,
  allowRoles("OWNER", "ADMIN"),
  controller.getWarehouseSnapshots
);

router.post(
  "/warehouse/build",
  protect,
  allowRoles("OWNER", "ADMIN"),
  controller.buildWarehouse
);

router.post("/events", optionalAuth, controller.trackEvent);

module.exports = router;
