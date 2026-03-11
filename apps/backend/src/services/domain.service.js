const Shop = require("@/models/shop.model");
const { getConfig } = require("@/platform/config/platformConfig.service");
const { logger } = require("@/core/infrastructure");

const tenantCache = new Map();
const DEFAULT_CACHE_TTL_MS = 60 * 1000;

function normalizeHost(host = "") {
  return String(host || "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .split("/")[0]
    .split(":")[0];
}

function isIpAddress(host = "") {
  return /^(\d{1,3}\.){3}\d{1,3}$/.test(host);
}

function readCache(key) {
  const entry = tenantCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    tenantCache.delete(key);
    return null;
  }
  return entry.value;
}

function writeCache(key, value, ttlMs = DEFAULT_CACHE_TTL_MS) {
  tenantCache.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
  });
  return value;
}

async function getBaseDomain() {
  const configured = await getConfig({
    key: "tenant.base_domain",
    fallback: process.env.BASE_DOMAIN || "dokanx.com",
  });
  return normalizeHost(configured);
}

function extractSubdomain(host, baseDomain) {
  if (!host || !baseDomain) return "";
  if (host === baseDomain) return "";
  if (!host.endsWith(`.${baseDomain}`)) return "";

  const suffix = `.${baseDomain}`;
  return host.slice(0, host.length - suffix.length);
}

async function resolveShopByHost({ host, cacheTtlMs = DEFAULT_CACHE_TTL_MS }) {
  const normalizedHost = normalizeHost(host);
  if (!normalizedHost || normalizedHost === "localhost" || isIpAddress(normalizedHost)) {
    return null;
  }

  const cached = readCache(normalizedHost);
  if (cached !== null) {
    return cached;
  }

  let shop = await Shop.findOne({
    $or: [{ domain: normalizedHost }, { "customDomains.domain": normalizedHost }],
    isActive: true,
    status: "ACTIVE",
  })
    .select("_id name domain subdomain customDomains status isActive")
    .lean();

  if (!shop) {
    const baseDomain = await getBaseDomain();
    const subdomain = extractSubdomain(normalizedHost, baseDomain);
    if (subdomain) {
      shop = await Shop.findOne({
        subdomain,
        isActive: true,
        status: "ACTIVE",
      })
        .select("_id name domain subdomain customDomains status isActive")
        .lean();
    }
  }

  if (!shop) {
    logger.debug({ host: normalizedHost }, "No tenant matched for host");
    return writeCache(normalizedHost, null, 10 * 1000);
  }

  return writeCache(normalizedHost, shop, cacheTtlMs);
}

function clearDomainCache() {
  tenantCache.clear();
}

module.exports = {
  normalizeHost,
  extractSubdomain,
  resolveShopByHost,
  clearDomainCache,
};
