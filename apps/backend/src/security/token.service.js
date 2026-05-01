const jwt = require("jsonwebtoken");
const { hashSecret, randomToken } = require("../utils/crypto.util");

const ACCESS_TTL = process.env.JWT_ACCESS_EXPIRES_IN || "15m";
const REFRESH_TTL = process.env.JWT_REFRESH_EXPIRES_IN || "30d";
const ACCESS_SECRET = process.env.JWT_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
const REFRESH_COOKIE_NAME = process.env.JWT_REFRESH_COOKIE_NAME || "dx_refresh_token";

function buildAccessPayload(user) {
  return {
    id: String(user._id),
    role: user.role,
    shopId: user.shopId || null,
  };
}

function generateAccessToken(user) {
  return jwt.sign(buildAccessPayload(user), ACCESS_SECRET, {
    expiresIn: ACCESS_TTL,
  });
}

function generateRefreshToken(user, context = {}) {
  const tokenId = randomToken(24);
  const refreshToken = jwt.sign(
    {
      id: String(user._id),
      tokenId,
      deviceId: context.deviceId || null,
      sessionVersion: Number(user.sessionVersion || 0),
    },
    REFRESH_SECRET,
    { expiresIn: REFRESH_TTL }
  );

  return {
    refreshToken,
    tokenId,
    hashedToken: hashSecret(refreshToken),
  };
}

function verifyAccessToken(token) {
  return jwt.verify(token, ACCESS_SECRET);
}

function verifyRefreshToken(token) {
  return jwt.verify(token, REFRESH_SECRET);
}

function parseDurationMs(value, fallbackMs) {
  if (!value || typeof value !== "string") return fallbackMs;
  const match = value.trim().match(/^(\d+)([smhd])$/i);
  if (!match) return fallbackMs;

  const amount = Number(match[1] || 0);
  const unit = String(match[2] || "d").toLowerCase();
  const unitMs = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return amount * (unitMs[unit] || fallbackMs);
}

function getRefreshCookieOptions() {
  const secure = String(process.env.NODE_ENV || "").toLowerCase() === "production";
  return {
    httpOnly: true,
    secure,
    sameSite: secure ? "strict" : "lax",
    path: "/api/auth",
    maxAge: parseDurationMs(REFRESH_TTL, 30 * 24 * 60 * 60 * 1000),
  };
}

module.exports = {
  REFRESH_COOKIE_NAME,
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  getRefreshCookieOptions,
};
