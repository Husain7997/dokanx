function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function buildRegionalDemand({ rows = [] } = {}) {
  const grouped = rows.reduce((acc, row) => {
    const region = String(row.region || "UNKNOWN").trim();
    acc[region] = acc[region] || {
      region,
      demandUnits: 0,
      revenue: 0,
      searchVolume: 0,
    };
    acc[region].demandUnits += toNumber(row.demandUnits, 0);
    acc[region].revenue += toNumber(row.revenue, 0);
    acc[region].searchVolume += toNumber(row.searchVolume, 0);
    return acc;
  }, {});

  return Object.values(grouped)
    .map(item => ({
      ...item,
      demandScore: Number((item.demandUnits * 0.7 + item.searchVolume * 0.3).toFixed(2)),
    }))
    .sort((a, b) => b.demandScore - a.demandScore);
}

module.exports = {
  buildRegionalDemand,
};
