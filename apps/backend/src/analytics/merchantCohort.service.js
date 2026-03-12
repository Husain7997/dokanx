function buildMerchantCohorts({ merchants = [] } = {}) {
  const cohorts = merchants.reduce((acc, merchant) => {
    const date = new Date(merchant.createdAt || Date.now());
    const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
    acc[key] = acc[key] || {
      cohort: key,
      merchantCount: 0,
      activeMerchantCount: 0,
    };
    acc[key].merchantCount += 1;
    if (merchant.isActive !== false && merchant.status !== "SUSPENDED") {
      acc[key].activeMerchantCount += 1;
    }
    return acc;
  }, {});

  return Object.values(cohorts)
    .map(item => ({
      ...item,
      retentionRate: item.merchantCount
        ? Number((item.activeMerchantCount / item.merchantCount).toFixed(2))
        : 0,
    }))
    .sort((a, b) => a.cohort.localeCompare(b.cohort));
}

module.exports = {
  buildMerchantCohorts,
};
