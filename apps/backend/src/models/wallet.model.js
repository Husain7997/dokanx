const mongoose = require("mongoose");

const WalletSchema = new mongoose.Schema(
  {
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
      unique: true,
      index: true
    },

    balance: {
      type: Number,
      default: 0
    },

    currency: {
      type: String,
      default: "BDT"
    },

    status: {
      type: String,
      enum: ["ACTIVE", "FROZEN"],
      default: "ACTIVE"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Wallet", WalletSchema);
