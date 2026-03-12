const mongoose = require("mongoose");

const analyticsSnapshotSchema = new mongoose.Schema(
  {
    shopId: {
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
    dateKey: {
      type: String,
      required: true,
      index: true,
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

analyticsSnapshotSchema.index({ shopId: 1, metricType: 1, dateKey: 1 }, { unique: true });

module.exports =
  mongoose.models.AnalyticsSnapshot ||
  mongoose.model("AnalyticsSnapshot", analyticsSnapshotSchema);
