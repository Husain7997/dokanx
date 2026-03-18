const fraudService = require("../../services/fraud.service");

exports.getOverview = async (_req, res, next) => {
  try {
    const data = await fraudService.getOverview();
    res.json({ data });
  } catch (err) {
    next(err);
  }
};

exports.getAlerts = async (_req, res, next) => {
  try {
    const data = await fraudService.getAlerts();
    res.json({ data });
  } catch (err) {
    next(err);
  }
};

exports.getReports = async (_req, res, next) => {
  try {
    const data = await fraudService.getReports();
    res.json({ data });
  } catch (err) {
    next(err);
  }
};

exports.checkTransaction = async (req, res, next) => {
  try {
    const { orderId, paymentAttemptId, source } = req.body || {};
    if (!orderId) {
      return res.status(400).json({ message: "orderId required" });
    }

    const data = await fraudService.evaluateTransaction({
      orderId,
      paymentAttemptId: paymentAttemptId || null,
      source: source || "manual_check",
      context: {
        ip: req.ip,
        userAgent: req.headers["user-agent"] || "",
        deviceFingerprint: req.headers["x-device-fingerprint"] || req.body?.deviceFingerprint || "",
        couponCode: req.body?.couponCode || "",
      },
    });

    res.json({ data });
  } catch (err) {
    next(err);
  }
};

exports.reviewCase = async (req, res, next) => {
  try {
    const { caseId, action, note } = req.body || {};
    if (!caseId || !action) {
      return res.status(400).json({ message: "caseId and action required" });
    }

    const data = await fraudService.reviewCase({
      caseId,
      action,
      note: note || "",
      adminId: req.user?._id || null,
      req,
    });

    res.json({ data });
  } catch (err) {
    next(err);
  }
};
