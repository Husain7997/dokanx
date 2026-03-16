const mongoose = require("mongoose");

const searchSyncStateSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    lastRunAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.SearchSyncState ||
  mongoose.model("SearchSyncState", searchSyncStateSchema);
