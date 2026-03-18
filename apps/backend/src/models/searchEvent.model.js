const mongoose = require("mongoose");

const searchEventSchema = new mongoose.Schema(
  {
    searchId: { type: String, required: true, index: true },
    query: { type: String, default: "" },
    queryNormalized: { type: String, default: "", index: true },
    eventType: {
      type: String,
      enum: ["SEARCH", "ADD_TO_CART", "CHECKOUT"],
      required: true,
      index: true,
    },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: "Shop", default: null },
    metadata: { type: Object, default: {} },
  },
  { timestamps: true }
);

searchEventSchema.index({ createdAt: -1 });

module.exports =
  mongoose.models.SearchEvent ||
  mongoose.model("SearchEvent", searchEventSchema);
