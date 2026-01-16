const Shop = require("../models/shop.model");

exports.resolveShop = async (req, res, next) => {
  try {
    let shop;

    // ✅ 1. Header based (LOCAL DEV / API)
    if (req.headers["x-shop-id"]) {
      shop = await Shop.findById(req.headers["x-shop-id"]);
    }

    // ✅ 2. Subdomain based (PRODUCTION)
    if (!shop) {
      const host = req.headers.host;

      if (host && !host.includes("localhost")) {
        const subdomain = host.split(".")[0];
        shop = await Shop.findOne({ slug: subdomain });
      }
    }

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: "Shop not found"
      });
    }

    req.shop = shop;
    next();
  } catch (error) {
    console.error("SHOP RESOLVE ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to resolve shop"
    });
  }
};
