const mongoose = require("mongoose");

const walletSchema = new mongoose.Schema(
  {
    ownerType: {
      type: String,
      enum: ["SHOP", "ADMIN"],
      required: true,
    },

    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
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

// one wallet per owner
walletSchema.index(
  { user: 1, shop: 1 },
  { unique: true }
);

module.exports = mongoose.model("Wallet", walletSchema);
