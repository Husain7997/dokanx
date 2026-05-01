const mongoose = require("mongoose");

const sensitiveOtpChallengeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
      index: true,
    },
    challengeId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    targetId: {
      type: String,
      default: null,
      index: true,
    },
    targetType: {
      type: String,
      default: null,
    },
    codeHash: {
      type: String,
      required: true,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    maxAttempts: {
      type: Number,
      default: 5,
    },
    status: {
      type: String,
      enum: ["PENDING", "CONSUMED", "FAILED", "CANCELLED", "EXPIRED"],
      default: "PENDING",
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    consumedAt: {
      type: Date,
      default: null,
    },
    metadata: {
      type: Object,
      default: null,
    },
  },
  { timestamps: true }
);

sensitiveOtpChallengeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports =
  mongoose.models.SensitiveOtpChallenge ||
  mongoose.model("SensitiveOtpChallenge", sensitiveOtpChallengeSchema);
