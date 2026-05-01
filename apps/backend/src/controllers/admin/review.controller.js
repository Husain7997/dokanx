const ProductReview = require("../../models/productReview.model");

exports.listReviews = async (req, res) => {
  const status = (req.query.status || "PENDING").toString().toUpperCase();
  const filter = status === "ALL" ? {} : { status };
  const reviews = await ProductReview.find(filter)
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();
  res.json({ data: reviews });
};

exports.approveReview = async (req, res) => {
  const review = await ProductReview.findByIdAndUpdate(
    req.params.reviewId,
    {
      status: "APPROVED",
      approvedAt: new Date(),
      approvedBy: req.user?._id || null,
    },
    { returnDocument: "after" }
  );
  if (!review) return res.status(404).json({ message: "Review not found" });
  res.json({ message: "Review approved", data: review });
};

exports.rejectReview = async (req, res) => {
  const review = await ProductReview.findByIdAndUpdate(
    req.params.reviewId,
    {
      status: "REJECTED",
      approvedAt: null,
      approvedBy: req.user?._id || null,
    },
    { returnDocument: "after" }
  );
  if (!review) return res.status(404).json({ message: "Review not found" });
  res.json({ message: "Review rejected", data: review });
};

