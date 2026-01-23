const mongoose = require("mongoose");

const settlementSchema = new mongoose.Schema({
  shop: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Shop",
    required: true,
    index: true,
  },

  periodStart: Date,
  periodEnd: Date,

  grossAmount: {
    type: Number,
    required: true,
  },

  platformFee: {
    type: Number,
    required: true,
  },

  netAmount: {
    type: Number,
    required: true,
  },

  orderIds: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
    },
  ],

  status: {
    type: String,
    enum: ["PENDING", "COMPLETED"],
    default: "COMPLETED",
  },

  idempotencyKey: {
    type: String,
    unique: true,
    sparse: true,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Settlement", settlementSchema);
