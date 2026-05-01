const { issueSensitiveOtpChallenge } = require("../../security/sensitiveOtp.service");

exports.requestSensitiveOtp = async (req, res) => {
  try {
    const result = await issueSensitiveOtpChallenge({
      user: req.user,
      action: req.body?.action,
      targetId: req.body?.targetId,
      targetType: req.body?.targetType,
      req,
    });

    return res.status(201).json({
      success: true,
      message: "OTP challenge issued",
      data: result,
    });
  } catch (error) {
    return res.status(Number(error?.statusCode || 400)).json({
      success: false,
      message: error.message || "Unable to issue OTP challenge",
    });
  }
};
