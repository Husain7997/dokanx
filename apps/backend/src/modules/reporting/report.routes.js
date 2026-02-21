const router = require("express").Router();

const controller = require("./report.controller");

const {protect, allowRoles} = require("../../middlewares");
// const allowRoles = require("../../middlewares/rbac.middleware");

/**
 * SHOP REPORTS
 */
router.get(
  "/shop/summary",
  protect,
  allowRoles("OWNER"),
  controller.getShopSummary
);

router.get(
  "/shop/settlements",
  protect,
  allowRoles("OWNER"),
  controller.getSettlementHistory
);

/**
 * ADMIN REPORT
 */
router.get(
  "/admin/kpi",
  protect,
  allowRoles("ADMIN"),
  controller.getAdminKPI
);

module.exports = router;
