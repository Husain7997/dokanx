const mongoose = require("mongoose");

const authOtpRequestSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    purpose: {
      type: String,
      enum: ["LOGIN"],
      default: "LOGIN",
    },
    otpHash: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    attempts: {
      type: Number,
      default: 0,
      min: 0,
    },
    consumedAt: {
      type: Date,
      default: null,
    },
    lastSentAt: {
      type: Date,
      default: Date.now,
    },
    requestedMeta: {
      ip: { type: String, default: "" },
      userAgent: { type: String, default: "" },
      deviceId: { type: String, default: "" },
    },
  },
  {
    timestamps: true,
  }
);

authOtpRequestSchema.index({ phone: 1, purpose: 1, createdAt: -1 });

module.exports = mongoose.model("AuthOtpRequest", authOtpRequestSchema);
