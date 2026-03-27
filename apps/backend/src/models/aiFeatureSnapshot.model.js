const mongoose = require("mongoose");

const aiFeatureSnapshotSchema = new mongoose.Schema(
  {
    featureType: {
      type: String,
      enum: ["customer", "product", "shop"],
      required: true,
      index: true,
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    snapshotDate: {
      type: String,
      required: true,
      index: true,
    },
    snapshotWindow: {
      type: String,
      enum: ["1d", "7d", "30d"],
      default: "30d",
      index: true,
    },
    version: {
      type: String,
      default: "v2",
      index: true,
    },
    snapshotTimestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    features: {
      type: Object,
      default: {},
    },
    explanations: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

aiFeatureSnapshotSchema.index(
  { featureType: 1, entityId: 1, snapshotDate: 1, snapshotWindow: 1, version: 1 },
  { unique: true }
);
aiFeatureSnapshotSchema.index({ snapshotTimestamp: -1 });
aiFeatureSnapshotSchema.index({ featureType: 1, snapshotWindow: 1, snapshotTimestamp: -1 });

module.exports =
  mongoose.models.AiFeatureSnapshot ||
  mongoose.model("AiFeatureSnapshot", aiFeatureSnapshotSchema);
