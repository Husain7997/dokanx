const Order = require("../models/order.model");
const Shipment = require("../models/shipment.model");
const { randomToken } = require("../utils/crypto.util");
const { createAudit } = require("../utils/audit.util");

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

  const trackingNumber = `trk_${randomToken(8)}`;

  const shipment = await Shipment.create({
    orderId: order._id,
    shopId: order.shopId,
    carrier,
    trackingNumber,
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

exports.getTracking = async (req, res) => {
  const { trackingNumber } = req.params;
  const shipment = await Shipment.findOne({ trackingNumber });
  if (!shipment) return res.status(404).json({ message: "Shipment not found" });
  res.json({ data: shipment });
};
