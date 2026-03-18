const mongoose = require("mongoose");

const searchQueryLogSchema = new mongoose.Schema(
  {
    query: { type: String, required: true },
    queryNormalized: { type: String, required: true, index: true },
    searchId: { type: String, default: null, index: true },
    entityTypes: { type: [String], default: [] },
    filters: { type: Object, default: {} },
    resultsCount: { type: Number, default: 0 },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: "Shop", default: null },
  },
  { timestamps: true }
);

searchQueryLogSchema.index({ createdAt: -1 });

module.exports =
  mongoose.models.SearchQueryLog ||
  mongoose.model("SearchQueryLog", searchQueryLogSchema);
