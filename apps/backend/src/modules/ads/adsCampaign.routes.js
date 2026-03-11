const router = require("express").Router();
const { tenantAccess } = require("@/middlewares/accessPolicy.middleware");
const { validateBody, validateQuery, validateParams } = require("@/middlewares/validateRequest");
const controller = require("./adsCampaign.controller");
const validator = require("./adsCampaign.validator");

router.post(
  "/campaigns",
  ...tenantAccess("OWNER", "ADMIN"),
  validateBody(validator.validateCreateCampaignBody),
  controller.createCampaign
);

router.get(
  "/campaigns",
  ...tenantAccess("OWNER", "ADMIN", "STAFF"),
  validateQuery(validator.validateListCampaignsQuery),
  controller.listCampaigns
);

router.get(
  "/campaigns/:campaignId",
  ...tenantAccess("OWNER", "ADMIN", "STAFF"),
  validateParams(validator.validateCampaignIdParam),
  controller.getCampaignById
);

router.get(
  "/campaigns/:campaignId/sync-status",
  ...tenantAccess("OWNER", "ADMIN", "STAFF"),
  validateParams(validator.validateCampaignIdParam),
  controller.getCampaignSyncStatus
);

router.put(
  "/campaigns/:campaignId",
  ...tenantAccess("OWNER", "ADMIN"),
  validateParams(validator.validateCampaignIdParam),
  validateBody(validator.validateUpdateCampaignBody),
  controller.updateCampaign
);

router.patch(
  "/campaigns/:campaignId/status",
  ...tenantAccess("OWNER", "ADMIN"),
  validateParams(validator.validateCampaignIdParam),
  validateBody(validator.validateCampaignStatusBody),
  controller.updateCampaignStatus
);

router.get(
  "/campaigns/:campaignId/ai-suggestion",
  ...tenantAccess("OWNER", "ADMIN", "STAFF"),
  validateParams(validator.validateCampaignIdParam),
  controller.getAiCreativeSuggestion
);

router.get(
  "/campaigns/:campaignId/audience-recommendation",
  ...tenantAccess("OWNER", "ADMIN", "STAFF"),
  validateParams(validator.validateCampaignIdParam),
  validateQuery(validator.validateAudienceSuggestionQuery),
  controller.getAudienceRecommendation
);

router.post(
  "/campaigns/:campaignId/feed/sync",
  ...tenantAccess("OWNER", "ADMIN"),
  validateParams(validator.validateCampaignIdParam),
  controller.syncProductFeed
);

router.post(
  "/campaigns/:campaignId/metrics",
  ...tenantAccess("OWNER", "ADMIN", "STAFF"),
  validateParams(validator.validateCampaignIdParam),
  validateBody(validator.validateMetricUpsertBody),
  controller.upsertMetric
);

router.get(
  "/campaigns/:campaignId/bidding/recommendation",
  ...tenantAccess("OWNER", "ADMIN", "STAFF"),
  validateParams(validator.validateCampaignIdParam),
  validateQuery(validator.validateAudienceSuggestionQuery),
  controller.getBiddingRecommendation
);

router.get(
  "/campaigns/:campaignId/guardrail/check",
  ...tenantAccess("OWNER", "ADMIN", "STAFF"),
  validateParams(validator.validateCampaignIdParam),
  controller.checkGuardrail
);

router.put(
  "/campaigns/:campaignId/frequency-cap",
  ...tenantAccess("OWNER", "ADMIN"),
  validateParams(validator.validateCampaignIdParam),
  validateBody(validator.validateFrequencyCapBody),
  controller.updateFrequencyCap
);

router.post(
  "/campaigns/:campaignId/approval/request",
  ...tenantAccess("OWNER", "ADMIN"),
  validateParams(validator.validateCampaignIdParam),
  validateBody(validator.validateLaunchApprovalRequestBody),
  controller.requestLaunchApproval
);

router.post(
  "/campaigns/:campaignId/approval/approve",
  ...tenantAccess("OWNER", "ADMIN"),
  validateParams(validator.validateCampaignIdParam),
  validateBody(validator.validateLaunchApprovalDecisionBody),
  controller.approveLaunch
);

router.post(
  "/campaigns/:campaignId/approval/reject",
  ...tenantAccess("OWNER", "ADMIN"),
  validateParams(validator.validateCampaignIdParam),
  validateBody(validator.validateLaunchApprovalDecisionBody),
  controller.rejectLaunch
);

module.exports = router;
