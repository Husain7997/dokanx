const mongoose = require('mongoose');

const SettlementSchema = new mongoose.Schema(
  {
    shop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shop',
      required: true,
    },

    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    status: {
      type: String,
      enum: ['pending', 'processing', 'paid', 'failed'],
      default: 'pending',
    },

    payoutRef: {
      type: String,
    },

    processedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.Settlement ||
  mongoose.model('Settlement', SettlementSchema);
