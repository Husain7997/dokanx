const mongoose = require("mongoose");

const apiUsageSchema = new mongoose.Schema(
  {
    apiKeyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ApiKey",
      required: true,
      index: true,
    },
    path: {
      type: String,
      required: true,
    },
    method: {
      type: String,
      required: true,
    },
    date: {
      type: String,
      required: true,
      index: true,
    },
    count: {
      type: Number,
      default: 0,
    },
    lastStatusCode: {
      type: Number,
      default: null,
    },
  },
  { timestamps: true }
);

apiUsageSchema.index({ apiKeyId: 1, path: 1, method: 1, date: 1 }, { unique: true });

module.exports =
  mongoose.models.ApiUsage ||
  mongoose.model("ApiUsage", apiUsageSchema);
