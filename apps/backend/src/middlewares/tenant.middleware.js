const Shop = require("../models/shop.model");

async function tenantResolver(req, _res, next) {
  try {
    const tenantId = req.headers["x-tenant-id"];
    const tenantSlug = req.headers["x-tenant-slug"];

    if (!tenantId && !tenantSlug) {
      return next();
    }

    let shop = null;
    if (tenantId) {
      shop = await Shop.findById(tenantId);
    } else if (tenantSlug) {
      shop = await Shop.findOne({
        $or: [{ slug: tenantSlug }, { domain: tenantSlug }],
      });
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
