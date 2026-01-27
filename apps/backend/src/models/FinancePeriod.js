const mongoose = require('mongoose');

const financePeriodSchema = new mongoose.Schema(
  {
    period: { type: String, required: true, unique: true }, // e.g. 2026-01
    locked: { type: Boolean, default: false },
    lockedAt: Date,
    lockedBy: mongoose.Schema.Types.ObjectId
  },
  { timestamps: true }
);

// module.exports = mongoose.model('FinancePeriod', financePeriodSchema);


module.exports =
  mongoose.models.FinancePeriod ||
  mongoose.model("FinancePeriod", financePeriodSchema);