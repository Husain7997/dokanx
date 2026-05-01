const crypto = require("crypto");
const SensitiveOtpChallenge = require("../models/sensitiveOtpChallenge.model");
const { sendSms } = require("../infrastructure/notifications/sms.provider");
const { logSecurityEvent } = require("../services/securityResponse.service");

const OTP_ACTIONS = new Set([
  "PAYMENT_REFUND",
  "ADJUSTMENT_REFUND",
  "ADJUSTMENT_WALLET",
  "PAYOUT_APPROVE",
  "PAYOUT_EXECUTE",
  "PAYOUT_MANUAL",
  "PAYOUT_RETRY",
  "SETTLEMENT_PAYOUT",
  "SETTLEMENT_RETRY",
  "PASSWORD_RESET",
]);

function normalizeAction(action) {
  return String(action || "").trim().toUpperCase();
}

function assertSupportedAction(action) {
  const normalizedAction = normalizeAction(action);
  if (!OTP_ACTIONS.has(normalizedAction)) {
    const error = new Error("Unsupported OTP action");
    error.statusCode = 400;
    throw error;
  }

  return normalizedAction;
}

function getOtpSettings() {
  return {
    ttlMs: Number(process.env.SENSITIVE_OTP_TTL_MS || 5 * 60 * 1000),
    maxAttempts: Number(process.env.SENSITIVE_OTP_MAX_ATTEMPTS || 5),
    codeLength: Number(process.env.SENSITIVE_OTP_CODE_LENGTH || 6),
  };
}

function hashOtpCode(code) {
  const secret = process.env.SENSITIVE_OTP_SECRET || process.env.JWT_SECRET || "dokanx-sensitive-otp";
  return crypto
    .createHash("sha256")
    .update(`${secret}:${String(code || "")}`)
    .digest("hex");
}

function generateOtpCode(codeLength) {
  const length = Math.min(Math.max(codeLength, 4), 8);
  const min = 10 ** (length - 1);
  const max = (10 ** length) - 1;
  return String(crypto.randomInt(min, max + 1));
}

function shouldExposePreviewCode() {
  return ["development", "test"].includes(String(process.env.NODE_ENV || "").toLowerCase());
}

async function issueSensitiveOtpChallenge({ user, action, targetId, targetType = null, req }) {
  const normalizedAction = assertSupportedAction(action);
  const normalizedTargetId = String(targetId || "").trim();

  if (!normalizedTargetId) {
    const error = new Error("targetId is required for OTP challenge");
    error.statusCode = 400;
    throw error;
  }

  if (!user?._id) {
    const error = new Error("Authenticated user is required");
    error.statusCode = 401;
    throw error;
  }

  if (!user.phone) {
    const error = new Error("A verified phone number is required for OTP");
    error.statusCode = 400;
    throw error;
  }

  const { ttlMs, maxAttempts, codeLength } = getOtpSettings();
  const code = generateOtpCode(codeLength);
  const challengeId = crypto.randomBytes(18).toString("hex");
  const expiresAt = new Date(Date.now() + ttlMs);

  await SensitiveOtpChallenge.updateMany(
    {
      userId: user._id,
      action: normalizedAction,
      targetId: normalizedTargetId,
      status: "PENDING",
    },
    {
      $set: {
        status: "CANCELLED",
        consumedAt: new Date(),
      },
    }
  );

  const challenge = await SensitiveOtpChallenge.create({
    userId: user._id,
    action: normalizedAction,
    challengeId,
    targetId: normalizedTargetId,
    targetType: targetType ? String(targetType).trim() : null,
    codeHash: hashOtpCode(code),
    attempts: 0,
    maxAttempts,
    expiresAt,
    metadata: {
      ip: req?.ip || null,
      userAgent: req?.headers?.["user-agent"] || "",
    },
  });

  await sendSms(
    user.phone,
    `DokanX security code ${code}. Valid for 5 minutes. Do not share this code.`
  );

  await logSecurityEvent({
    type: "OTP_CHALLENGE_ISSUED",
    severity: "MEDIUM",
    req,
    userId: user._id,
    metadata: {
      action: normalizedAction,
      targetId: normalizedTargetId,
      targetType: challenge.targetType,
    },
  });

  return {
    challengeId: challenge.challengeId,
    expiresAt: challenge.expiresAt,
    previewCode: shouldExposePreviewCode() ? code : null,
  };
}

async function consumeSensitiveOtpChallenge({ user, action, challengeId, code, targetId, req }) {
  const normalizedAction = assertSupportedAction(action);
  const normalizedChallengeId = String(challengeId || "").trim();
  const normalizedCode = String(code || "").trim();
  const normalizedTargetId = String(targetId || "").trim();

  if (!normalizedChallengeId || !normalizedCode) {
    const error = new Error("OTP verification required");
    error.statusCode = 403;
    throw error;
  }

  const challenge = await SensitiveOtpChallenge.findOne({
    challengeId: normalizedChallengeId,
    userId: user?._id,
    action: normalizedAction,
    status: "PENDING",
  });

  if (!challenge) {
    const error = new Error("OTP challenge not found or already used");
    error.statusCode = 403;
    throw error;
  }

  if (challenge.expiresAt && challenge.expiresAt.getTime() <= Date.now()) {
    challenge.status = "EXPIRED";
    challenge.consumedAt = new Date();
    await challenge.save();
    const error = new Error("OTP challenge has expired");
    error.statusCode = 403;
    throw error;
  }

  if (!normalizedTargetId || challenge.targetId !== normalizedTargetId) {
    const error = new Error("OTP challenge target mismatch");
    error.statusCode = 403;
    throw error;
  }

  if (challenge.codeHash !== hashOtpCode(normalizedCode)) {
    challenge.attempts += 1;
    if (challenge.attempts >= challenge.maxAttempts) {
      challenge.status = "FAILED";
      challenge.consumedAt = new Date();
    }
    await challenge.save();

    await logSecurityEvent({
      type: "OTP_VERIFICATION_FAILED",
      severity: "HIGH",
      req,
      userId: user?._id || null,
      metadata: {
        action: normalizedAction,
        targetId: normalizedTargetId,
        challengeId: normalizedChallengeId,
        attempts: challenge.attempts,
      },
    });

    const error = new Error("Invalid OTP code");
    error.statusCode = 403;
    throw error;
  }

  challenge.status = "CONSUMED";
  challenge.consumedAt = new Date();
  await challenge.save();

  await logSecurityEvent({
    type: "OTP_VERIFICATION_SUCCEEDED",
    severity: "MEDIUM",
    req,
    userId: user?._id || null,
    metadata: {
      action: normalizedAction,
      targetId: normalizedTargetId,
      challengeId: normalizedChallengeId,
    },
  });

  return challenge;
}

module.exports = {
  OTP_ACTIONS,
  consumeSensitiveOtpChallenge,
  issueSensitiveOtpChallenge,
  normalizeAction,
};
