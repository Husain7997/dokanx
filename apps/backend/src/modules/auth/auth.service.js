const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const RefreshToken = require("@/models/refreshToken.model");

const ACCESS_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";
const REFRESH_TTL_DAYS = Number(process.env.REFRESH_TOKEN_TTL_DAYS || 30);

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

module.exports = {
  signAccessToken,
  issueRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllRefreshTokens,
  listActiveSessions,
  revokeSessionById,
};
