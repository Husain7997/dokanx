const mongoose = require("mongoose");

const agentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    agentCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
      uppercase: true,
      trim: true,
    },
    phone: {
      type: String,
      default: "",
      trim: true,
    },
    district: {
      type: String,
      default: "",
      trim: true,
    },
    experience: {
      type: String,
      default: "",
      trim: true,
    },
    referredShops: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "Shop",
      default: [],
    },
    totalEarnings: {
      type: Number,
      default: 0,
    },
    availableBalance: {
      type: Number,
      default: 0,
    },
    lifetimeCommission: {
      type: Number,
      default: 0,
    },
    tokenBalance: {
      type: Number,
      default: 0,
    },
    clickCount: {
      type: Number,
      default: 0,
    },
    signupCount: {
      type: Number,
      default: 0,
    },
    shopConversionCount: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["PENDING", "ACTIVE", "BANNED"],
      default: "ACTIVE",
      index: true,
    },
    tier: {
      type: String,
      enum: ["BASIC", "PRO", "ELITE"],
      default: "BASIC",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Agent || mongoose.model("Agent", agentSchema);
