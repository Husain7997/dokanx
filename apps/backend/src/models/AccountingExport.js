const mongoose = require('mongoose');

const accountingExportSchema = new mongoose.Schema(
  {
    period: { type: String, required: true }, // 2026-01
    exportedAt: { type: Date, default: Date.now },
    exportedBy: mongoose.Schema.Types.ObjectId,

    target: {
      type: String,
      enum: ['XERO', 'QUICKBOOKS', 'CSV'],
      required: true
    },

    recordCount: Number,
    checksum: String // hash of payload
  },
  { timestamps: true }
);

accountingExportSchema.index({ period: 1, target: 1 }, { unique: true });

module.exports =
  mongoose.models.AccountingExport ||
  mongoose.model("AccountingExport", accountingExportSchema);


