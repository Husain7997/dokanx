const mongoose = require("mongoose");

const automationRuleSchema = new mongoose.Schema(
  {
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    trigger: {
      type: String,
      enum: ["ABANDONED_CART", "WELCOME", "REENGAGEMENT", "BIRTHDAY", "FIRST_PURCHASE"],
      required: true,
    },
    channel: {
      type: String,
      enum: ["SMS", "EMAIL", "BOTH"],
      default: "BOTH",
    },
    actionType: {
      type: String,
      enum: ["COUPON", "MESSAGE", "REMINDER"],
      default: "MESSAGE",
    },
    delayMinutes: {
      type: Number,
      default: 0,
      min: 0,
    },
    enabled: {
      type: Boolean,
      default: true,
      index: true,
    },
    template: {
      subject: { type: String, default: "", trim: true, maxlength: 160 },
      body: { type: String, default: "", trim: true, maxlength: 5000 },
    },
    audience: {
      customerTags: [{ type: String, trim: true }],
      minOrders: { type: Number, default: 0, min: 0 },
      inactiveDays: { type: Number, default: 0, min: 0 },
    },
    reward: {
      couponCode: { type: String, default: "", trim: true, uppercase: true },
      discountValue: { type: Number, default: 0, min: 0 },
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

automationRuleSchema.index({ shopId: 1, trigger: 1, enabled: 1 });

module.exports = mongoose.model("MarketingAutomationRule", automationRuleSchema);
