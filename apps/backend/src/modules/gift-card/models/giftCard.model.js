const mongoose = require("mongoose");

const giftCardSchema = new mongoose.Schema(
  {
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
      index: true,
    },
    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    initialBalance: {
      type: Number,
      required: true,
      min: 0,
    },
    remainingBalance: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ["ACTIVE", "REDEEMED", "EXPIRED", "DISABLED"],
      default: "ACTIVE",
      index: true,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    issuedTo: {
      type: String,
      default: "",
      trim: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

giftCardSchema.index({ shopId: 1, code: 1 }, { unique: true });

module.exports = mongoose.models.GiftCard || mongoose.model("GiftCard", giftCardSchema);
