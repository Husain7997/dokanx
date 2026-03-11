const mongoose = require("mongoose");

const courierEventSchema = new mongoose.Schema(
  {
    event: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    status: {
      type: String,
      default: "",
      trim: true,
      uppercase: true,
    },
    note: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },
    rawPayload: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const courierShipmentSchema = new mongoose.Schema(
  {
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
      index: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    courier: {
      type: String,
      enum: ["PATHAO", "REDX", "STEADFAST", "ECOURIER", "PAPERFLY"],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["CREATED", "ORDER_PICKED", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED", "RETURNED", "FAILED"],
      default: "CREATED",
      index: true,
    },
    trackingCode: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },
    externalReference: {
      type: String,
      trim: true,
      default: "",
    },
    recipient: {
      name: { type: String, default: "", trim: true, maxlength: 120 },
      phone: { type: String, default: "", trim: true, maxlength: 32 },
      address: { type: String, default: "", trim: true, maxlength: 500 },
    },
    cashOnDeliveryAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    codCollectedAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    codReconciliationStatus: {
      type: String,
      enum: ["PENDING", "MATCHED", "MISMATCH"],
      default: "PENDING",
      index: true,
    },
    events: {
      type: [courierEventSchema],
      default: [],
    },
    lastWebhookAt: {
      type: Date,
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

courierShipmentSchema.index({ shopId: 1, orderId: 1, courier: 1 }, { unique: true });

module.exports = mongoose.model("CourierShipment", courierShipmentSchema);
