const mongoose = require('mongoose');

const approvalRequestSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['REFUND', 'ADJUSTMENT', 'PAYOUT'],
      required: true
    },
    referenceId: { type: mongoose.Schema.Types.ObjectId, required: true },
    shopId: { type: mongoose.Schema.Types.ObjectId },
    amount: { type: Number, required: true },
    reason: { type: String, required: true },

    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'PENDING'
    },

    makerId: { type: mongoose.Schema.Types.ObjectId, required: true },
    checkerId: mongoose.Schema.Types.ObjectId,
    checkerComment: String
  },
  { timestamps: true }
);

// module.exports = mongoose.model('ApprovalRequest', approvalRequestSchema);

module.exports =
  mongoose.models.ApprovalRequest ||
  mongoose.model("ApprovalRequest", approvalRequestSchema);