const mongoose = require("mongoose");
const { Schema } = mongoose;

const PlatformWalletSchema = new Schema({
  balance: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

module.exports = mongoose.models.PlatformWallet || mongoose.model("PlatformWallet", PlatformWalletSchema);
