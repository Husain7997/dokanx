const mongoose = require("mongoose");

const searchSyncLogSchema = new mongoose.Schema(
  {
    level: { type: String, enum: ["INFO", "ERROR"], default: "INFO" },
    message: { type: String, required: true },
    details: { type: Object, default: null },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.SearchSyncLog ||
  mongoose.model("SearchSyncLog", searchSyncLogSchema);
