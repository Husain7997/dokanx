function buildTrendAnalytics({ current = [], previous = [] } = {}) {
  const previousMap = new Map(previous.map(item => [String(item.key || ""), Number(item.value || 0)]));
  return current.map(item => {
    const key = String(item.key || "");
    const currentValue = Number(item.value || 0);
    const previousValue = Number(previousMap.get(key) || 0);
    const changePct =
      previousValue === 0
        ? currentValue === 0
          ? 0
          : 100
        : Number((((currentValue - previousValue) / previousValue) * 100).toFixed(2));
    return {
      key,
      currentValue,
      previousValue,
      changePct,
    };
  });
}

module.exports = {
  buildTrendAnalytics,
};
