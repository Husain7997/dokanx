const mongoose = require("mongoose");

const MetricBucketSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true
    },
    minuteAt: {
      type: Date,
      required: true,
      index: true
    },
    ordersCount: { type: Number, default: 0 },
    walletTxCount: { type: Number, default: 0 },
    inventoryMovesCount: { type: Number, default: 0 },
    computedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

MetricBucketSchema.index({ tenantId: 1, minuteAt: 1 }, { unique: true });

module.exports =
  mongoose.models.MetricBucket ||
  mongoose.model("MetricBucket", MetricBucketSchema);
