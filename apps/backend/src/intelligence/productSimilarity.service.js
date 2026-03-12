function normalizeText(value = "") {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(value = "") {
  return normalizeText(value).split(" ").filter(Boolean);
}

function jaccardScore(a = [], b = []) {
  const setA = new Set(a);
  const setB = new Set(b);
  if (!setA.size && !setB.size) return 0;

  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) intersection += 1;
  }

  const union = new Set([...setA, ...setB]).size;
  return union ? intersection / union : 0;
}

function extractAttributes(product = {}) {
  const text = [
    product.name,
    product.canonicalName,
    product.description,
    ...(product.aliases || []),
  ]
    .filter(Boolean)
    .join(" ");

  const attributes = {};
  const storageMatch = text.match(/(\d+)\s?(gb|tb|ml|kg|g|inch|cm)/i);
  const colorMatch = text.match(/\b(black|white|blue|red|green|silver|gold|pink|gray|grey)\b/i);
  const modelMatch = text.match(/\b(pro max|pro|mini|plus|ultra|max)\b/i);

  if (storageMatch) {
    attributes.storage = `${storageMatch[1]}${String(storageMatch[2] || "").toUpperCase()}`;
  }
  if (colorMatch) {
    attributes.color = String(colorMatch[1] || "").toLowerCase();
  }
  if (modelMatch) {
    attributes.model = String(modelMatch[1] || "").toLowerCase();
  }
  if (product.brand) attributes.brand = String(product.brand).trim();
  if (product.category) attributes.category = String(product.category).trim();

  return attributes;
}

function inferMissingAttributes(product = {}, relatedProducts = []) {
  const base = extractAttributes(product);
  const inferred = { ...base };

  for (const related of relatedProducts) {
    const candidate = extractAttributes(related);
    for (const [key, value] of Object.entries(candidate)) {
      if (!inferred[key] && value) inferred[key] = value;
    }
  }

  return inferred;
}

function computeSimilarity(productA = {}, productB = {}) {
  const tokensA = tokenize(productA.name || productA.canonicalName || "");
  const tokensB = tokenize(productB.name || productB.canonicalName || "");
  const nameScore = jaccardScore(tokensA, tokensB);
  const normalizedA = normalizeText(productA.name || productA.canonicalName || "");
  const normalizedB = normalizeText(productB.name || productB.canonicalName || "");
  const containmentBoost =
    normalizedA && normalizedB && (normalizedA.includes(normalizedB) || normalizedB.includes(normalizedA)) ? 0.12 : 0;
  const brandScore =
    normalizeText(productA.brand) && normalizeText(productA.brand) === normalizeText(productB.brand)
      ? 1
      : 0;
  const categoryScore =
    normalizeText(productA.category) && normalizeText(productA.category) === normalizeText(productB.category)
      ? 1
      : 0;
  const barcodeScore =
    String(productA.barcode || "").trim() &&
    String(productA.barcode || "").trim() === String(productB.barcode || "").trim()
      ? 1
      : 0;
  const attrsA = extractAttributes(productA);
  const attrsB = extractAttributes(productB);
  const attrScore = jaccardScore(
    Object.entries(attrsA).map(([k, v]) => `${k}:${v}`),
    Object.entries(attrsB).map(([k, v]) => `${k}:${v}`)
  );

  const score = Number(
    (
      Math.min(1, nameScore + containmentBoost) * 0.45 +
      brandScore * 0.2 +
      categoryScore * 0.15 +
      barcodeScore * 0.1 +
      attrScore * 0.1
    ).toFixed(4)
  );

  return {
    score,
    isSimilar:
      score >= 0.6 ||
      barcodeScore === 1 ||
      (brandScore === 1 && categoryScore === 1 && (nameScore >= 0.25 || containmentBoost > 0)),
    isVariant:
      brandScore === 1 &&
      categoryScore === 1 &&
      nameScore >= 0.45 &&
      attrScore < 1 &&
      Object.keys(attrsA).some(key => attrsA[key] !== attrsB[key]),
    inferredAttributesA: attrsA,
    inferredAttributesB: attrsB,
  };
}

module.exports = {
  computeSimilarity,
  inferMissingAttributes,
  extractAttributes,
  _internals: {
    normalizeText,
    tokenize,
    jaccardScore,
  },
};
