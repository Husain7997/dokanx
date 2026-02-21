const mongoose = require("mongoose");

const inventoryLedgerSchema = new mongoose.Schema(
{
  shop: {
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
      "PURCHASE",
      "SALE",
      "RESTOCK",
      "ADJUSTMENT",
      "RETURN",
      "CANCEL",
      "DAMAGE",
    ],
    required: true,
  },

  quantity: {
    type: Number,
    required: true,
  },

  direction: {
    type: String,
    enum: ["IN", "OUT"],
    required: true,
  },

  referenceId: String,
  referenceModel: String,

  note: String,

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
},
{ timestamps: true }
);

module.exports = mongoose.model(
  "InventoryLedger",
  inventoryLedgerSchema
);