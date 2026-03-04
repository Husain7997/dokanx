const Shop = require("../models/shop.model");
module.exports = async (req, res, next) => {
  try {
    const shop = req.shop;

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: "Shop context missing",
      });
    }

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    // ✅ Owner validation
    if (shop.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Shop ownership mismatch",
      });
    }

    // ✅ Active shop check
 if (shop.isActive === false || shop.status === "SUSPENDED") {
  return res.status(403).json({
    success: false,
    message: "Shop is suspended",
  });
}

    next();
  } catch (error) {
    console.error("SHOP OWNERSHIP ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Ownership validation failed",
    });
  }
};