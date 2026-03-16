const mongoose = require("mongoose");

const shipmentEventSchema = new mongoose.Schema(
  {
    status: String,
    location: String,
    message: String,
    timestamp: Date,
  },
  { _id: false }
);

const shipmentSchema = new mongoose.Schema(
  {
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true, index: true },
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: "Shop", required: true, index: true },
    carrier: { type: String, required: true },
    trackingNumber: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: ["CREATED", "IN_TRANSIT", "DELIVERED", "FAILED"],
      default: "CREATED",
    },
    events: { type: [shipmentEventSchema], default: [] },
    metadata: { type: Object, default: null },
    lastSyncedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Shipment || mongoose.model("Shipment", shipmentSchema);
