const Order = require("../models/order.model");
const User = require("../models/user.model");
const { resolveCustomerId } = require("../utils/order-normalization.util");

function daysSince(date) {
  if (!date) return Number.POSITIVE_INFINITY;
  const at = new Date(date).getTime();
  if (Number.isNaN(at)) return Number.POSITIVE_INFINITY;
  return (Date.now() - at) / (1000 * 60 * 60 * 24);
}

function tagCustomer(customer = {}) {
  const totalSpent = Number(customer.totalSpent ?? customer.totalSpend ?? 0);
  const totalOrders = Number(customer.totalOrders ?? customer.orderCount ?? 0);
  const lastOrderAt = customer.lastOrderAt;

  if (totalSpent > 50000) return "VIP";
  if (totalOrders >= 5) return "Repeat";

  const days = daysSince(lastOrderAt);
  if (days > 60) return "Lost";
  if (days > 30) return "At Risk";

  return "Normal";
}

function buildTags(customer = {}) {
  const primary = tagCustomer(customer);
  const tags = new Set([primary]);
  if (Number(customer.totalSpent ?? customer.totalSpend ?? 0) > 50000) tags.add("VIP");
  if (Number(customer.totalOrders ?? customer.orderCount ?? 0) > 1) tags.add("Repeat");
  return Array.from(tags).filter(Boolean);
}

async function syncCustomerFromOrder(order, options = {}) {
  if (!order) return null;
  const customerId = resolveCustomerId(order);
  if (!customerId) return null;

  const alreadySynced = order.metadata?.customerIntelligenceSyncedAt;
  if (alreadySynced && !options.force) {
    return null;
  }

  const customer = await User.findById(customerId);
  if (!customer) return null;

  const nextTotalOrders = Number(customer.totalOrders || 0) + 1;
  const nextTotalSpent = Number(customer.totalSpent || 0) + Number(order.totalAmount || 0);
  const lastOrderAt = order.createdAt || new Date();
  const tags = buildTags({
    totalOrders: nextTotalOrders,
    totalSpent: nextTotalSpent,
    lastOrderAt,
  });

  await User.updateOne(
    { _id: customer._id },
    {
      $set: {
        totalOrders: nextTotalOrders,
        totalSpent: Number(nextTotalSpent.toFixed(2)),
        lastOrderAt,
        tags,
      },
    }
  );
  const updatedCustomer = {
    _id: customer._id,
    name: customer.name,
    phone: customer.phone,
    email: customer.email,
    tags,
    totalOrders: nextTotalOrders,
    totalSpent: Number(nextTotalSpent.toFixed(2)),
    lastOrderAt,
  };
  const automationService = require("./automation.service");
  await automationService.triggerCustomerSegmentEvents(updatedCustomer, order.shopId || order.shop || null);

  order.metadata = {
    ...(order.metadata || {}),
    customerIntelligenceSyncedAt: new Date(),
  };
  if (typeof order.save === "function") {
    await order.save(options.session ? { session: options.session } : undefined);
  } else if (order._id) {
    await Order.updateOne(
      { _id: order._id },
      { $set: { "metadata.customerIntelligenceSyncedAt": new Date() } },
      options.session ? { session: options.session } : undefined
    );
  }

  return {
    customerId: customer._id,
    totalOrders: nextTotalOrders,
    totalSpent: Number(nextTotalSpent.toFixed(2)),
    tags,
  };
}

async function getCustomerIntelligence(shopId) {
  if (!shopId) {
    throw new Error("Shop context required");
  }

  const rows = await Order.aggregate([
    {
      $match: {
        shopId,
        customerId: { $ne: null },
        status: { $nin: ["CANCELLED", "REFUNDED", "PAYMENT_FAILED"] },
      },
    },
    {
      $group: {
        _id: "$customerId",
        totalOrders: { $sum: 1 },
        totalSpent: { $sum: "$totalAmount" },
        lastOrderAt: { $max: "$createdAt" },
        avgOrderValue: { $avg: "$totalAmount" },
      },
    },
    { $sort: { totalSpent: -1 } },
  ]);

  const customerIds = rows.map((row) => row._id).filter(Boolean);
  const users = await User.find({ _id: { $in: customerIds } })
    .select("name email phone globalCustomerId createdAt tags totalOrders totalSpent lastOrderAt")
    .lean();
  const userMap = new Map(users.map((user) => [String(user._id), user]));

  const customers = rows.map((row) => {
    const user = userMap.get(String(row._id)) || {};
    const profile = {
      _id: row._id,
      name: user.name || "Customer",
      email: user.email || "",
      phone: user.phone || "",
      globalCustomerId: user.globalCustomerId || "",
      createdAt: user.createdAt || null,
      totalOrders: Number(row.totalOrders || 0),
      totalSpent: Number(row.totalSpent || 0),
      lastOrderAt: row.lastOrderAt || null,
      avgOrderValue: Number(row.avgOrderValue || 0),
    };
    return {
      ...profile,
      tags: buildTags(profile),
      rfm: {
        recencyDays: Number.isFinite(daysSince(profile.lastOrderAt)) ? Math.round(daysSince(profile.lastOrderAt)) : null,
        frequency: profile.totalOrders,
        monetary: profile.totalSpent,
      },
    };
  });

  const segments = {
    vip: customers.filter((customer) => customer.tags.includes("VIP")),
    repeat: customers.filter((customer) => customer.tags.includes("Repeat")),
    atRisk: customers.filter((customer) => customer.tags.includes("At Risk")),
    lost: customers.filter((customer) => customer.tags.includes("Lost")),
  };

  const repeatCustomers = customers.filter((customer) => customer.totalOrders > 1).length;
  const repeatRate = customers.length ? repeatCustomers / customers.length : 0;

  return {
    topCustomers: customers.slice(0, 20),
    segments,
    repeatRate,
    totalCustomers: customers.length,
    repeatCustomers,
    customers,
  };
}

module.exports = {
  buildTags,
  getCustomerIntelligence,
  syncCustomerFromOrder,
  tagCustomer,
};
