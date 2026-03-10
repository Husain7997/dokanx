function normalizeName(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ");
}

function normalizeToken(value) {
  return String(value || "").trim().toLowerCase();
}

function buildCanonicalKey({ name, brand, category, packSize }) {
  return [name, brand, category, packSize]
    .map(normalizeToken)
    .join("|");
}

async function findDuplicateGlobalProduct({
  CatalogGlobalProduct,
  payload = {},
}) {
  const barcode = String(payload.barcode || "").trim();
  if (barcode) {
    const byBarcode = await CatalogGlobalProduct.findOne({
      barcode,
      isActive: true,
    });
    if (byBarcode) {
      return { product: byBarcode, reason: "BARCODE_EXACT" };
    }
  }

  const normalizedName = normalizeName(payload.name);
  if (!normalizedName) {
    return { product: null, reason: "EMPTY_NAME" };
  }

  const brand = String(payload.brand || "").trim();
  const category = String(payload.category || "").trim();

  const byKey = await CatalogGlobalProduct.findOne({
    normalizedName,
    brand,
    category,
    isActive: true,
  });

  if (byKey) {
    return { product: byKey, reason: "CANONICAL_KEY" };
  }

  return { product: null, reason: "NO_MATCH" };
}

module.exports = {
  normalizeName,
  buildCanonicalKey,
  findDuplicateGlobalProduct,
};
