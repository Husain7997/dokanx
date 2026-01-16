const mongoose = require("mongoose");

const inventoryTransactionSchema = new mongoose.Schema(
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
    "IN",        // stock added
    "OUT",       // stock deducted
    "ADJUSTMENT" // manual correction
  ],
//         enum: [
//   "INVENTORY_CREATED",
//   "RESERVED",
//   "RELEASED",
//   "DEDUCTED",
//   "RESTORED"
// ],
      required: true,
    },

    quantity: {
      type: Number,
      required: true,
    },

    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
    },

    note: {
      type: String,
    },
  },
  { timestamps: true }
);


module.exports =  mongoose.models.InventoryTransaction || mongoose.model("InventoryTransaction", inventoryTransactionSchema);

