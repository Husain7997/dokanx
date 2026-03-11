const { getPanicModeState } = require("@/services/panicMode.service");

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function isPanicControlRoute(req) {
  const path = req.path || req.originalUrl || "";
  return path.includes("/admin/system/panic-mode");
}

async function enforcePanicMode(req, res, next) {
  if (SAFE_METHODS.has(req.method) || isPanicControlRoute(req)) {
    return next();
  }

  try {
    const state = await getPanicModeState();
    if (!state.enabled) {
      return next();
    }

    return res.status(503).json({
      message: "System is in panic mode. Write operations are temporarily disabled.",
      panicMode: state,
    });
  } catch (_err) {
    return next();
  }
}

module.exports = {
  enforcePanicMode,
};
