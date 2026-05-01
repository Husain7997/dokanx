const express = require("express");
const router = express.Router();

const { protect, requirePermissions } = require("../middlewares");
const allowRoles = require("../middlewares/allowRoles");
const { validateRequest } = require("../middlewares/validateRequest.middleware");
const { schemas } = require("../validation/security.schemas");

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
  allowRoles("ADMIN", "SUPPORT_ADMIN"),
  requirePermissions("ADMIN_MANAGE_USERS"),
  adminController.getAllUsers
);

router.put("/users/:id",
  protect,
  allowRoles("ADMIN", "SUPPORT_ADMIN"),
  requirePermissions("ADMIN_MANAGE_USERS"),
  validateRequest(schemas.adminUserUpdate),
  adminController.updateUser
);

router.put("/users/:id/block",
  protect,
  allowRoles("ADMIN", "SUPPORT_ADMIN"),
  requirePermissions("ADMIN_MANAGE_USERS"),
  validateRequest(schemas.adminUserTarget),
  adminController.blockUser
);
router.put("/users/:id/unblock",
  protect,
  allowRoles("ADMIN", "SUPPORT_ADMIN"),
  requirePermissions("ADMIN_MANAGE_USERS"),
  validateRequest(schemas.adminUserTarget),
  adminController.unblockUser
);

router.put("/shops/:id/approve",
  protect,
  allowRoles("ADMIN"),
  requirePermissions("ADMIN_MANAGE_SHOPS"),
  validateRequest(schemas.adminShopTarget),
  adminController.approveShop
);

router.put("/shops/:id/suspend",
  protect,
  allowRoles("ADMIN"),
  requirePermissions("ADMIN_MANAGE_SHOPS"),
  validateRequest(schemas.adminShopTarget),
  adminController.suspendShop
);

router.put("/shops/:shopId/commission",
  protect,
  allowRoles("ADMIN"),
  requirePermissions("ADMIN_MANAGE_SHOPS"),
  validateRequest(schemas.adminCommission),
  adminController.updateShopCommission
);

router.get("/orders",
  protect,
  allowRoles("ADMIN", "FINANCE_ADMIN", "AUDIT_ADMIN", "SUPPORT_ADMIN"),
  requirePermissions("ADMIN_VIEW_ORDERS"),
  adminController.getAllOrders
);

router.get("/audit-logs",
  protect,
  allowRoles("ADMIN", "AUDIT_ADMIN"),
  requirePermissions("ADMIN_VIEW_AUDIT"),
  adminController.getAuditLogs
);

router.get("/merchants",
  protect,
  allowRoles("ADMIN"),
  requirePermissions("ADMIN_VIEW_SHOPS"),
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
  allowRoles("ADMIN", "AUDIT_ADMIN"),
  requirePermissions("ADMIN_VIEW_SHOPS"),
  adminController.listShops
);

router.get("/themes",
  protect,
  allowRoles("ADMIN"),
  requirePermissions("ADMIN_VIEW_SHOPS"),
  adminController.listMarketplaceThemes
);

router.put("/themes/:shopId/:themeId/review",
  protect,
  allowRoles("ADMIN"),
  requirePermissions("ADMIN_MANAGE_SHOPS"),
  adminController.reviewMarketplaceTheme
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

router.put("/settings/ops",
  protect,
  allowRoles("ADMIN"),
  settingsController.updateOpsSettings
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
