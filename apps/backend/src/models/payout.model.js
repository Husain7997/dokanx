// apps/backend/src/models/Payout.js
const mongoose = require('mongoose');

const PayoutSchema = new mongoose.Schema(
  {
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shop',
      required: true,
    },
    // shop: {
    //     type: mongoose.Schema.Types.ObjectId,
    //     ref: 'Shop',
    //     required: true,
    //     index: true,
    //   },
    initiatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
 status: {
  type: String,
  enum: ['PENDING', 'PROCESSING', 'SUCCESS', 'FAILED'],
  default: 'PENDING',
},

    type: {
      type: String,
        enum: ['AUTO', 'MANUAL'],
      // enum: ['ADMIN_INITIATED', 'SHOP_REQUESTED'],
      required: true,
    },
    idempotencyKey: {
      type: String,
      unique: true,
      sparse: true,
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    reference: {
      type: String,
      unique: true,
    },
    executedAt: Date,
    payoutDate: {
      type: Date,
      default: Date.now,
    },
    transactionId: {
      type: String,
    },
  },
  { timestamps: true }
);

// module.exports = mongoose.model('Payout', PayoutSchema);

module.exports = mongoose.models.Payout || mongoose.model("Payout", PayoutSchema);