function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function buildDailySalesAggregate({ rows = [] } = {}) {
  const grouped = rows.reduce((acc, row) => {
    const dateKey = String(row.dateKey || row.date || "").trim();
    if (!dateKey) return acc;
    acc[dateKey] = acc[dateKey] || {
      dateKey,
      orderCount: 0,
      grossSales: 0,
      itemCount: 0,
    };
    acc[dateKey].orderCount += toNumber(row.orderCount, 0);
    acc[dateKey].grossSales += toNumber(row.grossSales, 0);
    acc[dateKey].itemCount += toNumber(row.itemCount, 0);
    return acc;
  }, {});

  return Object.values(grouped).sort((a, b) => a.dateKey.localeCompare(b.dateKey));
}

module.exports = {
  buildDailySalesAggregate,
};
