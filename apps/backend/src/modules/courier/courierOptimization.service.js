const CourierOptimizationProfile = require("./models/courierOptimizationProfile.model");

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function computeProviderScore(provider = {}, weights = {}) {
  const reliability = toNumber(provider.reliabilityScore, 50) / 100;
  const codSuccess = toNumber(provider.codSuccessRate, 50) / 100;
  const costScore = 1 - Math.min(toNumber(provider.cost, 0) / Math.max(toNumber(provider.maxCostBaseline, 200), 1), 1);
  const speedScore = 1 - Math.min(toNumber(provider.etaHours, 0) / Math.max(toNumber(provider.maxEtaBaseline, 72), 1), 1);

  return Number(
    (
      reliability * toNumber(weights.reliability, 0.4) +
      costScore * toNumber(weights.cost, 0.25) +
      speedScore * toNumber(weights.speed, 0.25) +
      codSuccess * toNumber(weights.codSuccess, 0.1)
    ).toFixed(4)
  );
}

async function upsertOptimizationProfile({ shopId, payload }) {
  return CourierOptimizationProfile.findOneAndUpdate(
    { shopId },
    {
      $set: {
        weights: {
          reliability: toNumber(payload?.weights?.reliability, 0.4),
          cost: toNumber(payload?.weights?.cost, 0.25),
          speed: toNumber(payload?.weights?.speed, 0.25),
          codSuccess: toNumber(payload?.weights?.codSuccess, 0.1),
        },
        preferredProviders: Array.isArray(payload?.preferredProviders) ? payload.preferredProviders : [],
      },
    },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
  );
}

async function getOptimizationProfile({ shopId }) {
  const result = CourierOptimizationProfile.findOne({ shopId });
  if (result && typeof result.lean === "function") {
    return result.lean();
  }
  return result;
}

async function recommendProvider({ shopId, providers = [] }) {
  const profile = (await getOptimizationProfile({ shopId })) || {
    weights: { reliability: 0.4, cost: 0.25, speed: 0.25, codSuccess: 0.1 },
    preferredProviders: [],
  };

  const ranked = providers
    .map(provider => ({
      ...provider,
      optimizationScore: computeProviderScore(provider, profile.weights),
      preferredBoost: profile.preferredProviders.includes(String(provider.name || "").toUpperCase()) ? 0.03 : 0,
    }))
    .map(provider => ({
      ...provider,
      optimizationScore: Number((provider.optimizationScore + provider.preferredBoost).toFixed(4)),
    }))
    .sort((a, b) => b.optimizationScore - a.optimizationScore);

  return {
    profile,
    recommendation: ranked[0] || null,
    rankedProviders: ranked,
  };
}

module.exports = {
  upsertOptimizationProfile,
  getOptimizationProfile,
  recommendProvider,
  _internals: {
    computeProviderScore,
  },
};
