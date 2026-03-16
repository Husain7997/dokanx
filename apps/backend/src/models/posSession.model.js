const mongoose = require("mongoose");

const posSessionSchema = new mongoose.Schema(
  {
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: "Shop", required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    status: { type: String, enum: ["OPEN", "CLOSED"], default: "OPEN" },
    openedAt: { type: Date, default: Date.now },
    closedAt: { type: Date, default: null },
    openingBalance: { type: Number, default: 0 },
    closingBalance: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.models.PosSession || mongoose.model("PosSession", posSessionSchema);
