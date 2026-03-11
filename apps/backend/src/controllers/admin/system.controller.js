const { createAudit } = require("@/utils/audit.util");
const {
  getPanicModeState,
  setPanicModeState,
} = require("@/services/panicMode.service");

async function getPanicMode(req, res, next) {
  try {
    const state = await getPanicModeState();
    res.json({ success: true, data: state });
  } catch (err) {
    next(err);
  }
}

async function updatePanicMode(req, res, next) {
  try {
    const enabled = Boolean(req.body?.enabled);
    const reason = String(req.body?.reason || "").trim();

    const state = await setPanicModeState({
      enabled,
      reason,
      updatedBy: req.user?._id || null,
    });

    await createAudit({
      action: enabled ? "PANIC_MODE_ENABLED" : "PANIC_MODE_DISABLED",
      performedBy: req.user?._id || null,
      targetType: "SYSTEM",
      targetId: null,
      req,
    });

    res.json({ success: true, data: state });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getPanicMode,
  updatePanicMode,
};
