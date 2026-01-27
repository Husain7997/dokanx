const mongoose = require("mongoose");
const paymentSchema = new mongoose.Schema({
  shop: { type: mongoose.Schema.Types.ObjectId, ref: "Shop", required: true },
  order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },

  provider: { type: String, required: true },
  providerPaymentId: { type: String, required: true, index: true },

  amount: { type: Number, required: true },
  currency: { type: String, default: "BDT" },

  status: {
    type: String,
    enum: ["PENDING", "SUCCESS", "FAILED"],
    default: "PENDING"
  },

  webhookProcessed: {
    type: Boolean,
    default: false
  }

}, { timestamps: true });

// const paymentSchema = new mongoose.Schema(
//   {
//     order: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Order",
//       required: true,
//     },
//     transactionId: {
//   type: String,
//   sparse: true,   // 👈 IMPORTANT
//   index: true,
// },

//     attemptNo: {
//       type: Number,
//       required: true,
//     },

//     amount: {
//       type: Number,
//       required: true,
//     },

//     status: {
//       type: String,
//       enum: ["PENDING", "SUCCESS", "FAILED"],
//       default: "PENDING",
//     },

//     gateway: {
//       type: String,
//       default: "MANUAL",
//     },

//     gatewayPaymentId: {
//       type: String,
//     },
//   },
//   { timestamps: true }
// );
paymentSchema.index(
  { gateway: 1, gatewayTxnId: 1 },
  { unique: true }
);

// module.exports = mongoose.model("Payment", paymentSchema);

module.exports = mongoose.models.Payment || mongoose.model("Payment", paymentSchema);
