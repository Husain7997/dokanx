const mongoose = require("mongoose");

const pageSchema = new mongoose.Schema(
  {
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: "Shop", required: true, index: true },
    slug: { type: String, required: true, index: true },
    title: { type: String, required: true },
    body: { type: String, default: "" },
    status: { type: String, enum: ["DRAFT", "PUBLISHED"], default: "DRAFT" },
  },
  { timestamps: true }
);

pageSchema.index({ shopId: 1, slug: 1 }, { unique: true });

module.exports = mongoose.models.Page || mongoose.model("Page", pageSchema);
