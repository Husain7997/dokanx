const mongoose = require("mongoose");

const cmsPageSchema = new mongoose.Schema(
  {
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
      index: true,
    },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    body: {
      type: String,
      default: "",
    },
    seo: {
      title: { type: String, default: "" },
      description: { type: String, default: "" },
      schemaType: { type: String, default: "WebPage" },
    },
    status: {
      type: String,
      enum: ["DRAFT", "PUBLISHED"],
      default: "DRAFT",
    },
  },
  { timestamps: true }
);

cmsPageSchema.index({ shopId: 1, slug: 1 }, { unique: true });

module.exports = mongoose.models.CmsPage || mongoose.model("CmsPage", cmsPageSchema);
