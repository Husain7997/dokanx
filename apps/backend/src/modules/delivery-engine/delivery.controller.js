const deliveryService = require("./delivery.service");
const DeliveryGroup = require("./deliveryGroup.model");
const Order = require("../../models/order.model");

exports.getConfig = async (_req, res) => {
  const data = await deliveryService.getConfig();
  res.json({ data });
};

exports.updateConfig = async (req, res) => {
  const data = await deliveryService.updateConfig(req.body || {}, req.user?._id || null);
  res.json({ data: data.value || data });
};

exports.estimateCharge = async (req, res) => {
  const payload = req.body || {};
  const { stops, destination, orderId } = payload;
  const config = await deliveryService.getConfig();

  if (orderId) {
    const order = await Order.findById(orderId).lean();
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    const shopStop = {
      label: String(order.shopId || "").trim(),
      city: String(order.deliveryAddress?.city || ""),
      coordinates: order.deliveryAddress?.coordinates || null,
    };
    const estimate = await deliveryService.calculateDeliveryCharge({
      stops: [shopStop],
      destination: order.deliveryAddress || {},
      config,
    });
    return res.json({ data: estimate });
  }

  if (!Array.isArray(stops) || !destination || !destination.coordinates) {
    return res.status(400).json({ message: "stops and destination.coordinates are required" });
  }

  const estimate = await deliveryService.calculateDeliveryCharge({
    stops,
    destination,
    config,
  });

  res.json({ data: estimate });
};

exports.getGroup = async (req, res) => {
  const data = await DeliveryGroup.findById(req.params.groupId).lean();
  if (!data) return res.status(404).json({ message: "Delivery group not found" });
  const role = String(req.user?.role || "").toUpperCase();
  if (role !== "ADMIN") {
    if (role === "CUSTOMER" && String(data.customerId || "") !== String(req.user?._id || "")) {
      return res.status(403).json({ message: "Forbidden" });
    }
    if (role === "OWNER" || role === "STAFF") {
      const scopedOrder = await Order.findOne({
        _id: { $in: data.orders || [] },
        shopId: req.user?.shopId,
      })
        .select("_id")
        .lean();
      if (!scopedOrder) {
        return res.status(403).json({ message: "Forbidden" });
      }
    }
  }
  res.json({ data });
};
