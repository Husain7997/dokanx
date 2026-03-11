const mongoose = require("mongoose");

const magicLinkTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    tokenHash: {
      type: String,
      required: true,
      index: true,
    },
    purpose: {
      type: String,
      enum: ["LOGIN"],
      default: "LOGIN",
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    consumedAt: {
      type: Date,
      default: null,
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

magicLinkTokenSchema.index({ email: 1, purpose: 1, createdAt: -1 });

module.exports = mongoose.model("MagicLinkToken", magicLinkTokenSchema);
