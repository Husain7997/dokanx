const mongoose = require('mongoose');

const settlementSchema = new mongoose.Schema(
  {
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shop',
      required: true,
      index: true,
    },

    orderCount: { type: Number, default: 0 },
    grossAmount: { type: Number, default: 0 },
    netPayable: { type: Number, default: 0 },

    status: {
      type: String,
      enum: ['PENDING', 'PAID'],
      default: 'PENDING',
    },

    idempotencyKey: {
      type: String,
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

// 🔒 hard idempotency guarantee
settlementSchema.index(
  { shopId: 1, idempotencyKey: 1 },
  { unique: true }
);

module.exports =
  mongoose.models.Settlement ||
  mongoose.model('Settlement', settlementSchema);


