const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema(
  {
    date: { type: String, required: true }, // YYYY-MM-DD
    type: {
      type: String,
      enum: ['WALLET_LEDGER', 'PLATFORM_COMMISSION'],
      default: 'WALLET_LEDGER',
      index: true,
    },
    scope: {
      type: String,
      enum: ['SYSTEM', 'SHOP'],
      default: 'SYSTEM',
      index: true,
    },
    scopeRef: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true,
    },

    ledgerBalance: Number,
    walletBalance: Number,
    settlementCommission: { type: Number, default: 0 },
    ledgerCommission: { type: Number, default: 0 },
    merchantDirectCount: { type: Number, default: 0 },
    ledgerEntryCount: { type: Number, default: 0 },

    difference: Number,
    status: {
      type: String,
      enum: ['MATCHED', 'MISMATCH'],
      required: true
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);



module.exports =
  mongoose.models.ReconciliationReport ||
  mongoose.model('ReconciliationReport', reportSchema);
