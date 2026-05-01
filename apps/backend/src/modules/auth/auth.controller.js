const { randomUUID } = require("crypto");
const bcrypt = require("bcryptjs");

const User = require("../../models/user.model");
const RefreshToken = require("../../models/refreshToken.model");
const SensitiveOtpChallenge = require("../../models/sensitiveOtpChallenge.model");
const generateToken = require("../../utils/generateToken");
const { hashSecret } = require("../../utils/crypto.util");
const { t } = require("@/core/infrastructure");
const { ensureCustomerIdentityForUser } = require("../customer/customer.identity.service");
const {
  REFRESH_COOKIE_NAME,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  getRefreshCookieOptions,
} = require("../../security/token.service");
const { issueSensitiveOtpChallenge, consumeSensitiveOtpChallenge } = require("../../security/sensitiveOtp.service");
const { recordLoginFailure, logSecurityEvent } = require("../../services/securityResponse.service");

const loginAttemptStore = new Map();
const LOGIN_WINDOW_MS = 60 * 1000;
const LOGIN_LIMIT = Number(process.env.AUTH_LOGIN_RATE_LIMIT || 5);

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizePhone(value) {
  return String(value || "").trim();
}

function normalizePhoneDigits(value) {
  return String(value || "").replace(/\D/g, "") || null;
}

function getClientIp(req) {
  return req.ip || req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown";
}

function getAttemptKey(req, email) {
  return `${getClientIp(req)}:${normalizeEmail(email)}`;
}

function checkLoginAttemptBudget(req, email) {
  const key = getAttemptKey(req, email);
  const now = Date.now();
  const record = loginAttemptStore.get(key);

  if (!record || record.expiresAt <= now) {
    loginAttemptStore.set(key, { count: 0, expiresAt: now + LOGIN_WINDOW_MS });
    return true;
  }

  return record.count < LOGIN_LIMIT;
}

function recordFailedLogin(req, email) {
  const key = getAttemptKey(req, email);
  const now = Date.now();
  const existing = loginAttemptStore.get(key);
  if (!existing || existing.expiresAt <= now) {
    loginAttemptStore.set(key, { count: 1, expiresAt: now + LOGIN_WINDOW_MS });
    return;
  }
  existing.count += 1;
}

function clearFailedLogins(req, email) {
  loginAttemptStore.delete(getAttemptKey(req, email));
}

function buildUserResponse(user) {
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    shopId: user.shopId || null,
  };
}

async function persistRefreshToken(user, req) {
  const deviceId = String(req.headers["x-device-id"] || "").trim() || null;
  const { refreshToken, tokenId, hashedToken } = generateRefreshToken(user, { deviceId });
  const decoded = verifyRefreshToken(refreshToken);

  await RefreshToken.create({
    userId: user._id,
    tokenId,
    tokenHash: hashedToken,
    deviceId,
    ip: getClientIp(req),
    userAgent: String(req.headers["user-agent"] || "").slice(0, 512) || null,
    expiresAt: new Date(decoded.exp * 1000),
  });

  return refreshToken;
}

function attachRefreshCookie(res, refreshToken) {
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, getRefreshCookieOptions());
}

function clearRefreshCookie(res) {
  const options = getRefreshCookieOptions();
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: options.httpOnly,
    secure: options.secure,
    sameSite: options.sameSite,
    path: options.path,
  });
}

function validateRegisterInput(body = {}) {
  const name = String(body.name || "").trim();
  const email = normalizeEmail(body.email);
  const phone = normalizePhone(body.phone);
  const password = String(body.password || "");
  const role = String(body.role || "CUSTOMER").trim().toUpperCase() || "CUSTOMER";

  if (!name || name.length < 2) {
    return { error: "Name must be at least 2 characters", status: 400 };
  }

  if (!email && !phone) {
    return { error: "Email or phone is required", status: 400 };
  }

  if (!email) {
    return { error: "Email is required", status: 400 };
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email)) {
    return { error: "Valid email is required", status: 400 };
  }

  if (phone) {
    const phonePattern = /^\+?[0-9\-()\s]{8,20}$/;
    if (!phonePattern.test(phone)) {
      return { error: "Valid phone number is required", status: 400 };
    }
  }

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters", status: 400 };
  }

  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return { error: "Password must include letters and numbers", status: 400 };
  }

  return {
    value: {
      name,
      email,
      phone: phone || null,
      password,
      role,
    },
  };
}

function validatePasswordStrength(password) {
  if (password.length < 8) {
    return "Password must be at least 8 characters";
  }
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return "Password must include letters and numbers";
  }
  return null;
}

exports.register = async (req, res) => {
  try {
    const validation = validateRegisterInput(req.body || {});
    if (validation.error) {
      return res.status(validation.status || 400).json({
        success: false,
        message: validation.error,
      });
    }

    const { name, email, phone, password, role } = validation.value;
    const normalizedPhone = normalizePhoneDigits(phone);
    const existingConditions = [{ email }];
    if (normalizedPhone) {
      existingConditions.push({ normalizedPhone });
    }

    const existing = await User.findOne({ $or: existingConditions });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: existing.email === email ? t("auth.user_exists") : "Phone already in use",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      phone,
      password: hashedPassword,
      role,
      shopId: null,
    });
    await ensureCustomerIdentityForUser(user);

    const accessToken = generateAccessToken(user);
    const refreshToken = await persistRefreshToken(user, req);
    attachRefreshCookie(res, refreshToken);

    return res.status(201).json({
      message: t("common.updated", req.lang),
      token: accessToken,
      accessToken,
      user: buildUserResponse(user),
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.login = async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const password = String(req.body?.password || "");

  if (!checkLoginAttemptBudget(req, email)) {
    return res.status(429).json({
      success: false,
      message: "Too many login attempts. Try again in a minute.",
    });
  }

  const user = await User.findOne({ email }).select("+password");
  if (!user) {
    recordFailedLogin(req, email);
    await recordLoginFailure(req, { email });
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    recordFailedLogin(req, email);
    await recordLoginFailure(req, { email, userId: user._id });
    return res.status(401).json({ message: "Invalid credentials" });
  }

  clearFailedLogins(req, email);
  await ensureCustomerIdentityForUser(user);

  const accessToken = generateToken(user);
  const refreshToken = await persistRefreshToken(user, req);
  attachRefreshCookie(res, refreshToken);

  return res.json({
    success: true,
    token: accessToken,
    accessToken,
    user: buildUserResponse(user),
  });
};

exports.refresh = async (req, res) => {
  try {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME] || String(req.body?.refreshToken || "").trim();
    if (!refreshToken) {
      return res.status(401).json({ success: false, message: "Refresh token missing" });
    }

    const decoded = verifyRefreshToken(refreshToken);
    const storedToken = await RefreshToken.findOne({
      tokenHash: hashSecret(refreshToken),
      userId: decoded.id,
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    });

    if (!storedToken) {
      clearRefreshCookie(res);
      return res.status(401).json({ success: false, message: "Refresh token invalid" });
    }

    const user = await User.findById(decoded.id);
    if (!user || Number(user.sessionVersion || 0) !== Number(decoded.sessionVersion || 0)) {
      await RefreshToken.updateOne(
        { _id: storedToken._id },
        { $set: { revokedAt: new Date(), revokedReason: "session-version-mismatch" } }
      );
      clearRefreshCookie(res);
      return res.status(401).json({ success: false, message: "Session expired" });
    }

    storedToken.lastUsedAt = new Date();
    await storedToken.save();

    const accessToken = generateAccessToken(user);
    return res.json({
      success: true,
      token: accessToken,
      accessToken,
      user: buildUserResponse(user),
    });
  } catch (_error) {
    clearRefreshCookie(res);
    return res.status(401).json({ success: false, message: "Refresh token invalid" });
  }
};

exports.logout = async (req, res) => {
  const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME] || String(req.body?.refreshToken || "").trim();
  if (refreshToken) {
    await RefreshToken.updateOne(
      { tokenHash: hashSecret(refreshToken), revokedAt: null },
      { $set: { revokedAt: new Date(), revokedReason: "logout" } }
    );
  }

  clearRefreshCookie(res);
  return res.json({ success: true, message: "Logged out" });
};

exports.acceptInvitation = async (req, res) => {
  try {
    const { token, password, name } = req.body || {};
    if (!token || !password) {
      return res.status(400).json({ message: "Token and password are required" });
    }

    const user = await User.findOne({
      invitationToken: token,
      invitationExpiresAt: { $gt: new Date() },
    }).select("+password");

    if (!user) {
      return res.status(404).json({ message: "Invitation not found or expired" });
    }

    user.password = await bcrypt.hash(password, 10);
    if (name) user.name = name;
    user.invitationToken = null;
    user.invitationExpiresAt = null;
    user.sessionVersion = Number(user.sessionVersion || 0) + 1;
    await user.save();
    await ensureCustomerIdentityForUser(user);

    const accessToken = generateAccessToken(user);
    const refreshToken = await persistRefreshToken(user, req);
    attachRefreshCookie(res, refreshToken);

    return res.json({
      message: "Invitation accepted",
      token: accessToken,
      accessToken,
      user: buildUserResponse(user),
      inviteId: randomUUID(),
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.requestPasswordReset = async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  if (!email) {
    return res.status(400).json({ success: false, message: "Email is required" });
  }

  const user = await User.findOne({ email });
  if (!user || !user.phone) {
    await logSecurityEvent({
      type: "PASSWORD_RESET_REQUESTED",
      severity: "LOW",
      req,
      userId: user?._id || null,
      metadata: {
        email,
        status: user ? "missing-phone" : "not-found",
      },
    });

    return res.json({
      success: true,
      message: "If an account exists, a reset code was sent.",
    });
  }

  try {
    const challenge = await issueSensitiveOtpChallenge({
      user,
      action: "PASSWORD_RESET",
      targetId: String(user._id),
      targetType: "user",
      req,
    });

    return res.json({
      success: true,
      message: "If an account exists, a reset code was sent.",
      data: challenge,
    });
  } catch (err) {
    await logSecurityEvent({
      type: "PASSWORD_RESET_REQUEST_FAILED",
      severity: "MEDIUM",
      req,
      userId: user?._id || null,
      metadata: { email, error: err.message },
    });
    return res.status(500).json({ success: false, message: "Unable to issue reset code" });
  }
};

exports.resetPasswordWithOtp = async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const code = String(req.body?.code || "").trim();
  const password = String(req.body?.password || "");

  if (!email || !code || !password) {
    return res.status(400).json({ success: false, message: "Email, code, and password are required" });
  }

  const strengthError = validatePasswordStrength(password);
  if (strengthError) {
    return res.status(400).json({ success: false, message: strengthError });
  }

  const user = await User.findOne({ email }).select("+password");
  if (!user) {
    await logSecurityEvent({
      type: "PASSWORD_RESET_FAILED",
      severity: "MEDIUM",
      req,
      metadata: { email, reason: "not-found" },
    });
    return res.status(403).json({ success: false, message: "Invalid reset code" });
  }

  const pendingChallenge = await SensitiveOtpChallenge.findOne({
    userId: user._id,
    action: "PASSWORD_RESET",
    status: "PENDING",
  }).sort({ createdAt: -1 });

  if (!pendingChallenge) {
    await logSecurityEvent({
      type: "PASSWORD_RESET_FAILED",
      severity: "MEDIUM",
      req,
      userId: user._id,
      metadata: { email, reason: "no-challenge" },
    });
    return res.status(403).json({ success: false, message: "Invalid reset code" });
  }

  try {
    await consumeSensitiveOtpChallenge({
      user,
      action: "PASSWORD_RESET",
      challengeId: pendingChallenge.challengeId,
      code,
      targetId: String(user._id),
      req,
    });

    user.password = await bcrypt.hash(password, 10);
    user.sessionVersion = Number(user.sessionVersion || 0) + 1;
    await user.save();

    await RefreshToken.updateMany(
      { userId: user._id, revokedAt: null },
      { $set: { revokedAt: new Date(), revokedReason: "password-reset" } }
    );

    await logSecurityEvent({
      type: "PASSWORD_RESET_SUCCEEDED",
      severity: "MEDIUM",
      req,
      userId: user._id,
      metadata: { email },
    });

    return res.json({ success: true, message: "Password reset successful" });
  } catch (err) {
    await logSecurityEvent({
      type: "PASSWORD_RESET_FAILED",
      severity: "HIGH",
      req,
      userId: user._id,
      metadata: { email, reason: err.message },
    });
    return res.status(403).json({ success: false, message: "Invalid reset code" });
  }
};
