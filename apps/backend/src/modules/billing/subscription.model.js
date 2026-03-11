const mongoose = require("mongoose");

const schema = new mongoose.Schema(
  {
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
      unique: true,
    },
    plan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plan",
      required: true,
    },
    status: {
      type: String,
      enum: ["ACTIVE", "PAST_DUE", "CANCELLED", "TRIAL"],
      default: "ACTIVE",
      index: true,
    },
    currentPeriodEnd: Date,
    overrides: {
      monthlyFee: { type: Number, default: null, min: 0 },
      commissionRate: { type: Number, default: null, min: 0, max: 100 },
      smsQuota: { type: Number, default: null, min: 0 },
      features: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
      },
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);



module.exports =
  mongoose.models.Subscription ||
  mongoose.model("Subscription", schema);
