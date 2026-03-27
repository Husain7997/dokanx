const mongoose = require("mongoose");

const searchIndexSchema = new mongoose.Schema(
  {
    entityType: { type: String, required: true, index: true },
    entityId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: "Shop", default: null, index: true },
    name: { type: String, default: "" },
    category: { type: String, default: "" },
    brand: { type: String, default: "" },
    text: { type: String, required: true },
  },
  { timestamps: true }
);

searchIndexSchema.index({ text: "text" });

module.exports =
  mongoose.models.SearchIndex ||
  mongoose.model("SearchIndex", searchIndexSchema);
