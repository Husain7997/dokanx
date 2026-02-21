const mongoose = require("mongoose");

const SettlementSchema = new mongoose.Schema(
  {
    shopId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "Shop",
  required: true,
  index: true,
},

idempotencyKey: {
  type: String,
  unique: true,
  sparse: true,
},

taxAmount: {
  type: Number,
  default: 0,
},
 netPayout: Number,
    // shop: {
    //   type: mongoose.Schema.Types.ObjectId,
    //   ref: "Shop",
    //   required: true,
    //   index: true,
    // },

    totalAmount: { type: Number, required: true },
    commission: { type: Number, default: 0 },
    netAmount: { type: Number, required: true },

    orderCount: { type: Number, required: true },

  status: {
  type: String,
  enum: ["PENDING", "PROCESSING", "COMPLETED", "FAILED"],
  default: "PENDING"
},

    payoutRef: String,
    processedAt: Date,
  },
  { timestamps: true }
);

// module.exports = mongoose.model("Settlement", SettlementSchema);

module.exports =
  mongoose.models.Settlement ||
  mongoose.model('Settlement', SettlementSchema);