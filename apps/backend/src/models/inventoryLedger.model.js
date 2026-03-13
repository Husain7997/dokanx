const mongoose = require("mongoose");

const inventoryLedgerSchema =
  new mongoose.Schema(
{
  shopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Shop",
    required: true,
    index: true,
  },

  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
    index: true,
  },

  type: {
    type: String,
    enum: [
      "ORDER_RESERVE",
      "ORDER_COMMIT",
      "ORDER_CANCEL",
      "RESTOCK",
      "MANUAL_ADJUST",
      "REFUND",
      "AUTO_REPAIR_STOCK",
      "AUTO_REPAIR_RESERVED",
    ],
    required: true,
  },

  direction: {
    type: String,
    enum: ["IN", "OUT"],
    required: true,
  },

  quantity: {
    type: Number,
    required: true,
  },

  referenceId: String,
  referenceModel: String,

  idempotencyKey: {
    type: String,
    unique: true,
    sparse: true,
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
},
{ timestamps: true }
);

inventoryLedgerSchema.index({
  product: 1,
  createdAt: 1,
});

inventoryLedgerSchema.index({
  shopId: 1,
  product: 1,
});



module.exports =
  mongoose.models.InventoryLedger ||
  mongoose.model("InventoryLedger", inventoryLedgerSchema);
