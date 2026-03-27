const mongoose = require('mongoose');
const logger = require("../infrastructure/logger/logger");
const {
  applyNormalizedOrderFields,
} = require("../utils/order-normalization.util");

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    default: null
  },
  name: {
    type: String,
    default: ""
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

const orderProtectionSnapshotItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    enabled: {
      type: Boolean,
      default: false,
    },
    durationDays: {
      type: Number,
      default: 0,
      min: 0,
    },
    type: {
      type: String,
      default: null,
    },
    expiryDate: {
      type: Date,
      default: null,
    },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    shop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shop',
      default: null
    },
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shop',
      required: true,
      index: true
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true
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
  enum: ["INITIATED","PENDING", "SUCCESS", "FAILED", "UNPAID"],
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
    disputeReason: {
      type: String,
      enum: ["NONE", "CUSTOMER_CLAIM", "DELIVERY_DELAY", "DAMAGED", "PAYMENT_ISSUE", "FRAUD", "OTHER"],
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
    trafficType: {
      type: String,
      enum: ["direct", "marketplace"],
      default: "marketplace",
      index: true,
    },
    commissionSnapshot: {
      rate: { type: Number, default: 0 },
      amount: { type: Number, default: 0 },
      source: { type: String, default: "shop_default" },
      appliedAt: { type: Date, default: null },
      meta: { type: Object, default: {} },
    },
    deliveryGroupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DeliveryGroup",
      default: null,
      index: true,
    },
    creditSaleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CreditSale",
      default: null,
      index: true,
    },
    paymentMode: {
      type: String,
      enum: ["ONLINE", "COD", "CREDIT", "WALLET"],
      default: "ONLINE",
    },
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Campaign",
      default: null,
    },
    deliveryAddress: {
      line1: { type: String, default: "" },
      line2: { type: String, default: "" },
      city: { type: String, default: "" },
      area: { type: String, default: "" },
      postalCode: { type: String, default: "" },
      country: { type: String, default: "" },
      coordinates: {
        lat: { type: Number, default: null },
        lng: { type: Number, default: null },
      },
    },
    metadata: {
      type: Object,
      default: {},
    },
    warrantySnapshot: {
      type: [orderProtectionSnapshotItemSchema],
      default: [],
    },
    guaranteeSnapshot: {
      type: [orderProtectionSnapshotItemSchema],
      default: [],
    },
    isSettled: {
      type: Boolean,
      default: false,
    },

  },
  { timestamps: true }
);

orderSchema.pre("validate", function normalizeLegacyFields() {
  const before = {
    shop: this.shop,
    shopId: this.shopId,
    customer: this.customer,
    customerId: this.customerId,
    user: this.user,
  };

  applyNormalizedOrderFields(this, { logDifferences: false });

  const differences = [];
  if (!before.shopId && this.shopId && before.shop) differences.push("shop->shopId");
  if (!before.customerId && this.customerId && before.customer) differences.push("customer->customerId");
  if (!before.customerId && this.customerId && before.user) differences.push("user->customerId");

  if (differences.length) {
    logger.warn(
      {
        orderId: this._id ? String(this._id) : null,
        differences,
      },
      "Order schema normalized legacy references"
    );
  }

});

module.exports = mongoose.models.Order || mongoose.model('Order', orderSchema);

