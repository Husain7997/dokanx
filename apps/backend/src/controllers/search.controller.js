const Product = require("../models/product.model");
const Shop = require("../models/shop.model");

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
