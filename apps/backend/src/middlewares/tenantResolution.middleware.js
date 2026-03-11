const domainService = require("@/services/domain.service");
const { logger } = require("@/core/infrastructure");

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
