const Shop = require("../models/shop.model");
const { serializeCustomThemeDefinition } = require("./theme.util");

function normalizeMarketplaceTheme(theme, shop) {
  const serialized = serializeCustomThemeDefinition(theme);
  if (!serialized) return null;

  return {
    ...serialized,
    sourceShopId: String(shop?._id || ""),
    sourceShopName: String(shop?.name || "Merchant shop"),
    approvalStatus: String(theme?.approvalStatus || "PENDING").toUpperCase(),
    marketplaceStatus: String(theme?.marketplaceStatus || "PRIVATE").toUpperCase(),
    marketplaceFeatured: Boolean(theme?.marketplaceFeatured),
    submittedForReviewAt: theme?.submittedForReviewAt || null,
    approvedAt: theme?.approvedAt || null,
    rejectedAt: theme?.rejectedAt || null,
    rejectionReason: String(theme?.rejectionReason || ""),
    reviewedByName: String(theme?.reviewedByName || ""),
    isCurated: true,
  };
}

async function listMarketplaceThemeEntries() {
  const shops = await Shop.find({})
    .select("name slug customThemes")
    .lean();

  return shops
    .flatMap((shop) =>
      (Array.isArray(shop?.customThemes) ? shop.customThemes : [])
        .map((theme) => normalizeMarketplaceTheme(theme, shop))
        .filter(Boolean)
    )
    .sort(
      (left, right) =>
        new Date(right.submittedForReviewAt || right.approvedAt || right.rejectedAt || 0).getTime() -
        new Date(left.submittedForReviewAt || left.approvedAt || left.rejectedAt || 0).getTime()
    );
}

async function listCuratedMarketplaceThemes() {
  const entries = await listMarketplaceThemeEntries();
  return entries.filter(
    (theme) => theme.approvalStatus === "APPROVED" && theme.marketplaceStatus === "LISTED"
  );
}

module.exports = {
  listMarketplaceThemeEntries,
  listCuratedMarketplaceThemes,
};
