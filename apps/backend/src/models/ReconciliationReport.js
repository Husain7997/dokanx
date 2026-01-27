const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema(
  {
    date: { type: String, required: true }, // YYYY-MM-DD

    ledgerBalance: Number,
    walletBalance: Number,

    difference: Number,
    status: {
      type: String,
      enum: ['MATCHED', 'MISMATCH'],
      required: true
    }
  },
  { timestamps: true }
);

// module.exports = mongoose.model('ReconciliationReport', reportSchema);

module.exports =
  mongoose.models.ReconciliationReport ||
  mongoose.model('ReconciliationReport', reportSchema);