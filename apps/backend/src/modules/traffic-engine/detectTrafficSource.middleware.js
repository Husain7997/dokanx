const Shop = require("../../models/shop.model");

function normalizeHost(host) {
  return String(host || "")
    .split(":")[0]
    .trim()
    .toLowerCase();
}

function parseMarketplaceHosts() {
  return String(process.env.MARKETPLACE_HOSTS || process.env.APP_HOST || "")
    .split(",")
    .map((value) => normalizeHost(value))
    .filter(Boolean);
}

async function resolveDirectShop(req) {
  if (req.tenant?._id || req.shop?._id) {
    return req.tenant || req.shop;
  }

  const host = normalizeHost(req.headers.host);
  if (!host) return null;

  return Shop.findOne({
    $or: [
      { domain: host },
      { storefrontDomain: host },
    ],
  }).lean();
}

async function detectTrafficSource(req, _res, next) {
  try {
    const headerSource = String(req.headers["x-traffic-source"] || "").toLowerCase();
    const explicitTraffic = String(req.query.traffic || req.query.source || "").toLowerCase();
    const host = normalizeHost(req.headers.host);
    const marketplaceHosts = parseMarketplaceHosts();
    const directShop = await resolveDirectShop(req);

    const hasUtm =
      Boolean(req.query.utm_source) ||
      Boolean(req.query.utm_medium) ||
      Boolean(req.query.ref) ||
      explicitTraffic === "direct" ||
      headerSource === "direct";

    const isCustomDomain =
      Boolean(directShop?._id) &&
      host &&
      !marketplaceHosts.includes(host);

    const type = hasUtm || isCustomDomain ? "direct" : "marketplace";
    const scopeShopId =
      String(req.query.shopId || req.body?.shopId || req.tenant?._id || req.shop?._id || directShop?._id || "") || null;

    req.traffic = {
      type,
      isMarketplaceEnabled: type !== "direct",
      scopeShopId,
    };

    if (type === "direct" && scopeShopId) {
      if (!req.query.shopId) req.query.shopId = scopeShopId;
      if (req.body && !req.body.shopId) req.body.shopId = scopeShopId;
      if (!req.shop && directShop?._id) req.shop = directShop;
    }

    next();
  } catch (error) {
    next(error);
  }
}

module.exports = detectTrafficSource;
