const mongoose = require("mongoose");
const Shop = require("../models/shop.model");

async function tenantResolver(req, _res, next) {
  try {
    const tenantId = req.headers["x-tenant-id"];
    const tenantSlug = req.headers["x-tenant-slug"];

    if (!tenantId && !tenantSlug) {
      return next();
    }

    let shop = null;

    if (tenantSlug) {
      shop = await Shop.findOne({
        $or: [{ slug: tenantSlug }, { domain: tenantSlug }],
      });
    }

    if (!shop && tenantId && mongoose.isValidObjectId(tenantId)) {
      shop = await Shop.findById(tenantId);
    }

    if (shop) {
      req.tenant = shop;
      if (!req.shop) req.shop = shop;
    }

    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = tenantResolver;
