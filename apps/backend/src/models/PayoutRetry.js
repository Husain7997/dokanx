const mongoose = require("mongoose");

const payoutRetrySchema = new mongoose.Schema({
  payoutId: { type: mongoose.Schema.Types.ObjectId, unique: true },
  attempts: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ["PENDING", "SUCCESS", "FAILED"],
    default: "PENDING"
  },
  lastError: String,
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("PayoutRetry", payoutRetrySchema);
