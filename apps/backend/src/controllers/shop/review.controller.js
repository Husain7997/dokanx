const ProductReview = require("../../models/productReview.model");

exports.listShopReviews = async (req, res) => {
  const shopId = req.shop?._id || req.user?.shopId;
  if (!shopId) {
    return res.status(400).json({ message: "Shop context missing" });
  }

  const status = req.query.status;
  const limit = Math.min(Number(req.query.limit) || 50, 200);

  const filter = { shopId };
  if (status && status !== "ALL") {
    filter.status = status;
  }

  const reviews = await ProductReview.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  res.json({ data: reviews });
};
