const express = require("express");
const router = express.Router();

const { protect } = require("../middlewares");
const allowRoles = require("../middlewares/allowRoles");

const adminController = require("../controllers/admin.controller");
const reviewController = require("../controllers/admin/review.controller");
const settingsController = require("../controllers/settings.controller");
const analyticsController = require("../controllers/admin/analytics.controller");
const recommendationController = require("../controllers/admin/recommendation.controller");
const fraudController = require("../controllers/admin/fraud.controller");
const apiKeyAdminController = require("../controllers/admin/api-key.admin.controller");
const queueAdminController = require("../controllers/admin/queue.admin.controller");
const agentController = require("../modules/agent/agent.controller");

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

router.get("/fraud/overview",
  protect,
  allowRoles("ADMIN"),
  fraudController.getOverview
);

router.get("/fraud/alerts",
  protect,
  allowRoles("ADMIN"),
  fraudController.getAlerts
);

router.get("/fraud/reports",
  protect,
  allowRoles("ADMIN"),
  fraudController.getReports
);

router.get("/queues/status",
  protect,
  allowRoles("ADMIN"),
  queueAdminController.getQueueStatus
);

router.post("/fraud/check-transaction",
  protect,
  allowRoles("ADMIN"),
  fraudController.checkTransaction
);

router.post("/fraud/review",
  protect,
  allowRoles("ADMIN"),
  fraudController.reviewCase
);

router.get("/shops",
  protect,
  allowRoles("ADMIN"),
  adminController.listShops
);

router.get("/agents",
  protect,
  allowRoles("ADMIN"),
  agentController.listAdminAgents
);

router.put("/agents/:id/status",
  protect,
  allowRoles("ADMIN"),
  agentController.updateStatus
);

router.post("/keys/migrate",
  protect,
  allowRoles("ADMIN"),
  apiKeyAdminController.migrateLegacyKey
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

router.put("/settings/thresholds",
  protect,
  allowRoles("ADMIN"),
  settingsController.updateThresholdSettings
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

router.get(
  "/recommendations/metrics",
  protect,
  allowRoles("ADMIN"),
  recommendationController.getRecommendationMetrics
);

module.exports = router;
