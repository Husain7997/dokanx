const express = require("express");
const router = express.Router();

const { protect } = require("../middlewares");
const allowRoles = require("../middlewares/allowRoles");

const adminController = require("../controllers/admin.controller");
const reviewController = require("../controllers/admin/review.controller");
const settingsController = require("../controllers/settings.controller");
const analyticsController = require("../controllers/admin/analytics.controller");

// ❗❗ খুব গুরুত্বপূর্ণ: function হিসেবে পাঠাচ্ছি
router.get("/users",
  protect,
  allowRoles("ADMIN"),
  adminController.getAllUsers
);

router.put("/users/:id/block",
  protect,
  allowRoles("ADMIN"),
  adminController.blockUser
);
router.put("/users/:id/unblock",
  protect,
  allowRoles("ADMIN"),
  adminController.unblockUser
);

router.put("/shops/:id/approve",
  protect,
  allowRoles("ADMIN"),
  adminController.approveShop
);

router.put("/shops/:id/suspend",
  protect,
  allowRoles("ADMIN"),
  adminController.suspendShop
);

router.put("/shops/:shopId/commission",
  protect,
  allowRoles("ADMIN"),
  adminController.updateShopCommission
);

router.get("/orders",
  protect,
  allowRoles("ADMIN"),
  adminController.getAllOrders
);

router.get("/audit-logs",
  protect,
  allowRoles("ADMIN"),
  adminController.getAuditLogs
);

router.get("/merchants",
  protect,
  allowRoles("ADMIN"),
  adminController.listMerchants
);

router.get("/shops",
  protect,
  allowRoles("ADMIN"),
  adminController.listShops
);

router.get("/reviews",
  protect,
  allowRoles("ADMIN"),
  reviewController.listReviews
);

router.post("/reviews/:reviewId/approve",
  protect,
  allowRoles("ADMIN"),
  reviewController.approveReview
);

router.post("/reviews/:reviewId/reject",
  protect,
  allowRoles("ADMIN"),
  reviewController.rejectReview
);

router.put("/settings/eta",
  protect,
  allowRoles("ADMIN"),
  settingsController.updateEtaSettings
);

router.put("/settings/risk",
  protect,
  allowRoles("ADMIN"),
  settingsController.updateRiskSettings
);

router.get(
  "/analytics/overview",
  protect,
  allowRoles("ADMIN"),
  analyticsController.getOverview
);

router.post(
  "/analytics/build",
  protect,
  allowRoles("ADMIN"),
  analyticsController.buildPlatformWarehouse
);

module.exports = router;
