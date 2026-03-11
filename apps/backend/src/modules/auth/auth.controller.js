const bcrypt = require("bcryptjs");
const User = require("../../models/user.model");
const { logger, t } = require("@/core/infrastructure");
const { triggerWelcomeFlow } = require("@/modules/marketing/marketingTrigger.service");
const {
  signAccessToken,
  issueRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllRefreshTokens,
  listActiveSessions,
  revokeSessionById,
  requestPhoneOtpLogin,
  verifyPhoneOtpLogin,
  requestMagicLinkLogin,
  verifyMagicLinkLogin,
} = require("./auth.service");

function sanitizeUser(user) {
  if (!user) return null;
  const raw = typeof user.toObject === "function" ? user.toObject() : { ...user };
  delete raw.password;
  return raw;
}

async function buildAuthResponse(user, req, status = 200) {
  const accessToken = signAccessToken(user);
  const refresh = await issueRefreshToken(user, req);

  return {
    status,
    body: {
      message: t("common.updated", req.lang),
      success: true,
      token: accessToken,
      accessToken,
      ...refresh,
      user: sanitizeUser(user),
    },
  };
}

exports.register = async (req, res) => {
  try {
    const { name, email, password, role, phone } = req.body;

    const normalizedEmail = String(email || "").toLowerCase();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: t("auth.user_exists", req.lang),
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email: normalizedEmail,
      phone: phone ? String(phone).trim() : null,
      password: hashedPassword,
      role: role?.toUpperCase() || "CUSTOMER",
      shopId: null,
    });

    const tenantShopId = user.shopId || req.shop?._id || req.tenant || null;
    if (tenantShopId) {
      await triggerWelcomeFlow({
        shopId: tenantShopId,
        user,
        logger,
      });
    }

    const payload = await buildAuthResponse(user, req, 201);
    return res.status(payload.status).json(payload.body);
  } catch (err) {
    logger.error({ err: err.message }, "Auth register failed");
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = String(email || "").toLowerCase();

    const user = await User.findOne({ email: normalizedEmail }).select("+password");
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const payload = await buildAuthResponse(user, req, 200);
    return res.json(payload.body);
  } catch (err) {
    logger.error({ err: err.message }, "Auth login failed");
    return res.status(500).json({
      success: false,
      message: "Login failed",
    });
  }
};

exports.refresh = async (req, res) => {
  try {
    const refreshToken = req.body?.refreshToken;
    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: "refreshToken is required",
      });
    }

    const rotated = await rotateRefreshToken(refreshToken, req);
    const user = await User.findById(rotated.userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    const accessToken = signAccessToken(user);
    return res.json({
      success: true,
      token: accessToken,
      accessToken,
      refreshToken: rotated.refreshToken,
      refreshTokenExpiresAt: rotated.refreshTokenExpiresAt,
      user: sanitizeUser(user),
    });
  } catch (err) {
    logger.warn({ err: err.message }, "Refresh token exchange failed");
    return res.status(err.statusCode || 401).json({
      success: false,
      message: err.message || "Refresh failed",
    });
  }
};

exports.logout = async (req, res) => {
  try {
    await revokeRefreshToken(req.body?.refreshToken);
    return res.json({
      success: true,
      message: "Logged out",
    });
  } catch (err) {
    logger.warn({ err: err.message }, "Logout failed");
    return res.status(400).json({
      success: false,
      message: "Logout failed",
    });
  }
};

exports.logoutAll = async (req, res) => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    await revokeAllRefreshTokens(req.user._id);
    return res.json({
      success: true,
      message: "Logged out from all devices",
    });
  } catch (err) {
    logger.warn({ err: err.message }, "Logout-all failed");
    return res.status(400).json({
      success: false,
      message: "Logout-all failed",
    });
  }
};

exports.listSessions = async (req, res) => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const sessions = await listActiveSessions(req.user._id);
    return res.json({
      success: true,
      data: sessions,
    });
  } catch (err) {
    logger.warn({ err: err.message }, "List sessions failed");
    return res.status(400).json({
      success: false,
      message: "List sessions failed",
    });
  }
};

exports.revokeSession = async (req, res) => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    await revokeSessionById(req.user._id, req.params.sessionId);
    return res.json({
      success: true,
      message: "Session revoked",
    });
  } catch (err) {
    logger.warn({ err: err.message }, "Revoke session failed");
    return res.status(err.statusCode || 400).json({
      success: false,
      message: err.message || "Revoke session failed",
    });
  }
};

exports.requestOtp = async (req, res) => {
  try {
    const result = await requestPhoneOtpLogin(req.body?.phone, req);
    return res.status(202).json({
      success: true,
      message: "OTP dispatched",
      data: result,
    });
  } catch (err) {
    logger.warn({ err: err.message }, "OTP request failed");
    return res.status(err.statusCode || 400).json({
      success: false,
      message: err.message,
    });
  }
};

exports.verifyOtp = async (req, res) => {
  try {
    const user = await verifyPhoneOtpLogin(req.body?.phone, req.body?.code);
    const payload = await buildAuthResponse(user, req, 200);
    return res.json(payload.body);
  } catch (err) {
    logger.warn({ err: err.message }, "OTP verification failed");
    return res.status(err.statusCode || 401).json({
      success: false,
      message: err.message,
    });
  }
};

exports.requestMagicLink = async (req, res) => {
  try {
    const result = await requestMagicLinkLogin(req.body?.email, req);
    return res.status(202).json({
      success: true,
      message: "Magic link generated",
      data: result,
    });
  } catch (err) {
    logger.warn({ err: err.message }, "Magic link request failed");
    return res.status(err.statusCode || 400).json({
      success: false,
      message: err.message,
    });
  }
};

exports.verifyMagicLink = async (req, res) => {
  try {
    const user = await verifyMagicLinkLogin(req.body?.token);
    const payload = await buildAuthResponse(user, req, 200);
    return res.json(payload.body);
  } catch (err) {
    logger.warn({ err: err.message }, "Magic link verification failed");
    return res.status(err.statusCode || 401).json({
      success: false,
      message: err.message,
    });
  }
};
