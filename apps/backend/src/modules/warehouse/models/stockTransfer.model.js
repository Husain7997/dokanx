const mongoose = require("mongoose");

const stockTransferSchema = new mongoose.Schema(
  {
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
      index: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    fromWarehouseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Warehouse",
      required: true,
      index: true,
    },
    toWarehouseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Warehouse",
      required: true,
      index: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    status: {
      type: String,
      enum: ["REQUESTED", "APPROVED", "SHIPPED", "RECEIVED", "CANCELLED"],
      default: "REQUESTED",
      index: true,
    },
    notes: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    shippedAt: {
      type: Date,
      default: null,
    },
    receivedAt: {
      type: Date,
      default: null,
    },
    history: {
      type: [
        {
          status: { type: String, required: true },
          actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
          note: { type: String, default: "", trim: true },
          createdAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

stockTransferSchema.index({ shopId: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model("StockTransfer", stockTransferSchema);
