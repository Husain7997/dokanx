const mongoose = require("mongoose");

const posSessionSchema = new mongoose.Schema(
  {
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
      index: true,
    },
    terminalId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    openedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    status: {
      type: String,
      enum: ["OPEN", "SYNCING", "CLOSED"],
      default: "OPEN",
      index: true,
    },
    openedAt: {
      type: Date,
      default: Date.now,
    },
    lastSyncedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

posSessionSchema.index({ shopId: 1, terminalId: 1, status: 1 });

module.exports =
  mongoose.models.PosSession ||
  mongoose.model("PosSession", posSessionSchema);
