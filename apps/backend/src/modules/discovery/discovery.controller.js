const service = require("./discovery.service");

async function searchShops(req, res, next) {
  try {
    const data = await service.searchShops({
      q: req.query.q || "",
      lat: service.toNumber(req.query.lat),
      lng: service.toNumber(req.query.lng),
      radiusKm: service.toNumber(req.query.radiusKm, 10),
      limit: service.toNumber(req.query.limit, 20),
    });

    res.json({
      success: true,
      count: data.length,
      data,
    });
  } catch (err) {
    next(err);
  }
}

async function searchProducts(req, res, next) {
  try {
    const data = await service.searchProducts({
      q: req.query.q || "",
      category: req.query.category || "",
      lat: service.toNumber(req.query.lat),
      lng: service.toNumber(req.query.lng),
      radiusKm: service.toNumber(req.query.radiusKm, 10),
      limit: service.toNumber(req.query.limit, 20),
      minStock: service.toNumber(req.query.minStock, 0),
      maxPrice: service.toNumber(req.query.maxPrice),
      sortBy: req.query.sortBy || "relevance",
    });

    res.json({
      success: true,
      count: data.length,
      data,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  searchShops,
  searchProducts,
};
