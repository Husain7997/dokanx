const mongoose = require("mongoose");

const loyaltyPointLedgerSchema = new mongoose.Schema(
  {
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
      index: true,
    },
    customerUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    customerPhone: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },
    points: {
      type: Number,
      required: true,
    },
    reason: {
      type: String,
      default: "",
      trim: true,
      maxlength: 200,
    },
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

loyaltyPointLedgerSchema.index({ shopId: 1, customerUserId: 1, createdAt: -1 });

module.exports =
  mongoose.models.LoyaltyPointLedger ||
  mongoose.model("LoyaltyPointLedger", loyaltyPointLedgerSchema);
