const mongoose = require("mongoose");

const walletSchema = new mongoose.Schema(
  {
    ownerType: {
    type: String,
    enum: ["SHOP", "USER", "ADMIN"],
    required: true
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
    store: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
      unique: true,
    },

    balance: {
      type: Number,
      default: 0,
    },

    currency: {
      type: String,
      default: "BDT",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Wallet", walletSchema);
