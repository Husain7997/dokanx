const Product = require("../../models/product.model");
const Shop = require("../../models/shop.model");
const CommissionRule = require("./commissionRule.model");

async function resolveCategoryRule(order) {
  const productIds = (order.items || []).map((item) => item.product).filter(Boolean);
  if (!productIds.length) return null;
  const products = await Product.find({ _id: { $in: productIds } }).select("category").lean();
  const categories = [...new Set(products.map((item) => item.category).filter(Boolean))];
  if (!categories.length) return null;
  return CommissionRule.findOne({
    type: "CATEGORY",
    category: { $in: categories },
    isActive: true,
  })
    .sort({ rate: -1 })
    .lean();
}

async function resolveMerchantTierRule(order, shop) {
  if (!shop?.merchantTier) return null;
  return CommissionRule.findOne({
    type: "MERCHANT_TIER",
    merchantTier: shop.merchantTier,
    isActive: true,
  }).lean();
}

async function resolveCampaignRule(order) {
  if (!order.campaignId) return null;
  return CommissionRule.findOne({
    type: "CAMPAIGN",
    campaignId: order.campaignId,
    isActive: true,
  }).lean();
}

async function calculateCommission(order) {
  if (!order) {
    return { rate: 0, amount: 0, source: "missing_order", meta: {} };
  }
  if (order.trafficType === "direct") {
    return { rate: 0, amount: 0, source: "direct_traffic", meta: {} };
  }

  const shop = await Shop.findById(order.shopId).select("commissionRate merchantTier").lean();
  const [campaignRule, categoryRule, merchantTierRule] = await Promise.all([
    resolveCampaignRule(order),
    resolveCategoryRule(order),
    resolveMerchantTierRule(order, shop),
  ]);

  const selectedRule =
    campaignRule ||
    categoryRule ||
    merchantTierRule ||
    (shop ? { rate: Number(shop.commissionRate || 0), type: "SHOP_DEFAULT" } : null);

  const rate = Number(selectedRule?.rate || 0);
  const amount = Number(((Number(order.totalAmount || 0) * rate) / 100).toFixed(2));

  return {
    rate,
    amount,
    source: String(selectedRule?.type || "SHOP_DEFAULT").toLowerCase(),
    meta: {
      category: categoryRule?.category || null,
      merchantTier: merchantTierRule?.merchantTier || shop?.merchantTier || null,
      campaignId: campaignRule?.campaignId || order.campaignId || null,
    },
  };
}

async function applyCommission(order, options = {}) {
  const snapshot = await calculateCommission(order);
  order.commissionSnapshot = {
    ...snapshot,
    appliedAt: new Date(),
  };
  await order.save(options.session ? { session: options.session } : undefined);
  return order.commissionSnapshot;
}

async function listRules() {
  return CommissionRule.find().sort({ createdAt: -1 }).lean();
}

async function upsertRule(payload) {
  const filter = {
    type: String(payload.type || "").toUpperCase(),
  };
  if (payload.category) filter.category = payload.category;
  if (payload.merchantTier) filter.merchantTier = payload.merchantTier;
  if (payload.campaignId) filter.campaignId = payload.campaignId;

  return CommissionRule.findOneAndUpdate(
    filter,
    {
      ...filter,
      rate: Number(payload.rate || 0),
      isActive: payload.isActive !== false,
      metadata: payload.metadata || {},
    },
    { upsert: true, returnDocument: "after" }
  );
}

module.exports = {
  applyCommission,
  calculateCommission,
  listRules,
  upsertRule,
};

