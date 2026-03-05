const mongoose = require("mongoose");

const PlatformConfigSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    value: { type: mongoose.Schema.Types.Mixed, required: true },
    scope: { type: String, enum: ["GLOBAL", "TENANT"], default: "GLOBAL" },
    tenantId: { type: mongoose.Schema.Types.ObjectId, default: null, index: true },
    description: { type: String, default: "" }
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.PlatformConfig ||
  mongoose.model("PlatformConfig", PlatformConfigSchema);
