const { logger } = require("@/core/infrastructure");

module.exports = async (req, res, next) => {
  try {
    const shop = req.shop;
    const user = req.user;

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: "Shop context missing",
      });
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const ownerId = shop.owner?._id || shop.owner || null;
    if (!ownerId) {
      logger.warn({ shopId: shop._id || null }, "Shop owner metadata missing during ownership check");
      return res.status(403).json({
        success: false,
        message: "Shop ownership mismatch",
      });
    }

    if (String(ownerId) !== String(user._id)) {
      return res.status(403).json({
        success: false,
        message: "Shop ownership mismatch",
      });
    }

    if (shop.isActive === false || shop.status === "SUSPENDED") {
      return res.status(403).json({
        success: false,
        message: "Shop is suspended",
      });
    }

    next();
  } catch (error) {
    logger.error({ err: error.message }, "Shop ownership validation failed");
    return res.status(500).json({
      success: false,
      message: "Ownership validation failed",
    });
  }
};
