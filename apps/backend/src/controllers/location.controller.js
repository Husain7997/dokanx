const ShopLocation = require("../models/shopLocation.model");

exports.listLocations = async (req, res) => {
  const shopId = req.query.shopId || req.shop?._id || req.user?.shopId;
  if (!shopId) return res.status(400).json({ message: "shopId required" });
  const locations = await ShopLocation.find({ shopId, isActive: true }).lean();
  res.json({ data: locations });
};

exports.createLocation = async (req, res) => {
  const shopId = req.shop?._id || req.user?.shopId;
  if (!shopId) return res.status(400).json({ message: "shopId required" });
  const { name, address, city, country, lat, lng } = req.body || {};
  if (!name) return res.status(400).json({ message: "name required" });

  const location = await ShopLocation.create({
    shopId,
    name,
    address: address || "",
    city: city || "",
    country: country || "",
    coordinates: {
      type: "Point",
      coordinates: [Number(lng) || 0, Number(lat) || 0],
    },
  });

  res.status(201).json({ data: location });
};

exports.searchNearby = async (req, res) => {
  const { lat, lng, distance } = req.query;
  if (!lat || !lng) return res.status(400).json({ message: "lat and lng required" });
  const maxDistance = Number(distance) || 5000;

  const locations = await ShopLocation.find({
    coordinates: {
      $near: {
        $geometry: { type: "Point", coordinates: [Number(lng), Number(lat)] },
        $maxDistance: maxDistance,
      },
    },
    isActive: true,
  }).lean();

  res.json({ data: locations });
};
