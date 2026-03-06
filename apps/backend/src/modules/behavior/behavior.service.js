const Order = require("@/models/order.model");
const CustomerIdentity = require("@/modules/customer/customer.identity.model");
const CreditAccount = require("@/modules/credit/credit.account.model");
const CreditLedger = require("@/modules/credit/credit.ledger.model");
const BehaviorSignal = require("./behaviorSignal.model");
const { eventBus } = require("@/core/infrastructure");

function dayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function toRiskLevel(score) {
  if (score >= 70) return "HIGH";
  if (score >= 35) return "MEDIUM";
  return "LOW";
}

function average(values) {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function buildMessage({ riskLevel, overdueDays, outstandingBalance, paymentCoverage }) {
  if (riskLevel === "HIGH") {
    return `Customer risk is HIGH: overdue ${overdueDays} days, due ${outstandingBalance}, coverage ${paymentCoverage}%`;
  }
  if (riskLevel === "MEDIUM") {
    return `Customer risk is MEDIUM: overdue ${overdueDays} days, due ${outstandingBalance}`;
  }
  return `Customer risk is LOW with stable behavior`;
}

async function getCustomerById(customerId) {
  const customer = await CustomerIdentity.findById(customerId).lean();
  if (!customer) throw new Error("Customer not found");
  return customer;
}

async function getCreditBehavior({
  shopId,
  customerId,
}) {
  const account = await CreditAccount.findOne({
    shop: shopId,
    customer: customerId,
  }).lean();

  if (!account) {
    return {
      hasCreditAccount: false,
      outstandingBalance: 0,
      creditLimit: 0,
      overdueDays: 0,
      totalCreditIssued: 0,
      totalPaymentsReceived: 0,
      paymentCoverage: 0,
      utilizationRate: 0,
    };
  }

  const ledgers = await CreditLedger.find({
    shop: shopId,
    customer: customerId,
  })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  const issued = ledgers
    .filter(l => l.type === "CREDIT_ISSUED")
    .reduce((s, l) => s + (Number(l.amount) || 0), 0);
  const paid = ledgers
    .filter(l => l.type === "PAYMENT_RECEIVED")
    .reduce((s, l) => s + (Number(l.amount) || 0), 0);

  const paymentCoverage = issued > 0
    ? Math.min(Math.round((paid / issued) * 100), 100)
    : 100;
  const utilizationRate = account.creditLimit > 0
    ? Math.min(Math.round((account.outstandingBalance / account.creditLimit) * 100), 999)
    : 0;

  return {
    hasCreditAccount: true,
    outstandingBalance: Number(account.outstandingBalance || 0),
    creditLimit: Number(account.creditLimit || 0),
    overdueDays: Number(account.overdueDays || 0),
    totalCreditIssued: Number(account.totalCreditIssued || issued || 0),
    totalPaymentsReceived: Number(account.totalPaymentsReceived || paid || 0),
    paymentCoverage,
    utilizationRate,
    accountStatus: account.status || "ACTIVE",
    accountRiskLevel: account.riskLevel || "LOW",
    accountRiskScore: Number(account.riskScore || 0),
  };
}

async function getPurchaseBehavior({
  shopId,
  customerPhone,
}) {
  const query = {
    shopId,
    ...(customerPhone ? { "contact.phone": customerPhone } : {}),
  };

  const orders = await Order.find(query)
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  const totalOrders = orders.length;
  const totalSpend = orders.reduce((s, o) => s + (Number(o.totalAmount) || 0), 0);
  const avgOrderValue = totalOrders ? Number((totalSpend / totalOrders).toFixed(2)) : 0;
  const recent30 = orders.filter(o => {
    const age = Date.now() - new Date(o.createdAt).getTime();
    return age <= 30 * 24 * 60 * 60 * 1000;
  }).length;
  const recent90 = orders.filter(o => {
    const age = Date.now() - new Date(o.createdAt).getTime();
    return age <= 90 * 24 * 60 * 60 * 1000;
  }).length;

  const trendRatio = recent90 > 0
    ? Number((recent30 / average([recent90 / 3 || 0.0001])).toFixed(2))
    : 1;

  return {
    totalOrders,
    totalSpend: Number(totalSpend.toFixed(2)),
    avgOrderValue,
    lastOrderAt: orders[0]?.createdAt || null,
    recent30dOrders: recent30,
    recent90dOrders: recent90,
    purchaseTrendRatio: Number.isFinite(trendRatio) ? trendRatio : 1,
  };
}

function computeCompositeRisk({
  credit,
  purchase,
}) {
  const overdueComponent = Math.min(credit.overdueDays * 3, 45);
  const utilizationComponent = Math.min((credit.utilizationRate || 0) * 0.2, 25);
  const coverageComponent = Math.max(0, (100 - (credit.paymentCoverage || 0)) * 0.2);
  const behaviorComponent = purchase.purchaseTrendRatio < 0.7 ? 8 : 0;

  const score = Math.round(
    overdueComponent + utilizationComponent + coverageComponent + behaviorComponent
  );

  return {
    score: Math.min(score, 100),
    riskLevel: toRiskLevel(score),
  };
}

async function generateCustomerInsight({
  shopId,
  customerId,
}) {
  const customer = await getCustomerById(customerId);
  const credit = await getCreditBehavior({ shopId, customerId });
  const purchase = await getPurchaseBehavior({
    shopId,
    customerPhone: customer.phone,
  });
  const composite = computeCompositeRisk({ credit, purchase });

  return {
    customer,
    credit,
    purchase,
    composite,
    alertMessage: buildMessage({
      riskLevel: composite.riskLevel,
      overdueDays: credit.overdueDays,
      outstandingBalance: credit.outstandingBalance,
      paymentCoverage: credit.paymentCoverage,
    }),
  };
}

async function upsertBehaviorSignal({
  shopId,
  customerId,
  signalType,
  severity,
  score,
  message,
  meta = {},
}) {
  const signal = await BehaviorSignal.findOneAndUpdate(
    {
      shop: shopId,
      customer: customerId,
      signalType,
      dateKey: dayKey(),
    },
    {
      $set: {
        severity,
        score,
        message,
        meta,
        resolved: false,
        resolvedAt: null,
        resolvedBy: null,
      },
    },
    {
      upsert: true,
      returnDocument: "after",
    }
  );

  eventBus.emit("BEHAVIOR_SIGNAL_CREATED", {
    shopId: String(shopId),
    customerId: String(customerId),
    signalType,
    severity,
    score,
  });

  return signal;
}

async function scanShopBehaviorRisk({
  shopId,
  maxCustomers = 100,
}) {
  const accounts = await CreditAccount.find({
    shop: shopId,
  })
    .sort({ updatedAt: -1 })
    .limit(Math.max(Number(maxCustomers) || 100, 1))
    .lean();

  const createdSignals = [];

  for (const account of accounts) {
    const insight = await generateCustomerInsight({
      shopId,
      customerId: account.customer,
    });

    if (insight.composite.riskLevel === "LOW") continue;

    const signal = await upsertBehaviorSignal({
      shopId,
      customerId: account.customer,
      signalType: "COMPOSITE_RISK",
      severity: insight.composite.riskLevel,
      score: insight.composite.score,
      message: insight.alertMessage,
      meta: {
        overdueDays: insight.credit.overdueDays,
        outstandingBalance: insight.credit.outstandingBalance,
        paymentCoverage: insight.credit.paymentCoverage,
        utilizationRate: insight.credit.utilizationRate,
        purchaseTrendRatio: insight.purchase.purchaseTrendRatio,
      },
    });

    createdSignals.push(signal);
  }

  return createdSignals;
}

async function listSignals({
  shopId,
  severity,
  resolved,
  limit = 50,
}) {
  const query = {
    shop: shopId,
    ...(severity ? { severity } : {}),
    ...(resolved !== undefined ? { resolved } : {}),
  };

  return BehaviorSignal.find(query)
    .sort({ createdAt: -1 })
    .limit(Math.max(Number(limit) || 50, 1))
    .populate("customer", "name phone riskLevel globalCreditScore")
    .lean();
}

async function resolveSignal({
  shopId,
  signalId,
  userId,
}) {
  const signal = await BehaviorSignal.findOneAndUpdate(
    {
      _id: signalId,
      shop: shopId,
    },
    {
      $set: {
        resolved: true,
        resolvedAt: new Date(),
        resolvedBy: userId,
      },
    },
    { returnDocument: "after" }
  );

  if (!signal) throw new Error("Signal not found");
  return signal;
}

module.exports = {
  generateCustomerInsight,
  scanShopBehaviorRisk,
  listSignals,
  resolveSignal,
};
