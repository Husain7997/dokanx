const mongoose = require("mongoose");

const intelligenceMetricSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      default: null,
      index: true,
    },
    metricType: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    latencyMs: {
      type: Number,
      default: 0,
      min: 0,
    },
    accuracyScore: {
      type: Number,
      default: null,
      min: 0,
      max: 1,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

intelligenceMetricSchema.index({ tenantId: 1, metricType: 1, createdAt: -1 });

module.exports =
  mongoose.models.IntelligenceMetric ||
  mongoose.model("IntelligenceMetric", intelligenceMetricSchema);
