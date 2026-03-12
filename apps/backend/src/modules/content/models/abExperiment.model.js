const mongoose = require("mongoose");

const abExperimentSchema = new mongoose.Schema(
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
    },
    targetType: {
      type: String,
      enum: ["PRODUCT_PAGE", "CHECKOUT", "CMS_PAGE", "PROMOTION"],
      required: true,
    },
    variants: {
      type: [
        new mongoose.Schema(
          {
            key: { type: String, required: true },
            weight: { type: Number, default: 50 },
            metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
    status: {
      type: String,
      enum: ["DRAFT", "RUNNING", "COMPLETED"],
      default: "DRAFT",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.models.AbExperiment || mongoose.model("AbExperiment", abExperimentSchema);
