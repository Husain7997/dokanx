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
