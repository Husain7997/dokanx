const service = require("./adsCampaign.service");
const { createAudit } = require("@/utils/audit.util");

async function createCampaign(req, res, next) {
  try {
    const result = await service.createCampaign({
      shopId: req.shop?._id,
      userId: req.user?._id || null,
      payload: req.body || {},
      idempotencyKey: req.headers["idempotency-key"] || null,
    });

    await createAudit({
      action: "AD_CAMPAIGN_CREATED",
      performedBy: req.user?._id || null,
      targetType: "AdCampaign",
      targetId: result.campaign?._id || null,
      req,
    });

    res.status(result.idempotencyReplay ? 200 : 201).json({
      success: true,
      idempotencyReplay: result.idempotencyReplay,
      data: result.campaign,
    });
  } catch (err) {
    next(err);
  }
}

async function listCampaigns(req, res, next) {
  try {
    const data = await service.listCampaigns({
      shopId: req.shop?._id,
      status: req.query.status || "",
      objective: req.query.objective || "",
      platform: req.query.platform || "",
      limit: service.toNumber(req.query.limit, 50),
    });

    res.json({
      success: true,
      count: data.length,
      data,
    });
  } catch (err) {
    next(err);
  }
}

async function getCampaignById(req, res, next) {
  try {
    const data = await service.getCampaignById({
      shopId: req.shop?._id,
      campaignId: req.params.campaignId,
    });

    res.json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
}

async function updateCampaign(req, res, next) {
  try {
    const data = await service.updateCampaign({
      shopId: req.shop?._id,
      campaignId: req.params.campaignId,
      userId: req.user?._id || null,
      payload: req.body || {},
    });

    await createAudit({
      action: "AD_CAMPAIGN_UPDATED",
      performedBy: req.user?._id || null,
      targetType: "AdCampaign",
      targetId: data?._id || null,
      req,
    });

    res.json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
}

async function updateCampaignStatus(req, res, next) {
  try {
    const result = await service.updateCampaignStatus({
      shopId: req.shop?._id,
      campaignId: req.params.campaignId,
      userId: req.user?._id || null,
      nextStatus: req.body.status,
      note: req.body.note || "",
    });

    await createAudit({
      action: "AD_CAMPAIGN_STATUS_UPDATED",
      performedBy: req.user?._id || null,
      targetType: "AdCampaign",
      targetId: result.campaign?._id || null,
      req,
    });

    res.json({
      success: true,
      idempotencyReplay: result.idempotencyReplay,
      data: result.campaign,
    });
  } catch (err) {
    next(err);
  }
}

async function getAiCreativeSuggestion(req, res, next) {
  try {
    const data = await service.getAiCreativeSuggestion({
      shopId: req.shop?._id,
      campaignId: req.params.campaignId,
    });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function getAudienceRecommendation(req, res, next) {
  try {
    const data = await service.getAudienceRecommendation({
      shopId: req.shop?._id,
      campaignId: req.params.campaignId,
      days: service.toNumber(req.query.days, 30),
    });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function syncProductFeed(req, res, next) {
  try {
    const data = await service.syncProductFeed({
      shopId: req.shop?._id,
      campaignId: req.params.campaignId,
    });
    await createAudit({
      action: "AD_CAMPAIGN_FEED_SYNCED",
      performedBy: req.user?._id || null,
      targetType: "AdCampaign",
      targetId: req.params.campaignId,
      req,
    });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function upsertMetric(req, res, next) {
  try {
    const data = await service.upsertDailyMetric({
      shopId: req.shop?._id,
      campaignId: req.params.campaignId,
      date: req.body.date || null,
      payload: req.body || {},
    });
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function getBiddingRecommendation(req, res, next) {
  try {
    const data = await service.getSmartBiddingRecommendation({
      shopId: req.shop?._id,
      campaignId: req.params.campaignId,
      days: service.toNumber(req.query.days, 14),
    });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function checkGuardrail(req, res, next) {
  try {
    const data = await service.checkDailyGuardrail({
      shopId: req.shop?._id,
      campaignId: req.params.campaignId,
    });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function updateFrequencyCap(req, res, next) {
  try {
    const data = await service.updateFrequencyCap({
      shopId: req.shop?._id,
      campaignId: req.params.campaignId,
      capPerUserPerDay: req.body.frequencyCapPerUserPerDay,
      userId: req.user?._id || null,
    });
    await createAudit({
      action: "AD_CAMPAIGN_FREQUENCY_CAP_UPDATED",
      performedBy: req.user?._id || null,
      targetType: "AdCampaign",
      targetId: req.params.campaignId,
      req,
    });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function requestLaunchApproval(req, res, next) {
  try {
    const result = await service.requestLaunchApproval({
      shopId: req.shop?._id,
      campaignId: req.params.campaignId,
      makerId: req.user?._id,
      reason: req.body.reason || "",
    });
    await createAudit({
      action: "AD_CAMPAIGN_APPROVAL_REQUESTED",
      performedBy: req.user?._id || null,
      targetType: "AdCampaign",
      targetId: req.params.campaignId,
      req,
    });
    res.status(result.idempotencyReplay ? 200 : 201).json({
      success: true,
      idempotencyReplay: result.idempotencyReplay,
      data: result.approval,
    });
  } catch (err) {
    next(err);
  }
}

async function approveLaunch(req, res, next) {
  try {
    const data = await service.approveLaunch({
      shopId: req.shop?._id,
      campaignId: req.params.campaignId,
      checkerId: req.user?._id,
      checkerComment: req.body.checkerComment || "",
    });
    await createAudit({
      action: "AD_CAMPAIGN_APPROVED",
      performedBy: req.user?._id || null,
      targetType: "AdCampaign",
      targetId: req.params.campaignId,
      req,
    });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function rejectLaunch(req, res, next) {
  try {
    const data = await service.rejectLaunch({
      shopId: req.shop?._id,
      campaignId: req.params.campaignId,
      checkerId: req.user?._id,
      checkerComment: req.body.checkerComment || "",
    });
    await createAudit({
      action: "AD_CAMPAIGN_REJECTED",
      performedBy: req.user?._id || null,
      targetType: "AdCampaign",
      targetId: req.params.campaignId,
      req,
    });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createCampaign,
  listCampaigns,
  getCampaignById,
  updateCampaign,
  updateCampaignStatus,
  getAiCreativeSuggestion,
  getAudienceRecommendation,
  syncProductFeed,
  upsertMetric,
  getBiddingRecommendation,
  checkGuardrail,
  updateFrequencyCap,
  requestLaunchApproval,
  approveLaunch,
  rejectLaunch,
};
