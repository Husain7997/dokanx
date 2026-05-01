const Order = require("../models/order.model");
const Product = require("../models/product.model");
const PaymentAttempt = require("../models/paymentAttempt.model");
const User = require("../models/user.model");
const CreditAccount = require("../modules/credit/credit.account.model");
const { scoreCustomer } = require("../modules/ai-engine/customer-score.service");

const ACTIVE_ORDER_STATUSES = ["PLACED", "PAYMENT_PENDING", "CONFIRMED", "PAYMENT_FAILED"];

function parseRangeDays(range) {
  const raw = String(range || "30").toLowerCase();
  if (raw === "7" || raw === "7d") return 7;
  if (raw === "14" || raw === "14d") return 14;
  if (raw === "60" || raw === "60d") return 60;
  if (raw === "90" || raw === "90d") return 90;
  return 30;
}

function startOfDay(date = new Date()) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function daysAgo(days) {
  const value = startOfDay();
  value.setDate(value.getDate() - days);
  return value;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function toDateKey(date) {
  return new Date(date).toISOString().slice(0, 10);
}

function createDailyMap(days) {
  const map = new Map();
  const today = startOfDay();
  for (let index = days - 1; index >= 0; index -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - index);
    map.set(toDateKey(date), 0);
  }
  return map;
}

function average(numbers) {
  if (!numbers.length) return 0;
  return numbers.reduce((sum, item) => sum + Number(item || 0), 0) / numbers.length;
}

function severityFromCount(count, high = 1, medium = 0) {
  if (count > high) return "warning";
  if (count > medium) return "info";
  return "success";
}

async function getInventoryActions({ shopId, limit = 6, rangeDays = 30 }) {
  const [products, orders] = await Promise.all([
    Product.find({ shopId, isActive: true })
      .select("_id name stock category price popularityScore")
      .lean(),
    Order.find({
      shopId,
      createdAt: { $gte: daysAgo(rangeDays) },
      status: { $nin: ["CANCELLED", "REFUNDED"] },
    })
      .select("items createdAt")
      .lean(),
  ]);

  const demandMap = new Map();
  orders.forEach((order) => {
    (order.items || []).forEach((item) => {
      const key = String(item.product || "");
      if (!key) return;
      demandMap.set(key, (demandMap.get(key) || 0) + Number(item.quantity || 0));
    });
  });

  return products
    .map((product) => {
      const soldUnits = Number(demandMap.get(String(product._id)) || 0);
      const demandPerDay = soldUnits / Math.max(rangeDays, 1);
      const dynamicThreshold = Math.max(5, Math.ceil(demandPerDay * 5));
      const suggestedRestock = Math.max(dynamicThreshold * 2 - Number(product.stock || 0), 0);
      const daysLeft = demandPerDay > 0 ? Number((Number(product.stock || 0) / demandPerDay).toFixed(1)) : null;
      const lowStock = Number(product.stock || 0) <= dynamicThreshold;
      return {
        productId: String(product._id),
        name: product.name || "Product",
        category: product.category || "Uncategorized",
        currentStock: Number(product.stock || 0),
        reorderPoint: dynamicThreshold,
        suggestedRestock,
        demandPerDay: Number(demandPerDay.toFixed(2)),
        estimatedDaysLeft: daysLeft,
        urgency: lowStock ? (Number(product.stock || 0) === 0 ? "critical" : "high") : "watch",
        reason: lowStock
          ? `Stock is below AI reorder point (${dynamicThreshold}).`
          : "Demand is stable.",
      };
    })
    .filter((item) => item.currentStock <= item.reorderPoint || item.suggestedRestock > 0)
    .sort((left, right) => {
      if (left.currentStock === 0 && right.currentStock !== 0) return -1;
      if (right.currentStock === 0 && left.currentStock !== 0) return 1;
      return right.demandPerDay - left.demandPerDay || left.currentStock - right.currentStock;
    })
    .slice(0, limit);
}

async function getCustomerSegments({ shopId }) {
  const boundary90 = daysAgo(90);
  const orders = await Order.find({
    shopId,
    customerId: { $ne: null },
    createdAt: { $gte: boundary90 },
    status: { $nin: ["CANCELLED", "REFUNDED"] },
  })
    .select("customerId totalAmount createdAt")
    .lean();

  const customerMap = new Map();
  orders.forEach((order) => {
    const key = String(order.customerId || "");
    if (!key) return;
    const current = customerMap.get(key) || {
      orderCount: 0,
      totalSpend: 0,
      lastOrderAt: null,
      firstOrderAt: null,
    };
    current.orderCount += 1;
    current.totalSpend += Number(order.totalAmount || 0);
    current.lastOrderAt =
      !current.lastOrderAt || new Date(order.createdAt) > new Date(current.lastOrderAt)
        ? order.createdAt
        : current.lastOrderAt;
    current.firstOrderAt =
      !current.firstOrderAt || new Date(order.createdAt) < new Date(current.firstOrderAt)
        ? order.createdAt
        : current.firstOrderAt;
    customerMap.set(key, current);
  });

  const customers = Array.from(customerMap.values());
  const totalCustomers = customers.length || 1;
  const now = Date.now();
  const loyal = customers.filter((item) => item.orderCount >= 3 && item.totalSpend >= 3000).length;
  const newCustomers = customers.filter((item) => item.orderCount === 1).length;
  const atRisk = customers.filter((item) => {
    if (!item.lastOrderAt) return false;
    return now - new Date(item.lastOrderAt).getTime() > 45 * 24 * 60 * 60 * 1000;
  }).length;
  const growth = customers.filter((item) => item.orderCount >= 2 && item.totalSpend >= 1500).length;

  return [
    {
      segment: "Loyal",
      count: loyal,
      ratio: Number((loyal / totalCustomers).toFixed(2)),
      description: "High-frequency, high-value repeat customers.",
    },
    {
      segment: "New",
      count: newCustomers,
      ratio: Number((newCustomers / totalCustomers).toFixed(2)),
      description: "Recently activated buyers who need repeat conversion.",
    },
    {
      segment: "Growth",
      count: growth,
      ratio: Number((growth / totalCustomers).toFixed(2)),
      description: "Customers showing strong momentum and upsell potential.",
    },
    {
      segment: "At Risk",
      count: atRisk,
      ratio: Number((atRisk / totalCustomers).toFixed(2)),
      description: "Customers who have gone quiet and may need re-engagement.",
    },
  ];
}

async function getCreditInsights({ shopId, limit = 8 }) {
  const accounts = await CreditAccount.find({ shopId })
    .sort({ updatedAt: -1 })
    .limit(limit * 2)
    .lean();

  const customerIds = accounts.map((account) => String(account.customerId || "")).filter(Boolean);
  const users = customerIds.length
    ? await User.find({
        $or: [{ globalCustomerId: { $in: customerIds } }, { _id: { $in: customerIds.filter((id) => id.length === 24) } }],
      })
        .select("_id globalCustomerId name phone")
        .lean()
    : [];
  const userMap = new Map(
    users.flatMap((user) => [
      [String(user.globalCustomerId || ""), user],
      [String(user._id || ""), user],
    ])
  );

  const scored = [];
  for (const account of accounts) {
    const result = await scoreCustomer(account.customerId);
    const outstandingBalance = Number(account.outstandingBalance || 0);
    const creditLimit = Number(account.creditLimit || 0);
    const utilization = creditLimit > 0 ? outstandingBalance / creditLimit : 0;
    const recommendedLimit = Math.max(
      0,
      Math.round(
        result.score >= 80
          ? creditLimit * 1.15
          : result.score <= 45
            ? creditLimit * 0.8
            : creditLimit
      )
    );
    const user = userMap.get(String(account.customerId || ""));
    scored.push({
      customerId: String(account.customerId || ""),
      customerName: user?.name || "Customer",
      phone: user?.phone || "",
      creditScore: Number(result.score || 0),
      decision: result.decision,
      status: account.status || "ACTIVE",
      creditLimit,
      outstandingBalance,
      availableCredit: Math.max(0, creditLimit - outstandingBalance),
      utilizationRate: Number(utilization.toFixed(2)),
      recommendedLimit,
      riskLabel: result.score >= 70 ? "healthy" : result.score >= 45 ? "review" : "risky",
      reasons: result.reasons || [],
    });
  }

  return scored
    .sort((left, right) => {
      if (left.riskLabel === "risky" && right.riskLabel !== "risky") return -1;
      if (right.riskLabel === "risky" && left.riskLabel !== "risky") return 1;
      return right.outstandingBalance - left.outstandingBalance;
    })
    .slice(0, limit);
}

async function getPaymentIntelligence({ shopId, rangeDays = 30 }) {
  const attempts = await PaymentAttempt.find({
    shopId,
    createdAt: { $gte: daysAgo(rangeDays) },
  })
    .sort({ createdAt: -1 })
    .lean();

  const total = attempts.length;
  const failed = attempts.filter((item) => item.status === "FAILED").length;
  const pending = attempts.filter((item) => item.status === "PENDING").length;
  const failureRate = total ? Number((failed / total).toFixed(2)) : 0;
  const gatewayMap = new Map();

  attempts.forEach((attempt) => {
    const key = String(attempt.gateway || "UNKNOWN");
    const current = gatewayMap.get(key) || { gateway: key, total: 0, failed: 0, success: 0, pending: 0 };
    current.total += 1;
    if (attempt.status === "FAILED") current.failed += 1;
    if (attempt.status === "SUCCESS") current.success += 1;
    if (attempt.status === "PENDING") current.pending += 1;
    gatewayMap.set(key, current);
  });

  const gatewayBreakdown = Array.from(gatewayMap.values())
    .map((item) => ({
      ...item,
      failureRate: item.total ? Number((item.failed / item.total).toFixed(2)) : 0,
    }))
    .sort((left, right) => right.failureRate - left.failureRate || right.total - left.total);

  const anomalies = [];
  gatewayBreakdown.forEach((item) => {
    if (item.failureRate >= 0.25 && item.total >= 3) {
      anomalies.push({
        gateway: item.gateway,
        severity: "warning",
        message: `${item.gateway} failure rate is ${Math.round(item.failureRate * 100)}% in the last ${rangeDays} days.`,
      });
    }
  });
  if (pending > 0) {
    anomalies.push({
      gateway: "pending",
      severity: pending >= 3 ? "warning" : "info",
      message: `${pending} payment attempts are still pending and may need webhook retry review.`,
    });
  }

  return {
    totalAttempts: total,
    failedAttempts: failed,
    pendingAttempts: pending,
    failureRate,
    gatewayBreakdown,
    anomalies: anomalies.slice(0, 6),
  };
}

async function getFulfillmentActions({ shopId, limit = 6 }) {
  const orders = await Order.find({
    shopId,
    status: { $in: ACTIVE_ORDER_STATUSES },
  })
    .sort({ createdAt: 1 })
    .limit(limit * 3)
    .select("_id status paymentStatus createdAt totalAmount")
    .lean();

  const now = Date.now();
  return orders
    .map((order) => {
      const ageHours = Number(((now - new Date(order.createdAt).getTime()) / (1000 * 60 * 60)).toFixed(1));
      return {
        orderId: String(order._id),
        status: order.status || "PLACED",
        paymentStatus: order.paymentStatus || "PENDING",
        ageHours,
        totalAmount: Number(order.totalAmount || 0),
        priority: ageHours >= 24 ? "high" : ageHours >= 8 ? "medium" : "low",
        suggestion:
          order.status === "PAYMENT_FAILED"
            ? "Trigger payment follow-up or retry workflow."
            : order.status === "PAYMENT_PENDING"
              ? "Confirm payment webhook and auto-complete if settled."
              : "Move this order forward in fulfillment.",
      };
    })
    .sort((left, right) => right.ageHours - left.ageHours)
    .slice(0, limit);
}

async function getMerchantCopilot({ shopId, range = "30" }) {
  const rangeDays = parseRangeDays(range);
  const orderBoundary = daysAgo(rangeDays);
  const previousBoundary = daysAgo(rangeDays * 2);

  const [currentOrders, previousOrders, inventoryActions, customerSegments, creditInsights, paymentIntelligence, fulfillmentActions] =
    await Promise.all([
      Order.find({
        shopId,
        createdAt: { $gte: orderBoundary },
        status: { $nin: ["CANCELLED", "REFUNDED"] },
      })
        .select("totalAmount createdAt")
        .lean(),
      Order.find({
        shopId,
        createdAt: { $gte: previousBoundary, $lt: orderBoundary },
        status: { $nin: ["CANCELLED", "REFUNDED"] },
      })
        .select("totalAmount")
        .lean(),
      getInventoryActions({ shopId, rangeDays }),
      getCustomerSegments({ shopId }),
      getCreditInsights({ shopId }),
      getPaymentIntelligence({ shopId, rangeDays }),
      getFulfillmentActions({ shopId }),
    ]);

  const salesSeriesMap = createDailyMap(Math.min(rangeDays, 14));
  currentOrders.forEach((order) => {
    const key = toDateKey(order.createdAt);
    if (salesSeriesMap.has(key)) {
      salesSeriesMap.set(key, (salesSeriesMap.get(key) || 0) + Number(order.totalAmount || 0));
    }
  });

  const currentRevenue = currentOrders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0);
  const previousRevenue = previousOrders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0);
  const revenueTrend = previousRevenue > 0 ? Number((((currentRevenue - previousRevenue) / previousRevenue) * 100).toFixed(1)) : 0;
  const dailyAverage = currentOrders.length ? currentRevenue / Math.max(rangeDays, 1) : 0;
  const projectedNext7Days = Math.round(dailyAverage * 7);
  const riskyCreditCustomers = creditInsights.filter((item) => item.riskLabel === "risky").length;
  const loyalCustomers = customerSegments.find((item) => item.segment === "Loyal")?.count || 0;

  const cards = [
    {
      id: "sales",
      title: "Sales momentum",
      severity: revenueTrend < 0 ? "warning" : "success",
      metric: `${revenueTrend >= 0 ? "+" : ""}${revenueTrend}%`,
      message: `Projected next 7 days revenue is ${projectedNext7Days} BDT based on the last ${rangeDays} days.`,
    },
    {
      id: "inventory",
      title: "Inventory pressure",
      severity: severityFromCount(inventoryActions.length, 2, 0),
      metric: String(inventoryActions.length),
      message: inventoryActions.length
        ? `${inventoryActions[0].name} is the highest-priority restock candidate.`
        : "No immediate stockout pressure detected.",
    },
    {
      id: "credit",
      title: "Credit watch",
      severity: severityFromCount(riskyCreditCustomers, 1, 0),
      metric: String(riskyCreditCustomers),
      message: riskyCreditCustomers
        ? `${riskyCreditCustomers} customers need tighter credit review.`
        : "Credit portfolio looks healthy.",
    },
    {
      id: "payments",
      title: "Payment reliability",
      severity: paymentIntelligence.failureRate >= 0.2 ? "warning" : "success",
      metric: `${Math.round(paymentIntelligence.failureRate * 100)}%`,
      message: paymentIntelligence.anomalies[0]?.message || "Gateway failures are within normal range.",
    },
    {
      id: "fulfillment",
      title: "Order automation queue",
      severity: severityFromCount(fulfillmentActions.length, 2, 0),
      metric: String(fulfillmentActions.length),
      message: fulfillmentActions.length
        ? `${fulfillmentActions[0].orderId.slice(-6)} is the oldest pending action.`
        : "Fulfillment queue is under control.",
    },
    {
      id: "customers",
      title: "Loyal customer base",
      severity: loyalCustomers > 0 ? "success" : "info",
      metric: String(loyalCustomers),
      message: loyalCustomers
        ? `${loyalCustomers} customers are ready for VIP or repeat-purchase offers.`
        : "Customer loyalty signals are still building.",
    },
  ];

  return {
    generatedAt: new Date().toISOString(),
    rangeDays,
    summary: {
      currentRevenue: Number(currentRevenue.toFixed(2)),
      previousRevenue: Number(previousRevenue.toFixed(2)),
      revenueTrend,
      projectedNext7Days,
      paymentFailureRate: paymentIntelligence.failureRate,
      lowStockCount: inventoryActions.length,
      riskyCreditCustomers,
      fulfillmentBacklog: fulfillmentActions.length,
    },
    cards,
    salesSeries: Array.from(salesSeriesMap.entries()).map(([label, value]) => ({ label, value })),
    inventoryActions,
    customerSegments,
    creditInsights,
    paymentIntelligence,
    fulfillmentActions,
  };
}

module.exports = {
  getMerchantCopilot,
  getInventoryActions,
  getCustomerSegments,
  getCreditInsights,
  getPaymentIntelligence,
  getFulfillmentActions,
};
