const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const RefreshToken = require("@/models/refreshToken.model");
const User = require("@/models/user.model");
const AuthOtpRequest = require("./models/authOtpRequest.model");
const MagicLinkToken = require("./models/magicLinkToken.model");

const ACCESS_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";
const REFRESH_TTL_DAYS = Number(process.env.REFRESH_TOKEN_TTL_DAYS || 30);
const OTP_TTL_MINUTES = Number(process.env.AUTH_OTP_TTL_MINUTES || 10);
const MAGIC_LINK_TTL_MINUTES = Number(process.env.AUTH_MAGIC_LINK_TTL_MINUTES || 20);
const MAX_OTP_ATTEMPTS = Number(process.env.AUTH_OTP_MAX_ATTEMPTS || 5);

function signAccessToken(user) {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
      shopId: user.shopId || null,
    },
    process.env.JWT_SECRET,
    { expiresIn: ACCESS_EXPIRES_IN }
  );
}

function randomToken() {
  return crypto.randomBytes(48).toString("hex");
}

function randomOtpCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function hashToken(token) {
  return crypto.createHash("sha256").update(String(token)).digest("hex");
}

function readDeviceId(req) {
  return String(req.headers["x-device-id"] || req.body?.deviceId || "").trim();
}

function readRequestMeta(req) {
  return {
    deviceId: readDeviceId(req),
    userAgent: String(req.headers["user-agent"] || ""),
    ip: String(req.ip || ""),
  };
}

function normalizePhone(phone) {
  const raw = String(phone || "").trim();
  if (raw.startsWith("+880")) return `0${raw.slice(4)}`;
  if (raw.startsWith("880")) return `0${raw.slice(3)}`;
  return raw;
}

function shouldExposeDebugAuthMaterial() {
  return process.env.NODE_ENV === "test" || process.env.AUTH_INCLUDE_DEBUG_CREDENTIALS === "true";
}

async function issueRefreshToken(user, req) {
  const rawToken = randomToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000);
  const meta = readRequestMeta(req);

  await RefreshToken.create({
    userId: user._id,
    tokenHash,
    expiresAt,
    ...meta,
  });

  return {
    refreshToken: rawToken,
    refreshTokenExpiresAt: expiresAt.toISOString(),
  };
}

async function rotateRefreshToken(refreshToken, req) {
  const tokenHash = hashToken(refreshToken);
  const session = await RefreshToken.findOne({
    tokenHash,
    revokedAt: null,
  });

  if (!session) {
    const err = new Error("Invalid refresh token");
    err.statusCode = 401;
    throw err;
  }

  if (session.expiresAt.getTime() <= Date.now()) {
    session.revokedAt = new Date();
    await session.save();
    const err = new Error("Refresh token expired");
    err.statusCode = 401;
    throw err;
  }

  session.revokedAt = new Date();
  session.lastUsedAt = new Date();
  await session.save();

  const next = await issueRefreshToken({ _id: session.userId }, req);
  return {
    userId: session.userId,
    ...next,
  };
}

async function revokeRefreshToken(refreshToken) {
  if (!refreshToken) return;

  await RefreshToken.findOneAndUpdate(
    { tokenHash: hashToken(refreshToken), revokedAt: null },
    { $set: { revokedAt: new Date() } }
  );
}

async function revokeAllRefreshTokens(userId) {
  await RefreshToken.updateMany(
    { userId, revokedAt: null },
    { $set: { revokedAt: new Date() } }
  );
}

async function listActiveSessions(userId) {
  const sessions = await RefreshToken.find({
    userId,
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  })
    .sort({ lastUsedAt: -1, createdAt: -1 })
    .lean();

  return sessions.map(session => ({
    id: String(session._id),
    deviceId: session.deviceId || "",
    userAgent: session.userAgent || "",
    ip: session.ip || "",
    createdAt: session.createdAt,
    lastUsedAt: session.lastUsedAt,
    expiresAt: session.expiresAt,
  }));
}

async function revokeSessionById(userId, sessionId) {
  const session = await RefreshToken.findOneAndUpdate(
    {
      _id: sessionId,
      userId,
      revokedAt: null,
    },
    {
      $set: { revokedAt: new Date() },
    },
    { new: true }
  );

  if (!session) {
    const err = new Error("Session not found");
    err.statusCode = 404;
    throw err;
  }

  return session;
}

async function requestPhoneOtpLogin(phone, req) {
  const normalizedPhone = normalizePhone(phone);
  const user = await User.findOne({ phone: normalizedPhone, isBlocked: { $ne: true } });

  if (!user) {
    const err = new Error("User not found for this phone");
    err.statusCode = 404;
    throw err;
  }

  const code = randomOtpCode();
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  const record = await AuthOtpRequest.create({
    userId: user._id,
    phone: normalizedPhone,
    purpose: "LOGIN",
    otpHash: hashToken(code),
    expiresAt,
    attempts: 0,
    consumedAt: null,
    lastSentAt: new Date(),
    requestedMeta: readRequestMeta(req),
  });

  return {
    requestId: String(record._id),
    phone: normalizedPhone,
    expiresAt: expiresAt.toISOString(),
    channel: "SMS",
    debugCode: shouldExposeDebugAuthMaterial() ? code : undefined,
  };
}

async function verifyPhoneOtpLogin(phone, code) {
  const normalizedPhone = normalizePhone(phone);
  const record = await AuthOtpRequest.findOne({
    phone: normalizedPhone,
    purpose: "LOGIN",
    consumedAt: null,
  }).sort({ createdAt: -1 });

  if (!record) {
    const err = new Error("OTP request not found");
    err.statusCode = 404;
    throw err;
  }

  if (record.expiresAt.getTime() <= Date.now()) {
    const err = new Error("OTP expired");
    err.statusCode = 401;
    throw err;
  }

  if (Number(record.attempts || 0) >= MAX_OTP_ATTEMPTS) {
    const err = new Error("OTP attempts exceeded");
    err.statusCode = 429;
    throw err;
  }

  const incomingHash = hashToken(String(code || "").trim());
  if (incomingHash !== record.otpHash) {
    record.attempts = Number(record.attempts || 0) + 1;
    await record.save();
    const err = new Error("Invalid OTP");
    err.statusCode = 401;
    throw err;
  }

  record.consumedAt = new Date();
  await record.save();

  const user = await User.findById(record.userId);
  if (!user || user.isBlocked) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }

  return user;
}

async function requestMagicLinkLogin(email, req) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail, isBlocked: { $ne: true } });

  if (!user) {
    const err = new Error("User not found for this email");
    err.statusCode = 404;
    throw err;
  }

  const rawToken = randomToken();
  const expiresAt = new Date(Date.now() + MAGIC_LINK_TTL_MINUTES * 60 * 1000);

  const record = await MagicLinkToken.create({
    userId: user._id,
    email: normalizedEmail,
    tokenHash: hashToken(rawToken),
    purpose: "LOGIN",
    expiresAt,
    consumedAt: null,
    requestedMeta: readRequestMeta(req),
  });

  return {
    requestId: String(record._id),
    email: normalizedEmail,
    expiresAt: expiresAt.toISOString(),
    channel: "EMAIL",
    debugToken: shouldExposeDebugAuthMaterial() ? rawToken : undefined,
  };
}

async function verifyMagicLinkLogin(token) {
  const tokenHash = hashToken(token);
  const record = await MagicLinkToken.findOne({
    tokenHash,
    consumedAt: null,
    purpose: "LOGIN",
  });

  if (!record) {
    const err = new Error("Magic link not found");
    err.statusCode = 404;
    throw err;
  }

  if (record.expiresAt.getTime() <= Date.now()) {
    const err = new Error("Magic link expired");
    err.statusCode = 401;
    throw err;
  }

  record.consumedAt = new Date();
  await record.save();

  const user = await User.findById(record.userId);
  if (!user || user.isBlocked) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }

  return user;
}

module.exports = {
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
};
