const service = require("./merchantAssistant.service");
const { createAudit } = require("@/utils/audit.util");

async function queryOpsAssistant(req, res, next) {
  try {
    const data = await service.queryOpsAssistant({
      shopId: req.shop?._id,
      message: req.body.message || "",
      channel: req.body.channel || "WHATSAPP",
    });

    res.json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
}

async function createContactRequest(req, res, next) {
  try {
    const result = await service.createContactRequest({
      shopId: req.shop?._id,
      requestedBy: req.user?._id || null,
      message: req.body.message || "",
      targetRole: req.body.targetRole || "SUPPORT",
      channel: req.body.channel || "WHATSAPP",
      priority: req.body.priority || "MEDIUM",
      callbackPhone: req.body.callbackPhone || "",
      sourceIntent: req.body.sourceIntent || "MANUAL",
      idempotencyKey: req.headers["idempotency-key"] || null,
    });

    await createAudit({
      action: "ASSISTANT_CONTACT_REQUEST_CREATED",
      performedBy: req.user?._id || null,
      targetType: "ContactRequest",
      targetId: result.contactRequest?._id || null,
      req,
    });

    res.status(result.idempotencyReplay ? 200 : 201).json({
      success: true,
      idempotencyReplay: result.idempotencyReplay,
      data: result.contactRequest,
    });
  } catch (err) {
    next(err);
  }
}

async function listContactRequests(req, res, next) {
  try {
    const data = await service.listContactRequests({
      shopId: req.shop?._id,
      status: req.query.status || "",
      targetRole: req.query.targetRole || "",
      limit: service._internals.toNumber(req.query.limit, 50),
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

async function updateContactRequestStatus(req, res, next) {
  try {
    const result = await service.updateContactRequestStatus({
      shopId: req.shop?._id,
      requestId: req.params.requestId,
      actorUserId: req.user?._id || null,
      actorRole: req.user?.role || "",
      status: req.body.status,
      note: req.body.note || "",
    });

    await createAudit({
      action: "ASSISTANT_CONTACT_REQUEST_STATUS_UPDATED",
      performedBy: req.user?._id || null,
      targetType: "ContactRequest",
      targetId: result.contactRequest?._id || null,
      req,
    });

    res.status(200).json({
      success: true,
      idempotencyReplay: result.idempotencyReplay,
      data: result.contactRequest,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  queryOpsAssistant,
  createContactRequest,
  listContactRequests,
  updateContactRequestStatus,
};
