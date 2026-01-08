const Shop = require("../models/shop.model");

module.exports = async (req, res, next) => {
  try {
    const shopId = req.headers["x-shop-id"];

    if (!shopId) {
      return res.status(400).json({ message: "Shop header missing" });
    }

    const shop = await Shop.findById(shopId);
    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }

    req.shop = shop;
    next();
  } catch (err) {
    return res.status(500).json({ message: "Tenant error" });
  }
};
