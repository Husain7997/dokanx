const crypto = require("crypto");
const DeliveryGroup = require("./deliveryGroup.model");
const Order = require("../../models/order.model");
const ShopLocation = require("../../models/shopLocation.model");
const SystemSetting = require("../../models/systemSetting.model");
const shippingGateway = require("../../services/shipping/shippingGateway.service");

const DEFAULT_CONFIG = {
  groupingRadiusKm: 5,
  sameZoneCharge: 80,
  groupedCharge: 120,
  externalCarrierCharge: 180,
};

function toRad(value) {
  return (value * Math.PI) / 180;
}

function calculateDistance(from, to) {
  if (!from || !to) return null;
  const dLat = toRad(Number(to.lat) - Number(from.lat));
  const dLng = toRad(Number(to.lng) - Number(from.lng));
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(Number(from.lat))) *
      Math.cos(toRad(Number(to.lat))) *
      Math.sin(dLng / 2) ** 2;
  return 6371 * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function optimizeRoute(stops = [], destination = null) {
  const remaining = [...stops];
  const route = [];
  let current = destination || remaining[0] || null;

  while (remaining.length) {
    remaining.sort((left, right) => {
      const leftDistance = calculateDistance(current?.coordinates || current, left.coordinates || left) || Number.MAX_VALUE;
      const rightDistance = calculateDistance(current?.coordinates || current, right.coordinates || right) || Number.MAX_VALUE;
      return leftDistance - rightDistance;
    });
    const next = remaining.shift();
    route.push(next);
    current = next;
  }

  return route;
}

async function getConfig() {
  const record = await SystemSetting.findOne({ key: "delivery_engine.config" }).lean();
  return {
    ...DEFAULT_CONFIG,
    ...(record?.value || {}),
  };
}

async function updateConfig(value, userId) {
  return SystemSetting.findOneAndUpdate(
    { key: "delivery_engine.config" },
    { value: { ...DEFAULT_CONFIG, ...(value || {}) }, updatedBy: userId || null },
    { upsert: true, new: true }
  );
}

function buildDestinationHash(order) {
  const address = order.deliveryAddress || {};
  const lat = address.coordinates?.lat != null ? Number(address.coordinates.lat).toFixed(3) : "";
  const lng = address.coordinates?.lng != null ? Number(address.coordinates.lng).toFixed(3) : "";
  const raw = [order.customerId, address.city, address.area, address.postalCode, lat, lng].join("|");
  return crypto.createHash("sha1").update(raw).digest("hex");
}

async function getShopStop(shopId) {
  const location = await ShopLocation.findOne({ shopId, isActive: true }).lean();
  const coordinates = location?.coordinates?.coordinates || [];
  return {
    shopId,
    coordinates: coordinates.length >= 2 ? { lat: Number(coordinates[1]), lng: Number(coordinates[0]) } : null,
    city: location?.city || "",
    label: location?.name || String(shopId),
  };
}

async function calculateDeliveryCharge({ stops, destination, config }) {
  const validStops = stops.filter((stop) => stop.coordinates);
  if (!validStops.length || !destination?.coordinates) {
    return { deliveryCharge: config.externalCarrierCharge, strategy: "external_carrier" };
  }

  const route = optimizeRoute(validStops, destination);
  let totalDistance = 0;
  let current = destination.coordinates;
  route.forEach((stop) => {
    totalDistance += calculateDistance(current, stop.coordinates) || 0;
    current = stop.coordinates;
  });

  const allCities = new Set(validStops.map((stop) => stop.city).filter(Boolean));
  if (route.length > 1 && totalDistance <= config.groupingRadiusKm) {
    return { deliveryCharge: config.groupedCharge, totalDistance, strategy: "grouped_radius", route };
  }
  if (allCities.size <= 1) {
    return { deliveryCharge: config.sameZoneCharge, totalDistance, strategy: "same_zone", route };
  }

  return { deliveryCharge: config.externalCarrierCharge, totalDistance, strategy: "external_carrier", route };
}

async function groupOrdersByCustomerAndLocation({ order }) {
  if (!order?.customerId || !order?.deliveryAddress?.city) return null;
  const config = await getConfig();
  const destinationHash = buildDestinationHash(order);

  const existing = await DeliveryGroup.findOne({
    customerId: order.customerId,
    destinationHash,
    status: "OPEN",
    createdAt: { $gte: new Date(Date.now() - 6 * 60 * 60 * 1000) },
  });

  const group =
    existing ||
    (await DeliveryGroup.create({
      customerId: order.customerId,
      destinationHash,
      orders: [],
    }));

  const orderIds = new Set((group.orders || []).map((item) => String(item)));
  orderIds.add(String(order._id));

  const orders = await Order.find({ _id: { $in: Array.from(orderIds) } }).lean();
  const stops = await Promise.all(
    [...new Set(orders.map((item) => String(item.shopId)).filter(Boolean))].map((shopId) => getShopStop(shopId))
  );

  const destination = {
    coordinates: order.deliveryAddress?.coordinates || null,
    city: order.deliveryAddress?.city || "",
  };

  const charge = await calculateDeliveryCharge({ stops, destination, config });

  group.orders = orders.map((item) => item._id);
  group.totalDistance = Number(charge.totalDistance || 0);
  group.deliveryCharge = Number(charge.deliveryCharge || 0);
  group.route = (charge.route || []).map((stop) => ({
    shopId: stop.shopId,
    label: stop.label,
    city: stop.city,
    coordinates: stop.coordinates,
  }));
  group.zone = charge.strategy;
  await group.save();

  await Order.updateMany(
    { _id: { $in: group.orders } },
    { $set: { deliveryGroupId: group._id } }
  );

  if (charge.strategy === "external_carrier") {
    await shippingGateway.createShipment({ carrier: "pathao", orderId: order._id });
  }

  return group;
}

module.exports = {
  calculateDeliveryCharge,
  calculateDistance,
  getConfig,
  groupOrdersByCustomerAndLocation,
  optimizeRoute,
  updateConfig,
};
