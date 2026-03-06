const behaviorService = require("./behavior.service");
const { createAudit } = require("@/utils/audit.util");

async function getCustomerInsight(req, res, next) {
  try {
    const data = await behaviorService.generateCustomerInsight({
      shopId: req.shop._id,
      customerId: req.params.customerId,
    });

    res.json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
}

async function scanRisk(req, res, next) {
  try {
    const signals = await behaviorService.scanShopBehaviorRisk({
      shopId: req.shop._id,
      maxCustomers: req.body.maxCustomers || req.query.maxCustomers || 100,
    });

    await createAudit({
      action: "BEHAVIOR_RISK_SCANNED",
      performedBy: req.user._id,
      targetType: "Shop",
      targetId: req.shop._id,
      req,
      meta: { generatedSignals: signals.length },
    });

    res.json({
      success: true,
      generatedSignals: signals.length,
      data: signals,
    });
  } catch (err) {
    next(err);
  }
}

async function listSignals(req, res, next) {
  try {
    const resolvedRaw = req.query.resolved;
    const resolved = resolvedRaw === undefined
      ? undefined
      : String(resolvedRaw) === "true";

    const data = await behaviorService.listSignals({
      shopId: req.shop._id,
      severity: req.query.severity || undefined,
      resolved,
      limit: req.query.limit || 50,
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

async function resolveSignal(req, res, next) {
  try {
    const signal = await behaviorService.resolveSignal({
      shopId: req.shop._id,
      signalId: req.params.signalId,
      userId: req.user._id,
    });

    await createAudit({
      action: "BEHAVIOR_SIGNAL_RESOLVED",
      performedBy: req.user._id,
      targetType: "BehaviorSignal",
      targetId: signal._id,
      req,
    });

    res.json({
      success: true,
      signal,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getCustomerInsight,
  scanRisk,
  listSignals,
  resolveSignal,
};
