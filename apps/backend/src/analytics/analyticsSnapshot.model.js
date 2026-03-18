const mongoose = require("mongoose");

const analyticsSnapshotSchema = new mongoose.Schema(
  {
    metricType: {
      type: String,
      required: true,
      index: true,
    },
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      default: null,
      index: true,
    },
    dateKey: {
      type: Date,
      required: true,
      index: true,
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  { timestamps: true }
);

analyticsSnapshotSchema.index(
  { metricType: 1, shopId: 1, dateKey: 1 },
  { unique: true }
);

module.exports =
  mongoose.models.AnalyticsSnapshot ||
  mongoose.model("AnalyticsSnapshot", analyticsSnapshotSchema);

