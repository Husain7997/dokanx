const mongoose = require("mongoose");

const deliveryGroupSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    orders: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Order",
      },
    ],
    destinationHash: {
      type: String,
      required: true,
      index: true,
    },
    totalDistance: {
      type: Number,
      default: 0,
    },
    deliveryCharge: {
      type: Number,
      default: 0,
    },
    route: {
      type: [Object],
      default: [],
    },
    zone: {
      type: String,
      default: "default",
    },
    status: {
      type: String,
      enum: ["OPEN", "LOCKED", "COMPLETED"],
      default: "OPEN",
      index: true,
    },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.DeliveryGroup ||
  mongoose.model("DeliveryGroup", deliveryGroupSchema);
