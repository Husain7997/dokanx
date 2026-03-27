exports.getTrafficContext = async (req, res) => {
  res.json({
    data: req.traffic || {
      type: "marketplace",
      isMarketplaceEnabled: true,
      scopeShopId: null,
    },
  });
};
