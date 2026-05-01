const SearchIndex = require("../models/searchIndex.model");
const Product = require("../models/product.model");
const Shop = require("../models/shop.model");
const externalSearch = require("./search/externalSearch.service");
const SearchSyncState = require("../models/searchSyncState.model");

async function rebuildIndex() {
  await SearchIndex.deleteMany({});

  const products = await Product.find().lean();
  const productDocs = products.map((product) => ({
    entityType: "product",
    entityId: product._id,
    shopId: product.shopId || null,
    name: product.name || "",
    category: product.category || "",
    brand: product.brand || "",
    text: `${product.name || ""} ${product.category || ""} ${product.brand || ""}`.trim(),
  }));

  const shops = await Shop.find().lean();
  const shopDocs = shops.map((shop) => ({
    entityType: "shop",
    entityId: shop._id,
    shopId: shop._id,
    name: shop.name || "",
    text: `${shop.name || ""} ${shop.domain || ""} ${shop.slug || ""}`.trim(),
  }));

  if (productDocs.length) await SearchIndex.insertMany(productDocs);
  if (shopDocs.length) await SearchIndex.insertMany(shopDocs);

  await externalSearch.indexDocuments([...productDocs, ...shopDocs]);

  return {
    products: productDocs.length,
    shops: shopDocs.length,
  };
}

async function searchIndex(query) {
  if (!query) return [];
  const externalResults = await externalSearch.searchExternal(query);
  if (externalResults && externalResults.length) {
    return externalResults;
  }

  const results = await SearchIndex.find({ $text: { $search: query } }).limit(20).lean();
  return results;
}

async function updateIncrementalIndex() {
  const state = await SearchSyncState.findOneAndUpdate(
    { key: "search" },
    { $setOnInsert: { lastRunAt: null } },
    { returnDocument: "after", upsert: true }
  );

  const since = state.lastRunAt || new Date(0);
  const products = await Product.find({ updatedAt: { $gt: since } }).lean();
  const shops = await Shop.find({ updatedAt: { $gt: since } }).lean();

  const productDocs = products.map((product) => ({
    entityType: "product",
    entityId: product._id,
    shopId: product.shopId || null,
    name: product.name || "",
    category: product.category || "",
    brand: product.brand || "",
    text: `${product.name || ""} ${product.category || ""} ${product.brand || ""} ${product.barcode || ""}`.trim(),
  }));

  const shopDocs = shops.map((shop) => ({
    entityType: "shop",
    entityId: shop._id,
    shopId: shop._id,
    name: shop.name || "",
    text: `${shop.name || ""} ${shop.domain || ""} ${shop.slug || ""}`.trim(),
  }));

  const ops = [...productDocs, ...shopDocs].map((doc) => ({
    updateOne: {
      filter: { entityType: doc.entityType, entityId: doc.entityId },
      update: { $set: doc },
      upsert: true,
    },
  }));

  if (ops.length) {
    await SearchIndex.bulkWrite(ops);
    await externalSearch.indexDocuments([...productDocs, ...shopDocs]);
  }

  state.lastRunAt = new Date();
  await state.save();

  return { products: productDocs.length, shops: shopDocs.length };
}

module.exports = {
  rebuildIndex,
  searchIndex,
  updateIncrementalIndex,
};

