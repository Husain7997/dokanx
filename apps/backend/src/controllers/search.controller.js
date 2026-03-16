const Product = require("../models/product.model");
const Shop = require("../models/shop.model");
const { searchIndex, rebuildIndex } = require("../services/searchIndex.service");

exports.searchProducts = async (req, res) => {
  const { q, shopId, category } = req.query;
  const filter = {};
  if (shopId) filter.shopId = shopId;
  if (category) filter.category = category;
  if (q) {
    filter.name = { $regex: String(q), $options: "i" };
  }

  const products = await Product.find(filter).lean();
  res.json({ data: products, count: products.length });
};

exports.searchShops = async (req, res) => {
  const { q } = req.query;
  const filter = { isActive: true, status: "ACTIVE" };
  if (q) {
    filter.name = { $regex: String(q), $options: "i" };
  }
  const shops = await Shop.find(filter).select("name domain slug").lean();
  res.json({ data: shops, count: shops.length });
};

exports.rebuildSearchIndex = async (_req, res) => {
  const result = await rebuildIndex();
  res.json({ message: "Search index rebuilt", data: result });
};

exports.searchIndex = async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ message: "q required" });
  const results = await searchIndex(String(q));
  res.json({ data: results, count: results.length });
};

exports.searchStatus = async (_req, res) => {
  const SearchSyncState = require("../models/searchSyncState.model");
  const state = await SearchSyncState.findOne({ key: "search" }).lean();
  res.json({
    data: {
      lastRunAt: state?.lastRunAt || null,
    },
  });
};

exports.reindexDelta = async (_req, res) => {
  const { updateIncrementalIndex } = require("../services/searchIndex.service");
  const result = await updateIncrementalIndex();
  res.json({ message: "Search delta indexed", data: result });
};
