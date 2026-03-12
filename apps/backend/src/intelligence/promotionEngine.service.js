function buildSmartCoupon({ shopId, customerId, discountPct = 10, reason = "ABANDONED_CART" }) {
  return {
    shopId,
    customerId,
    code: `AI${String(reason).slice(0, 3)}${Date.now().toString().slice(-6)}`,
    discountPct: Math.min(Math.max(Number(discountPct) || 10, 5), 30),
    reason,
    expiresInDays: 7,
  };
}

function buildDynamicPromotion({ shopId, productId, inventoryDaysCover = null, salesTrendPct = 0 }) {
  const shouldDiscount = Number(inventoryDaysCover || 0) > 30 || Number(salesTrendPct || 0) < -15;
  return {
    shopId,
    productId,
    promotionType: shouldDiscount ? "DISCOUNT" : "BUNDLE",
    discountPct: shouldDiscount ? 10 : 0,
    message: shouldDiscount
      ? "Apply a 10% promotion to improve conversion"
      : "Consider bundle promotion for cross-sell uplift",
  };
}

module.exports = {
  buildSmartCoupon,
  buildDynamicPromotion,
};
