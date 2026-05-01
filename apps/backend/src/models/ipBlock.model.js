const mongoose = require("mongoose");

const ipBlockSchema = new mongoose.Schema(
  {
    ip: { type: String, required: true, unique: true, index: true },
    reason: { type: String, default: "" },
    status: { type: String, enum: ["BLOCKED", "UNBLOCKED"], default: "BLOCKED" },
    blockedUntil: { type: Date, default: null, index: true },
    source: { type: String, enum: ["MANUAL", "AUTO"], default: "MANUAL" },
    triggerCount: { type: Number, default: 0 },
    blockedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    unblockedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    unblockedAt: { type: Date, default: null },
    metadata: { type: Object, default: null },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.IpBlock ||
  mongoose.model("IpBlock", ipBlockSchema);
