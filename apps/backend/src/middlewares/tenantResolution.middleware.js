const domainService = require("@/services/domain.service");
const { logger } = require("@/core/infrastructure");
const Shop = require("@/models/shop.model");

function getHost(req) {
  return (
    req.headers["x-forwarded-host"] ||
    req.headers.host ||
    req.hostname ||
    ""
  );
}

async function resolveTenant(req, _res, next) {
  try {
    if (req.shop?._id) {
      return next();
    }

    const tenantId = String(req.headers["x-tenant-id"] || "").trim();
    if (tenantId) {
      const shopById = await Shop.findById(tenantId)
        .select("_id name domain subdomain customDomains status isActive owner")
        .lean();
      if (shopById) {
        req.shop = shopById;
        req.tenant = String(shopById._id);
        req.tenantHost = domainService.normalizeHost(getHost(req));
        return next();
      }
    }

    const tenantSlug = String(req.headers["x-tenant-slug"] || "").trim().toLowerCase();
    if (tenantSlug) {
      const shopBySlug = await Shop.findOne({
        $or: [
          { subdomain: tenantSlug },
          { domain: tenantSlug },
          { "customDomains.domain": tenantSlug },
        ],
        isActive: true,
        status: "ACTIVE",
      })
        .select("_id name domain subdomain customDomains status isActive owner")
        .lean();

      if (shopBySlug) {
        req.shop = shopBySlug;
        req.tenant = String(shopBySlug._id);
        req.tenantHost = domainService.normalizeHost(getHost(req));
        return next();
      }
    }

    const host = getHost(req);
    if (!host) {
      return next();
    }

    const shop = await domainService.resolveShopByHost({ host });
    if (shop) {
      req.shop = shop;
      req.tenant = String(shop._id);
      req.tenantHost = domainService.normalizeHost(host);
    }

    return next();
  } catch (err) {
    logger.warn({ err: err.message }, "Tenant resolution failed");
    return next();
  }
}

module.exports = {
  resolveTenant,
};
