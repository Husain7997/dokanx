const mongoose = require("mongoose");

const adsSyncTaskSchema = new mongoose.Schema(
  {
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AdCampaign",
      required: true,
      index: true,
    },
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
      index: true,
    },
    platform: {
      type: String,
      enum: ["facebook", "google", "youtube"],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["PENDING", "PROCESSING", "SYNCED", "FAILED"],
      default: "PENDING",
      index: true,
    },
    attempts: {
      type: Number,
      default: 0,
      min: 0,
    },
    maxAttempts: {
      type: Number,
      default: 5,
      min: 1,
    },
    nextRetryAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    lockedAt: {
      type: Date,
      default: null,
    },
    lastError: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { timestamps: true }
);

adsSyncTaskSchema.index({ campaignId: 1, platform: 1 }, { unique: true });
adsSyncTaskSchema.index({ status: 1, nextRetryAt: 1, createdAt: 1 });

module.exports =
  mongoose.models.AdsSyncTask ||
  mongoose.model("AdsSyncTask", adsSyncTaskSchema);
