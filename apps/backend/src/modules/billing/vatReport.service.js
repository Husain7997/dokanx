const Order = require("@/models/order.model");
const Payment = require("@/models/payment.model");
const TaxRule = require("@/models/TaxRule");

function toDateRange({ from, to }) {
  const createdAt = {};
  if (from) {
    const date = new Date(from);
    if (!Number.isNaN(date.getTime())) createdAt.$gte = date;
  }
  if (to) {
    const date = new Date(to);
    if (!Number.isNaN(date.getTime())) createdAt.$lte = date;
  }
  return createdAt;
}

async function getActiveVatRate() {
  const rule = await TaxRule.findOne({ type: "VAT", active: true }).lean();
  return {
    rate: Number(rule?.rate || 0),
    ruleName: rule?.name || "VAT",
  };
}

function computeVatAmount(baseAmount, rate) {
  return Number(((Number(baseAmount || 0) * Number(rate || 0)) / 100).toFixed(2));
}

async function getVatSummary({ from = null, to = null, shopId = null } = {}) {
  const createdAt = toDateRange({ from, to });
  const query = {
    ...(Object.keys(createdAt).length ? { createdAt } : {}),
  };
  if (shopId) query.shopId = shopId;

  const [vatRule, paymentsAgg] = await Promise.all([
    getActiveVatRate(),
    Payment.aggregate([
      { $match: { ...query, status: "SUCCESS" } },
      {
        $group: {
          _id: null,
          taxableSales: { $sum: "$amount" },
          paymentCount: { $sum: 1 },
        },
      },
    ]),
  ]);

  const taxableSales = Number(paymentsAgg[0]?.taxableSales || 0);
  const paymentCount = Number(paymentsAgg[0]?.paymentCount || 0);
  const vatAmount = computeVatAmount(taxableSales, vatRule.rate);

  return {
    vatRate: vatRule.rate,
    vatRuleName: vatRule.ruleName,
    taxableSales,
    vatAmount,
    paymentCount,
    period: { from, to },
  };
}

async function buildVatExportRows({ from = null, to = null, shopId = null, limit = 1000 } = {}) {
  const createdAt = toDateRange({ from, to });
  const query = {
    ...(Object.keys(createdAt).length ? { createdAt } : {}),
  };
  if (shopId) query.shopId = shopId;

  const [vatRule, payments] = await Promise.all([
    getActiveVatRate(),
    Payment.find({ ...query, status: "SUCCESS" })
      .sort({ createdAt: -1 })
      .limit(Math.min(Math.max(Number(limit) || 1000, 1), 5000))
      .lean(),
  ]);

  return payments.map(payment => ({
    createdAt: payment.createdAt,
    shopId: payment.shopId,
    orderId: payment.order,
    providerPaymentId: payment.providerPaymentId,
    amount: Number(payment.amount || 0),
    vatRate: vatRule.rate,
    vatAmount: computeVatAmount(payment.amount, vatRule.rate),
    currency: payment.currency || "BDT",
  }));
}

async function getMushakInvoiceData({ orderId }) {
  const [vatRule, order] = await Promise.all([
    getActiveVatRate(),
    Order.findById(orderId).lean(),
  ]);

  if (!order) {
    const err = new Error("Order not found");
    err.statusCode = 404;
    throw err;
  }

  const subtotal = Number(order.totalAmount || 0);
  const vatAmount = computeVatAmount(subtotal, vatRule.rate);

  return {
    formNo: "Musak-6.3",
    invoiceType: "VAT_INVOICE",
    invoiceDate: order.createdAt,
    invoiceNo: `MSK-${order._id}`,
    orderId: order._id,
    shopId: order.shopId,
    customer: {
      phone: order.contact?.phone || "",
      email: order.contact?.email || "",
    },
    items: (order.items || []).map(item => ({
      productId: item.product,
      quantity: Number(item.quantity || 0),
      unitPrice: Number(item.price || 0),
      lineTotal: Number(item.quantity || 0) * Number(item.price || 0),
    })),
    summary: {
      taxableAmount: subtotal,
      vatRate: vatRule.rate,
      vatAmount,
      grossAmount: subtotal + vatAmount,
    },
  };
}

module.exports = {
  getVatSummary,
  buildVatExportRows,
  getMushakInvoiceData,
  _internals: {
    computeVatAmount,
  },
};
