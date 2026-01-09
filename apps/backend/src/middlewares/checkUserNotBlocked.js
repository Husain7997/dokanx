module.exports = (req, res, next) => {
  // 🔴 Admin blocked user (global)
  if (req.user.isBlocked) {
    return res.status(403).json({
      success: false,
      message: "User is blocked by admin",
    });
  }

  // 🔴 Owner blocked customer (shop-level)
  if (
    req.shop &&
    req.shop.blockedCustomers?.includes(req.user._id)
  ) {
    return res.status(403).json({
      success: false,
      message: "User is blocked by shop owner",
    });
  }

  // 🔴 Shop suspended
  if (req.shop && req.shop.isActive === false) {
    return res.status(403).json({
      success: false,
      message: "Shop is suspended",
    });
  }

  next();
};
