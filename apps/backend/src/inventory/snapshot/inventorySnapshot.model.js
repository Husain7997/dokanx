const mongoose = require("mongoose");

const schema = new mongoose.Schema({
  product: { type: mongoose.Types.ObjectId, ref: "Product" },

  available: Number,
  reserved: Number,

  lastLedgerId: mongoose.Types.ObjectId,

  createdAt: {
    type: Date,
    default: Date.now,
  },
});



module.exports =
  mongoose.models.InventorySnapshot ||
  mongoose.model("InventorySnapshot", schema);