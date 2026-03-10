const router = require("express").Router();
const { protect, allowRoles } = require("@/middlewares");
const { tenantGuard } = require("@/api/middleware/tenantGuard");
const { validateBody, validateQuery, validateParams } = require("@/middlewares/validateRequest");
const controller = require("./adsCampaign.controller");
const validator = require("./adsCampaign.validator");

router.post(
  "/campaigns",
  protect,
  tenantGuard,
  allowRoles("OWNER", "ADMIN"),
  validateBody(validator.validateCreateCampaignBody),
  controller.createCampaign
);

router.get(
  "/campaigns",
  protect,
  tenantGuard,
  allowRoles("OWNER", "ADMIN", "STAFF"),
  validateQuery(validator.validateListCampaignsQuery),
  controller.listCampaigns
);

router.get(
  "/campaigns/:campaignId",
  protect,
  tenantGuard,
  allowRoles("OWNER", "ADMIN", "STAFF"),
  validateParams(validator.validateCampaignIdParam),
  controller.getCampaignById
);

router.put(
  "/campaigns/:campaignId",
  protect,
  tenantGuard,
  allowRoles("OWNER", "ADMIN"),
  validateParams(validator.validateCampaignIdParam),
  validateBody(validator.validateUpdateCampaignBody),
  controller.updateCampaign
);

router.patch(
  "/campaigns/:campaignId/status",
  protect,
  tenantGuard,
  allowRoles("OWNER", "ADMIN"),
  validateParams(validator.validateCampaignIdParam),
  validateBody(validator.validateCampaignStatusBody),
  controller.updateCampaignStatus
);

router.get(
  "/campaigns/:campaignId/ai-suggestion",
  protect,
  tenantGuard,
  allowRoles("OWNER", "ADMIN", "STAFF"),
  validateParams(validator.validateCampaignIdParam),
  controller.getAiCreativeSuggestion
);

router.get(
  "/campaigns/:campaignId/audience-recommendation",
  protect,
  tenantGuard,
  allowRoles("OWNER", "ADMIN", "STAFF"),
  validateParams(validator.validateCampaignIdParam),
  validateQuery(validator.validateAudienceSuggestionQuery),
  controller.getAudienceRecommendation
);

router.post(
  "/campaigns/:campaignId/feed/sync",
  protect,
  tenantGuard,
  allowRoles("OWNER", "ADMIN"),
  validateParams(validator.validateCampaignIdParam),
  controller.syncProductFeed
);

router.post(
  "/campaigns/:campaignId/metrics",
  protect,
  tenantGuard,
  allowRoles("OWNER", "ADMIN", "STAFF"),
  validateParams(validator.validateCampaignIdParam),
  validateBody(validator.validateMetricUpsertBody),
  controller.upsertMetric
);

router.get(
  "/campaigns/:campaignId/bidding/recommendation",
  protect,
  tenantGuard,
  allowRoles("OWNER", "ADMIN", "STAFF"),
  validateParams(validator.validateCampaignIdParam),
  validateQuery(validator.validateAudienceSuggestionQuery),
  controller.getBiddingRecommendation
);

router.get(
  "/campaigns/:campaignId/guardrail/check",
  protect,
  tenantGuard,
  allowRoles("OWNER", "ADMIN", "STAFF"),
  validateParams(validator.validateCampaignIdParam),
  controller.checkGuardrail
);

router.put(
  "/campaigns/:campaignId/frequency-cap",
  protect,
  tenantGuard,
  allowRoles("OWNER", "ADMIN"),
  validateParams(validator.validateCampaignIdParam),
  validateBody(validator.validateFrequencyCapBody),
  controller.updateFrequencyCap
);

router.post(
  "/campaigns/:campaignId/approval/request",
  protect,
  tenantGuard,
  allowRoles("OWNER", "ADMIN"),
  validateParams(validator.validateCampaignIdParam),
  validateBody(validator.validateLaunchApprovalRequestBody),
  controller.requestLaunchApproval
);

router.post(
  "/campaigns/:campaignId/approval/approve",
  protect,
  tenantGuard,
  allowRoles("OWNER", "ADMIN"),
  validateParams(validator.validateCampaignIdParam),
  validateBody(validator.validateLaunchApprovalDecisionBody),
  controller.approveLaunch
);

router.post(
  "/campaigns/:campaignId/approval/reject",
  protect,
  tenantGuard,
  allowRoles("OWNER", "ADMIN"),
  validateParams(validator.validateCampaignIdParam),
  validateBody(validator.validateLaunchApprovalDecisionBody),
  controller.rejectLaunch
);

module.exports = router;
