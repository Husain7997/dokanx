const Product = require("../../models/product.model");

exports.updateProductModeration = async (req, res) => {
  const { productId } = req.params;
  const { status, note } = req.body || {};

  if (!productId) return res.status(400).json({ message: "productId required" });
  if (!["APPROVED", "REJECTED", "FLAGGED", "PENDING"].includes(String(status || ""))) {
    return res.status(400).json({ message: "Invalid status" });
  }

  const product = await Product.findByIdAndUpdate(
    productId,
    {
      moderationStatus: status,
      moderationNote: note || "",
      isActive: status === "APPROVED",
    },
    { returnDocument: "after" }
  );

  if (!product) return res.status(404).json({ message: "Product not found" });
  res.json({ message: "Product moderation updated", data: product });
};

