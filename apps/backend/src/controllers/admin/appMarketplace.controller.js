const response = require("@/utils/controllerResponse");
const webhookDeliveryService = require("@/modules/app-marketplace/webhookDelivery.service");

async function getWebhookDeadLetters(req, res, next) {
  try {
    const rows = await webhookDeliveryService.listDeadLetters({
      limit: req.query.limit || 50,
      shopId: String(req.query.shopId || "").trim() || null,
    });
    return response.updated(res, req, rows);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  getWebhookDeadLetters,
};
