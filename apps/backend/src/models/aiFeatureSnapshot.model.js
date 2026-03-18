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
  { featureType: 1, entityId: 1, snapshotDate: 1 },
  { unique: true }
);

module.exports =
  mongoose.models.AiFeatureSnapshot ||
  mongoose.model("AiFeatureSnapshot", aiFeatureSnapshotSchema);
