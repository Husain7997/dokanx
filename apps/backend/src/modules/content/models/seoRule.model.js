const mongoose = require("mongoose");

const seoRuleSchema = new mongoose.Schema(
  {
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
      index: true,
    },
    entityType: {
      type: String,
      enum: ["PRODUCT", "CATEGORY", "PAGE", "SHOP"],
      required: true,
    },
    entityRef: {
      type: String,
      required: true,
      trim: true,
    },
    metaTitleTemplate: {
      type: String,
      default: "",
    },
    metaDescriptionTemplate: {
      type: String,
      default: "",
    },
    schemaType: {
      type: String,
      default: "WebPage",
    },
    canonicalUrl: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

seoRuleSchema.index({ shopId: 1, entityType: 1, entityRef: 1 }, { unique: true });

module.exports = mongoose.models.SeoRule || mongoose.model("SeoRule", seoRuleSchema);
