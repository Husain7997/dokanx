const mongoose = require("mongoose");

const settlementRunSchema = new mongoose.Schema(
  {
    shop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
      index: true,
    },

    settlement: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Settlement",
    },

    idempotencyKey: {
      type: String,
      sparse: true,
      index: true,
    },

    runType: {
      type: String,
      enum: ["MANUAL", "AUTO"],
      required: true,
    },

    periodStart: {
      type: Date,
      required: true,
    },

    periodEnd: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

// ✅ Prevent duplicate runs per shop + key
settlementRunSchema.index(
  { shop: 1, idempotencyKey: 1 },
  { unique: true, sparse: true }
);

module.exports = mongoose.model("SettlementRun", settlementRunSchema);
