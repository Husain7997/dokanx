function clamp(value, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function scoreConfidence(items = []) {
  if (!items.length) return 0.15;
  const top = Number(items[0]?.score || 0);
  const second = Number(items[1]?.score || 0);
  const spread = Math.max(0, top - second);
  const density = Math.min(1, items.length / 6);
  return clamp(top / 100 * 0.7 + spread / 20 * 0.15 + density * 0.15);
}

function guardRecommendationDecision({ items = [], fallbackItems = [], minimumCount = 4 }) {
  const confidence = scoreConfidence(items);
  if (items.length >= minimumCount && confidence >= 0.32) {
    return {
      confidence: Number(confidence.toFixed(3)),
      mode: "primary",
      reasons: ["primary_ranking_confident"],
      items,
    };
  }

  const merged = [...items];
  for (const fallback of fallbackItems) {
    if (!merged.find((item) => String(item.product?._id || item.productId) === String(fallback.product?._id || fallback.productId))) {
      merged.push(fallback);
    }
    if (merged.length >= minimumCount) break;
  }

  return {
    confidence: Number(confidence.toFixed(3)),
    mode: "fallback",
    reasons: items.length ? ["low_confidence_primary", "fallback_applied"] : ["empty_primary", "fallback_applied"],
    items: merged,
  };
}

function guardRiskDecision({ score = 0, signals = [] }) {
  const confidence = clamp((signals.length * 0.18) + (Math.min(score, 100) / 100) * 0.52 + 0.2);
  return {
    score,
    confidence: Number(confidence.toFixed(3)),
    fallbackApplied: signals.length === 0,
  };
}

module.exports = {
  guardRecommendationDecision,
  guardRiskDecision,
};
