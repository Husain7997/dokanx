const mongoose = require("mongoose");

const ipBlockSchema = new mongoose.Schema(
  {
    ip: { type: String, required: true, unique: true, index: true },
    reason: { type: String, default: "" },
    status: { type: String, enum: ["BLOCKED", "UNBLOCKED"], default: "BLOCKED" },
    blockedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    unblockedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.IpBlock ||
  mongoose.model("IpBlock", ipBlockSchema);
