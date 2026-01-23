// apps/backend/src/models/Payout.js
const mongoose = require('mongoose');

const PayoutSchema = new mongoose.Schema(
  {
    shop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shop',
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ['PENDING', 'COMPLETED', 'FAILED'],
      default: 'PENDING',
    },
    payoutDate: {
      type: Date,
      default: Date.now,
    },
    transactionId: {
      type: String, // Optional, external payment reference
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Payout', PayoutSchema);
