const mongoose = require("mongoose");

const SettlementSchema = new mongoose.Schema(
  {
    shop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
      index: true,
    },

    totalAmount: { type: Number, required: true },
    commission: { type: Number, default: 0 },
    netAmount: { type: Number, required: true },

    orderCount: { type: Number, required: true },

    status: {
      type: String,
      enum: ["PENDING", "COMPLETED", "FAILED"],
      default: "PENDING",
    },

    payoutRef: String,
    processedAt: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Settlement", SettlementSchema);
