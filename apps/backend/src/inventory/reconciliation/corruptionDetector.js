function detectCorruption(product, replayed) {
  const issues = [];

  if (product.stock !== replayed.available)
    issues.push("AVAILABLE_MISMATCH");

  if (product.reservedStock !== replayed.reserved)
    issues.push("RESERVED_MISMATCH");

  if (replayed.available < 0)
    issues.push("NEGATIVE_STOCK");

  return issues;
}

module.exports = { detectCorruption };