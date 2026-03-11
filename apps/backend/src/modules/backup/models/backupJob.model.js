const mongoose = require("mongoose");

const backupJobSchema = new mongoose.Schema(
  {
    scope: {
      type: String,
      enum: ["SYSTEM", "SHOP"],
      default: "SYSTEM",
      index: true,
    },
    scopeRef: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true,
    },
    backupType: {
      type: String,
      enum: ["INCREMENTAL", "FULL", "WEEKLY", "MONTHLY"],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["SCHEDULED", "RUNNING", "COMPLETED", "FAILED", "CANCELLED"],
      default: "SCHEDULED",
      index: true,
    },
    storageTarget: {
      type: String,
      default: "primary-region",
      trim: true,
      maxlength: 120,
    },
    retentionDays: {
      type: Number,
      required: true,
      min: 1,
    },
    scheduledFor: {
      type: Date,
      default: Date.now,
      index: true,
    },
    startedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    snapshotLabel: {
      type: String,
      default: "",
      trim: true,
      maxlength: 160,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

backupJobSchema.index({ backupType: 1, status: 1, scheduledFor: -1 });

module.exports = mongoose.model("BackupJob", backupJobSchema);
