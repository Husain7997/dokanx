const mongoose = require("mongoose");

const securityEventSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      index: true,
    },
    severity: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
      default: "MEDIUM",
      index: true,
    },
    ip: {
      type: String,
      default: null,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      default: null,
      index: true,
    },
    route: {
      type: String,
      default: "",
      index: true,
    },
    method: {
      type: String,
      default: "",
    },
    statusCode: {
      type: Number,
      default: null,
    },
    requestId: {
      type: String,
      default: null,
      index: true,
    },
    fingerprint: {
      type: String,
      default: null,
    },
    userAgent: {
      type: String,
      default: "",
    },
    metadata: {
      type: Object,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.SecurityEvent ||
  mongoose.model("SecurityEvent", securityEventSchema);
