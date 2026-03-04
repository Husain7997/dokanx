const mongoose = require("mongoose");

const checkoutLockSchema = new mongoose.Schema(
  {
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
      index: true,
    },

    key: {
      type: String,
      required: true,
      unique: true,
    },

    expiresAt: {
      type: Date,
      index: { expires: 0 },
    },
  },
  { timestamps: true }
);


module.exports =
  mongoose.models.CheckoutLock ||
  mongoose.model("CheckoutLock", checkoutLockSchema);