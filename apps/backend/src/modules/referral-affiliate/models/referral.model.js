const mongoose = require("mongoose");

const referralSchema = new mongoose.Schema(
  {
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
      index: true,
    },
    referrerUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    refereePhone: {
      type: String,
      required: true,
      trim: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    rewardAmount: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["PENDING", "REDEEMED"],
      default: "PENDING",
    },
    redeemedByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    redeemedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

referralSchema.index({ shopId: 1, referrerUserId: 1, createdAt: -1 });

module.exports =
  mongoose.models.Referral ||
  mongoose.model("Referral", referralSchema);
