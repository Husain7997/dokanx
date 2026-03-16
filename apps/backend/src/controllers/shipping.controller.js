const Order = require("../models/order.model");
const Shipment = require("../models/shipment.model");
const { randomToken } = require("../utils/crypto.util");
const { createAudit } = require("../utils/audit.util");
const shippingGateway = require("../services/shipping/shippingGateway.service");

exports.getRates = async (req, res) => {
  const { destination } = req.query;
  if (!destination) return res.status(400).json({ message: "destination required" });

  res.json({
    data: [
      { id: "standard", name: "Standard", fee: 120, etaDays: 3 },
      { id: "express", name: "Express", fee: 220, etaDays: 1 },
    ],
  });
};

exports.listCarriers = async (_req, res) => {
  res.json({
    data: [
      { id: "dokanx", name: "DokanX Logistics", supportsTracking: true },
      { id: "pathao", name: "Pathao", supportsTracking: true },
      { id: "paperfly", name: "Paperfly", supportsTracking: true },
    ],
  });
};

exports.createShipment = async (req, res) => {
  const { orderId, carrier } = req.body || {};
  if (!orderId || !carrier) {
    return res.status(400).json({ message: "orderId and carrier required" });
  }

  const order = await Order.findById(orderId);
  if (!order) return res.status(404).json({ message: "Order not found" });

  const gatewayResult = await shippingGateway.createShipment({ carrier, orderId });
  const trackingNumber = gatewayResult.trackingNumber || `trk_${randomToken(8)}`;

  const shipment = await Shipment.create({
    orderId: order._id,
    shopId: order.shopId,
    carrier,
    trackingNumber,
    metadata: gatewayResult,
    events: [
      {
        status: "CREATED",
        message: "Shipment created",
        timestamp: new Date(),
      },
    ],
  });

  order.status = "SHIPPED";
  await order.save();

  res.status(201).json({ data: shipment });

  await createAudit({
    action: "CREATE_SHIPMENT",
    performedBy: req.user?._id,
    targetType: "Shipment",
    targetId: shipment._id,
    req,
  });
};

exports.handleWebhook = async (req, res) => {
  const carrier = req.headers["x-shipping-carrier"] || req.body.carrier;
  if (!carrier) return res.status(400).json({ message: "carrier required" });

  const parsed = await shippingGateway.parseWebhook(carrier, req.body);
  const shipment = await Shipment.findOne({ trackingNumber: parsed.trackingNumber });
  if (!shipment) return res.status(404).json({ message: "Shipment not found" });

  shipment.status = parsed.status || shipment.status;
  shipment.events.push({
    status: parsed.status,
    message: parsed.message || "",
    timestamp: new Date(),
  });
  await shipment.save();

  res.json({ data: shipment });
};

exports.getTracking = async (req, res) => {
  const { trackingNumber } = req.params;
  const shipment = await Shipment.findOne({ trackingNumber });
  if (!shipment) return res.status(404).json({ message: "Shipment not found" });
  res.json({ data: shipment });
};
