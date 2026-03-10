const CatalogGlobalProduct = require("./models/catalogGlobalProduct.model");
const CatalogDecision = require("./models/catalogDecision.model");
const Product = require("@/models/product.model");
const Brand = require("./models/Brand.model");
const catalogSearch = require("./catalogSearch.service");
const {
  normalizeName,
  buildCanonicalKey,
  findDuplicateGlobalProduct,
} = require("./deduplication.engine");

let brandCache = {
  expiresAt: 0,
  rows: [],
};

const BRAND_CACHE_TTL_MS = 5 * 60 * 1000;

function normalizeTokenized(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function brandMatchScore(productText, brandText) {
  if (!productText || !brandText) return 0;
  if (productText === brandText) return 120;
  if (productText.startsWith(`${brandText} `)) return 100;
  if (productText.includes(` ${brandText} `)) return 90;
  if (productText.endsWith(` ${brandText}`)) return 80;

  const productTokens = new Set(productText.split(" ").filter(Boolean));
  const brandTokens = brandText.split(" ").filter(Boolean);
  if (!brandTokens.length) return 0;

  let matched = 0;
  for (const token of brandTokens) {
    if (productTokens.has(token)) matched += 1;
  }

  const ratio = matched / brandTokens.length;
  if (ratio === 1) return 70 + brandTokens.length;
  if (ratio >= 0.6) return 45 + brandTokens.length;
  if (ratio >= 0.4) return 25 + brandTokens.length;
  return 0;
}

async function getBrandRowsCached() {
  if (brandCache.expiresAt > Date.now() && brandCache.rows.length) {
    return brandCache.rows;
  }

  const rows = await Brand.find({})
    .select("name")
    .lean();

  brandCache = {
    rows,
    expiresAt: Date.now() + BRAND_CACHE_TTL_MS,
  };

  return rows;
}

function resetBrandCache() {
  brandCache = {
    expiresAt: 0,
    rows: [],
  };
}

function scoreSuggestion(product, queryName, queryBarcode) {
  let score = 0;
  const q = normalizeName(queryName);
  const pName = normalizeName(product.canonicalName);
  const aliases = (product.aliases || []).map(normalizeName);

  if (queryBarcode && product.barcode && queryBarcode === product.barcode) score += 65;
  if (q && pName === q) score += 55;
  if (q && pName.startsWith(q)) score += 35;
  if (q && aliases.some(a => a.startsWith(q) || a.includes(q))) score += 20;
  if (product.brand) score += 5;
  if (product.category) score += 5;

  return Math.min(score, 100);
}

async function findSuggestions({
  name,
  barcode,
  limit = 10,
}) {
  const normalized = normalizeName(name);
  const regex = normalized ? new RegExp(`^${normalized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i") : null;

  const baseQuery = {
    isActive: true,
    ...(barcode
      ? { $or: [{ barcode }, ...(regex ? [{ normalizedName: regex }, { aliases: regex }] : [])] }
      : regex
        ? { $or: [{ normalizedName: regex }, { aliases: regex }, { canonicalName: regex }] }
        : {}),
  };

  const docs = await CatalogGlobalProduct.find(baseQuery)
    .sort({ updatedAt: -1 })
    .limit(Math.max(Number(limit) || 10, 1))
    .lean();

  const mapped = docs
    .map(d => ({
      ...d,
      score: scoreSuggestion(d, name, barcode),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(d => ({
      globalProductId: d._id,
      name: d.canonicalName,
      brand: d.brand || "",
      category: d.category || "",
      barcode: d.barcode || "",
      imageUrl: d.imageUrl || "",
      confidence: Number(((d.score / 100) * 0.95 + (d.confidence || 0) * 0.05).toFixed(2)),
      score: d.score,
    }));

  const best = mapped[0] || null;

  return {
    query: {
      name: name || "",
      barcode: barcode || "",
    },
    found: mapped.length > 0,
    suggestions: mapped,
    bestMatch: best,
    askToAddGlobal: mapped.length === 0,
  };
}

async function ensureGlobalProduct({
  name,
  brand,
  category,
  barcode,
  imageUrl,
  source,
  createdByShop,
}) {
  const normalizedName = normalizeName(name);
  if (!normalizedName) throw new Error("Global product name is required");

  const duplicate = await findDuplicateGlobalProduct({
    CatalogGlobalProduct,
    payload: { name, brand, category, barcode },
  });
  if (duplicate.product) return duplicate.product;

  return CatalogGlobalProduct.create({
    canonicalName: String(name).trim(),
    normalizedName,
    aliases: [],
    brand: brand || "",
    category: category || "",
    barcode: barcode || "",
    imageUrl: imageUrl || "",
    source: source || "SHOP_SUBMITTED",
    confidence: 0.75,
    createdByShop: createdByShop || null,
  });
}

async function upsertLocalProduct({
  shopId,
  payload,
  productId,
}) {
  const name = String(payload.name || "").trim();
  if (!name) throw new Error("Local product name is required");

  const data = {
    shopId,
    name,
    brand: payload.brand || "",
    category: payload.category || "",
    barcode: payload.barcode || "",
    imageUrl: payload.imageUrl || "",
    price: Number(payload.price || 0),
  };

  if (productId) {
    const updated = await Product.findOneAndUpdate(
      { _id: productId, shopId },
      { $set: data },
      { returnDocument: "after" }
    );
    if (!updated) throw new Error("Product not found for this shop");
    return updated;
  }

  return Product.create({
    ...data,
    stock: Number(payload.stock || 0),
    reserved: 0,
    isActive: true,
  });
}

async function applyDecision({
  shopId,
  actorId,
  action,
  query,
  globalProductId,
  localProduct,
  allowCreateGlobal,
  productId,
}) {
  const normalizedAction = String(action || "").toUpperCase();
  if (!["ACCEPT", "EDIT", "IGNORE"].includes(normalizedAction)) {
    throw new Error("Invalid action. Use ACCEPT, EDIT or IGNORE");
  }

  let globalProduct = null;
  if (globalProductId) {
    globalProduct = await CatalogGlobalProduct.findById(globalProductId);
    if (!globalProduct) throw new Error("Global product not found");
  }

  const selectedSnapshot = globalProduct
    ? {
        name: globalProduct.canonicalName,
        brand: globalProduct.brand || "",
        category: globalProduct.category || "",
        barcode: globalProduct.barcode || "",
        imageUrl: globalProduct.imageUrl || "",
        price: null,
      }
    : {
        name: query?.name || "",
        brand: "",
        category: "",
        barcode: query?.barcode || "",
        imageUrl: "",
        price: null,
      };

  let persistedProduct = null;

  if (normalizedAction !== "IGNORE") {
    let draft = {
      ...(selectedSnapshot || {}),
      ...(localProduct || {}),
    };

    if (!draft.name && query?.name) draft.name = query.name;
    persistedProduct = await upsertLocalProduct({
      shopId,
      payload: draft,
      productId: productId || null,
    });

    if (!globalProduct && allowCreateGlobal) {
      globalProduct = await ensureGlobalProduct({
        name: draft.name,
        brand: draft.brand,
        category: draft.category,
        barcode: draft.barcode,
        imageUrl: draft.imageUrl,
        source: normalizedAction === "EDIT" ? "SHOP_EDITED" : "SHOP_SUBMITTED",
        createdByShop: shopId,
      });
    }
  }

  const decision = await CatalogDecision.create({
    shopId,
    actorId,
    action: normalizedAction,
    globalProductId: globalProduct?._id || null,
    productId: persistedProduct?._id || null,
    query: {
      name: query?.name || "",
      barcode: query?.barcode || "",
    },
    selectedSnapshot,
    localSnapshot: {
      name: persistedProduct?.name || localProduct?.name || "",
      brand: persistedProduct?.brand || localProduct?.brand || "",
      category: persistedProduct?.category || localProduct?.category || "",
      barcode: persistedProduct?.barcode || localProduct?.barcode || "",
      imageUrl: persistedProduct?.imageUrl || localProduct?.imageUrl || "",
      price: Number(
        persistedProduct?.price ??
        localProduct?.price ??
        null
      ),
    },
    allowCreateGlobal: Boolean(allowCreateGlobal),
  });

  return {
    decision,
    globalProduct,
    product: persistedProduct,
  };
}

async function createGlobalProduct(payload = {}) {
  const name = String(payload.name || "").trim();
  if (!name) throw new Error("Product name required");

  const normalizedName = normalizeName(name);

  const brand =
    payload.brand || await detectBrand(name);

  const category =
    payload.category || detectCategory(name);

  const duplicate = await findDuplicateGlobalProduct({
    CatalogGlobalProduct,
    payload: {
      name,
      brand,
      category,
      barcode: payload.barcode || "",
    },
  });
  if (duplicate.product) {
    return {
      product: duplicate.product,
      dedupeStatus: "matched",
      dedupeReason: duplicate.reason,
      canonicalKey: buildCanonicalKey({ name, brand, category }),
    };
  }

  const product = await CatalogGlobalProduct.create({
    canonicalName: name,
    normalizedName,
    brand,
    category,
    barcode: payload.barcode || "",
    imageUrl: payload.imageUrl || "",
    aliases: Array.isArray(payload.aliases)
      ? [...new Set(payload.aliases.map(v => String(v || "").trim()).filter(Boolean))]
      : [],
    source: "SYSTEM",
    confidence: 0.9,
    createdByShop: payload.createdByShop || null,
  });

  return {
    product,
    dedupeStatus: "created",
    dedupeReason: "NO_MATCH",
    canonicalKey: buildCanonicalKey({ name, brand, category }),
  };
}

async function mergeDuplicateProducts({
  sourceId,
  targetId
}) {

  if (sourceId === targetId) {
    throw new Error("Cannot merge same product");
  }

  const source = await CatalogGlobalProduct.findById(sourceId);
  const target = await CatalogGlobalProduct.findById(targetId);

  if (!source || !target) {
    throw new Error("Product not found");
  }

  const mergedAliases = [
    ...new Set([
      ...target.aliases,
      source.canonicalName,
      ...(source.aliases || [])
    ])
  ];

  target.aliases = mergedAliases;

  if (!target.barcode && source.barcode) {
    target.barcode = source.barcode;
  }

  await target.save();

  source.isActive = false;
  await source.save();

  return {
    mergedInto: target._id,
    disabled: source._id
  };
}

async function searchGlobalProducts(query = {}) {
  return catalogSearch.searchGlobalProducts({
    CatalogGlobalProduct,
    query,
  });
}

async function detectBrand(productName = "") {
  const productText = normalizeTokenized(productName);
  if (!productText) return "";

  try {
    const brands = await getBrandRowsCached();

    let best = { name: "", score: 0 };
    for (const row of brands) {
      const brandName = String(row?.name || "").trim();
      if (!brandName) continue;

      const score = brandMatchScore(productText, normalizeTokenized(brandName));
      if (score > best.score) {
        best = { name: brandName, score };
      }
    }

    return best.score >= 30 ? best.name : "";
  } catch (_err) {
    // Brand detection is advisory; failures should not block catalog operations.
    return "";
  }
}

function detectCategory(productName = "") {
  const name = productName.toLowerCase();

  const rules = [
    { keyword: "soap", category: "Beauty Soap" },
    { keyword: "shampoo", category: "Hair Care" },
    { keyword: "biscuit", category: "Snacks" },
    { keyword: "noodle", category: "Instant Noodles" },
    { keyword: "oil", category: "Cooking Oil" }
  ];

  for (const r of rules) {
    if (name.includes(r.keyword)) {
      return r.category;
    }
  }

  return "General";
}



module.exports = {
  findSuggestions,
  applyDecision,
  upsertLocalProduct,
  searchGlobalProducts,
  detectBrand,
  detectCategory,
  createGlobalProduct,
  mergeDuplicateProducts,
  _internals: {
    brandMatchScore,
    resetBrandCache,
  },
};
