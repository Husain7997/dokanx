const SearchIndex = require("../models/searchIndex.model");
const Product = require("../models/product.model");
const Shop = require("../models/shop.model");

async function rebuildIndex() {
  await SearchIndex.deleteMany({});

  const products = await Product.find().lean();
  const productDocs = products.map((product) => ({
    entityType: "product",
    entityId: product._id,
    shopId: product.shopId || null,
    text: `${product.name || ""} ${product.category || ""}`.trim(),
  }));

  const shops = await Shop.find().lean();
  const shopDocs = shops.map((shop) => ({
    entityType: "shop",
    entityId: shop._id,
    shopId: shop._id,
    text: `${shop.name || ""} ${shop.domain || ""} ${shop.slug || ""}`.trim(),
  }));

  if (productDocs.length) await SearchIndex.insertMany(productDocs);
  if (shopDocs.length) await SearchIndex.insertMany(shopDocs);

  return {
    products: productDocs.length,
    shops: shopDocs.length,
  };
}

async function searchIndex(query) {
  if (!query) return [];
  const results = await SearchIndex.find({ $text: { $search: query } })
    .limit(20)
    .lean();
  return results;
}

module.exports = {
  rebuildIndex,
  searchIndex,
};
