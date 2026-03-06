const CatalogGlobalProduct = require("./catalogGlobalProduct.model");
const CatalogDecision = require("./catalogDecision.model");
const Product = require("@/models/product.model");

function normalizeName(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ");
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

  if (barcode) {
    const byBarcode = await CatalogGlobalProduct.findOne({ barcode });
    if (byBarcode) return byBarcode;
  }

  const existing = await CatalogGlobalProduct.findOne({
    normalizedName,
    brand: brand || "",
    category: category || "",
  });
  if (existing) return existing;

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
      { new: true }
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

module.exports = {
  findSuggestions,
  applyDecision,
};
