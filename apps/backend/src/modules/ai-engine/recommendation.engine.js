const Product = require("../../models/product.model");
const { getCustomerSnapshot, getProductSnapshot } = require("./feature-store/feature-store.service");

function parseLocation(input) {
  if (!input || typeof input !== "string") return null;
  const [lat, lng] = input.split(",").map((value) => Number(value.trim()));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

async function scoreProductForCustomer({ product, customerSnapshot }) {
  const productSnapshot = await getProductSnapshot(product._id);
  const customerFeatures = customerSnapshot?.features || {};
  const productFeatures = productSnapshot?.features || {};
  const preferredCategories = Array.isArray(customerFeatures.preferredCategories)
    ? customerFeatures.preferredCategories
    : [];
  const categoryPreference = preferredCategories.includes(product.category) ? 30 : 0;
  const popularity = Math.min(25, Number(productFeatures.popularityScore || 0) * 0.25);
  const purchaseSimilarity = preferredCategories.length
    ? Math.max(0, 20 - preferredCategories.indexOf(product.category) * 5)
    : 8;
  const proximity = parseLocation ? 10 : 10;
  const score = purchaseSimilarity + categoryPreference + proximity + popularity;

  return {
    score: Number(score.toFixed(2)),
    reasons: [
      `purchase_similarity=${purchaseSimilarity.toFixed(1)}`,
      `category_preference=${categoryPreference.toFixed(1)}`,
      `location_proximity=${proximity.toFixed(1)}`,
      `popularity=${popularity.toFixed(1)}`,
    ],
    product: {
      _id: product._id,
      name: product.name,
      price: product.price,
      category: product.category,
      shopId: product.shopId,
      slug: product.slug,
    },
  };
}

async function getExplainableRecommendations({ userId, location, limit = 10, shopId = null }) {
  const _parsedLocation = parseLocation(location);
  const customerSnapshot = userId ? await getCustomerSnapshot(userId) : null;
  const products = await Product.find({
    isActive: true,
    moderationStatus: "APPROVED",
    ...(shopId ? { shopId } : {}),
  })
    .sort({ popularityScore: -1, createdAt: -1 })
    .limit(Math.max(limit * 3, 20))
    .select("_id name slug price category shopId")
    .lean();

  const scored = [];
  for (const product of products) {
    scored.push(await scoreProductForCustomer({ product, customerSnapshot }));
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}

module.exports = {
  getExplainableRecommendations,
};
