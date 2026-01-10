const User = require("../models/user.model");

module.exports = async (req, res, next) => {
  // 🔹 If logged in
  if (req.user) {
    if (req.user.isBlocked) {
      return res.status(403).json({
        success: false,
        message: "User is blocked",
      });
    }
    return next();
  }

  // 🔹 Guest order → check by phone/email (if provided)
  const { phone, email } = req.body;

  if (!phone && !email) {
    return next(); // pure guest → allowed
  }

  const blockedUser = await User.findOne({
    $or: [{ phone }, { email }],
    isBlocked: true,
  });

  if (blockedUser) {
    return res.status(403).json({
      success: false,
      message: "This customer is blocked",
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
