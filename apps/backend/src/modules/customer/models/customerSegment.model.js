const mongoose = require("mongoose");

const customerSegmentSchema = new mongoose.Schema(
  {
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    criteria: {
      minOrders: { type: Number, default: 0 },
      minSpend: { type: Number, default: 0 },
      inactiveDays: { type: Number, default: 0 },
    },
    stats: {
      customerCount: { type: Number, default: 0 },
      avgOrderValue: { type: Number, default: 0 },
    },
    isSystem: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

customerSegmentSchema.index({ shopId: 1, name: 1 }, { unique: true });

module.exports =
  mongoose.models.CustomerSegment ||
  mongoose.model("CustomerSegment", customerSegmentSchema);
