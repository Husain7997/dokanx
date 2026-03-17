const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  price: {
    type: Number,
    required: true
  }
});

const orderSchema = new mongoose.Schema(
  {
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shop',
      required: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null   // 🔥 REQUIRED REMOVED
    },
    items: [orderItemSchema],
    totalAmount: {
      type: Number,
      required: true
    },
    isGuest: {
      type: Boolean,
      default: false
    },

    contact: {
      phone: String,
      email: String
    },

    isCompleted: {
      type: Boolean,
      default: false
    },
    paymentStatus: {
  type: String,
  enum: ["INITIATED","PENDING", "SUCCESS", "FAILED"],
  default: "INITIATED"
},

    status: {
      type: String,
      enum: [
        "PLACED",
        "PAYMENT_PENDING",
        "PAYMENT_FAILED",
        "CONFIRMED",
        "SHIPPED",
        "DELIVERED",
        "CANCELLED",
        "REFUNDED"
      ],
      default: "PLACED"
    },
    disputeStatus: {
      type: String,
      enum: ["NONE", "OPEN", "IN_REVIEW", "RESOLVED", "REJECTED"],
      default: "NONE",
      index: true,
    },
    adminNotes: {
      type: String,
      default: "",
    },
    channel: {
      type: String,
      enum: ["WEB", "MOBILE", "POS", "API"],
      default: "WEB",
    },
      isSettled: {   // ✅ এই ফিল্ড add করুন
    type: Boolean,
    default: false,
  },

  },
  { timestamps: true }
);

module.exports = mongoose.models.Order || mongoose.model('Order', orderSchema);
