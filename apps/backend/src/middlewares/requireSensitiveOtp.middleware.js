const { consumeSensitiveOtpChallenge } = require("../security/sensitiveOtp.service");

function resolveOptionValue(option, req) {
  return typeof option === "function" ? option(req) : option;
}

function requireSensitiveOtp(options = {}) {
  return async (req, res, next) => {
    try {
      const action = resolveOptionValue(options.action, req);
      const targetId = String(resolveOptionValue(options.targetId, req) || "").trim();

      await consumeSensitiveOtpChallenge({
        user: req.user,
        action,
        challengeId: req.headers["x-otp-challenge-id"],
        code: req.headers["x-otp-code"],
        targetId,
        req,
      });

      return next();
    } catch (error) {
      const statusCode = Number(error?.statusCode || 403);
      return res.status(statusCode).json({
        success: false,
        message: error.message || "OTP verification required for sensitive action",
      });
    }
  };
}

module.exports = {
  requireSensitiveOtp,
};
