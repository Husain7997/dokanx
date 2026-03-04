const mongoose = require('mongoose');

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

module.exports =
  mongoose.models.ShopWallet ||
  mongoose.model('ShopWallet', ShopWalletSchema);
