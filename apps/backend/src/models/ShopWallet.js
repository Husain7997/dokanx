const mongoose = require('mongoose');
const logger = require("../infrastructure/logger/logger");

const ShopWalletSchema = new mongoose.Schema(
  {
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shop',
      required: true,
      unique: true,
    },
    balance: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

logger.warn("ShopWallet model is deprecated; use wallet.model.js as canonical wallet source");

module.exports =
  mongoose.models.ShopWallet ||
  mongoose.model('ShopWallet', ShopWalletSchema);
