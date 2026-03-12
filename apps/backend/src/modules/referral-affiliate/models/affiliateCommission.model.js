const mongoose = require("mongoose");

const affiliateCommissionSchema = new mongoose.Schema(
  {
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
      index: true,
    },
    affiliateUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    orderAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    commissionAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "PAID"],
      default: "PENDING",
    },
  },
  { timestamps: true }
);

affiliateCommissionSchema.index({ shopId: 1, affiliateUserId: 1, createdAt: -1 });
affiliateCommissionSchema.index({ shopId: 1, orderId: 1, affiliateUserId: 1 }, { unique: true });

module.exports =
  mongoose.models.AffiliateCommission ||
  mongoose.model("AffiliateCommission", affiliateCommissionSchema);
