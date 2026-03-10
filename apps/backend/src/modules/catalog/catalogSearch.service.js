const { normalizeName } = require("./deduplication.engine");

function scoreGlobalProduct(product, query = {}) {
  const keyword = normalizeName(query.keyword);
  const barcode = String(query.barcode || "").trim();
  const brand = normalizeName(query.brand);
  const category = normalizeName(query.category);

  const productName = normalizeName(product.canonicalName);
  const aliases = (product.aliases || []).map(normalizeName);
  const productBrand = normalizeName(product.brand);
  const productCategory = normalizeName(product.category);

  let score = 0;

  if (barcode && product.barcode === barcode) score += 120;
  if (keyword && productName === keyword) score += 70;
  if (keyword && productName.startsWith(keyword)) score += 45;
  if (keyword && aliases.some(a => a.startsWith(keyword) || a.includes(keyword))) score += 30;
  if (keyword && productName.includes(keyword)) score += 20;
  if (brand && productBrand === brand) score += 10;
  if (category && productCategory === category) score += 10;
  if (product.popularityScore) score += Math.min(product.popularityScore, 10);

  return score;
}

async function searchGlobalProducts({
  CatalogGlobalProduct,
  query = {},
}) {
  const keyword = normalizeName(query.keyword);
  const brand = String(query.brand || "").trim();
  const category = String(query.category || "").trim();
  const barcode = String(query.barcode || "").trim();
  const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);

  const filter = { isActive: true };
  if (brand) filter.brand = new RegExp(`^${brand}$`, "i");
  if (category) filter.category = new RegExp(`^${category}$`, "i");
  if (barcode) filter.barcode = barcode;

  if (keyword) {
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const rx = new RegExp(escaped, "i");
    filter.$or = [{ normalizedName: rx }, { canonicalName: rx }, { aliases: rx }];
  }

  const docs = await CatalogGlobalProduct.find(filter)
    .sort({ updatedAt: -1 })
    .limit(limit * 3)
    .lean();

  const ranked = docs
    .map(d => ({
      ...d,
      score: scoreGlobalProduct(d, query),
    }))
    .filter(d => !keyword || d.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if ((b.popularityScore || 0) !== (a.popularityScore || 0)) {
        return (b.popularityScore || 0) - (a.popularityScore || 0);
      }
      return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0);
    })
    .slice(0, limit)
    .map(d => ({
      _id: d._id,
      canonicalName: d.canonicalName,
      normalizedName: d.normalizedName,
      brand: d.brand || "",
      category: d.category || "",
      barcode: d.barcode || "",
      imageUrl: d.imageUrl || "",
      confidence: d.confidence || 0,
      popularityScore: d.popularityScore || 0,
      score: d.score,
    }));

  return ranked;
}

module.exports = {
  searchGlobalProducts,
};
