const CustomerSegment = require("./models/customerSegment.model");

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function deriveSegment(profile = {}) {
  const totalOrders = toNumber(profile.totalOrders, 0);
  const lifetimeValue = toNumber(profile.lifetimeValue, 0);
  const inactiveDays = toNumber(profile.inactiveDays, 0);

  if (inactiveDays >= 45) return "AT_RISK";
  if (totalOrders >= 8 || lifetimeValue >= 20000) return "VIP";
  if (totalOrders >= 3 || lifetimeValue >= 5000) return "LOYAL";
  return "NEW";
}

async function upsertSegment({ shopId, payload }) {
  return CustomerSegment.findOneAndUpdate(
    { shopId, name: String(payload.name || "").trim().toUpperCase() },
    {
      $set: {
        criteria: {
          minOrders: toNumber(payload?.criteria?.minOrders, 0),
          minSpend: toNumber(payload?.criteria?.minSpend, 0),
          inactiveDays: toNumber(payload?.criteria?.inactiveDays, 0),
        },
        isSystem: Boolean(payload.isSystem),
        isActive: payload.isActive !== false,
      },
    },
    {
      upsert: true,
      returnDocument: "after",
      setDefaultsOnInsert: true,
    }
  );
}

async function listSegments({ shopId }) {
  return CustomerSegment.find({ shopId }).sort({ name: 1 }).lean();
}

async function evaluateCustomerProfiles({ shopId, profiles = [] }) {
  const summary = {};
  const results = profiles.map(profile => {
    const segment = deriveSegment(profile);
    summary[segment] = (summary[segment] || 0) + 1;
    return {
      customerId: profile.customerId || null,
      totalOrders: toNumber(profile.totalOrders, 0),
      lifetimeValue: toNumber(profile.lifetimeValue, 0),
      inactiveDays: toNumber(profile.inactiveDays, 0),
      segment,
    };
  });

  await Promise.all(
    Object.entries(summary).map(([name, customerCount]) =>
      CustomerSegment.findOneAndUpdate(
        { shopId, name },
        {
          $set: {
            stats: {
              customerCount,
              avgOrderValue: Number(
                (
                  results
                    .filter(item => item.segment === name)
                    .reduce((sum, item) => sum + (item.totalOrders ? item.lifetimeValue / item.totalOrders : 0), 0) /
                  Math.max(customerCount, 1)
                ).toFixed(2)
              ),
            },
            isSystem: true,
            isActive: true,
          },
          $setOnInsert: {
            criteria: {},
          },
        },
        {
          upsert: true,
          returnDocument: "after",
          setDefaultsOnInsert: true,
        }
      )
    )
  );

  return {
    summary,
    customers: results,
  };
}

module.exports = {
  upsertSegment,
  listSegments,
  evaluateCustomerProfiles,
  _internals: {
    deriveSegment,
  },
};
