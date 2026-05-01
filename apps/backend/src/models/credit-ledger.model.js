// models/credit-ledger.model.js
const mongoose = require('mongoose');

const creditLedgerSchema = new mongoose.Schema({
  _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['ISSUED', 'REPAID', 'ADJUSTMENT'], required: true },
  amount: { type: Number, required: true },
  outstandingBefore: { type: Number, required: true },
  outstandingAfter: { type: Number, required: true },
  dueDate: { type: Date },
  reason: { type: String }, // 'PURCHASE', 'MANUAL_ADJUSTMENT'
  reference: { type: String }, // orderId, adjustmentId
  performedBy: {
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: String
  },
  createdAt: { type: Date, default: Date.now }
});

// Indexes for performance
creditLedgerSchema.index({ customerId: 1, createdAt: -1 });
creditLedgerSchema.index({ type: 1, createdAt: -1 });

module.exports = mongoose.model('CreditLedger', creditLedgerSchema);