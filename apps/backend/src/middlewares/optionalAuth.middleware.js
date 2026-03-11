const jwt = require("jsonwebtoken");
const User = require("../models/user.model");
const Shop = require("../models/shop.model");

module.exports = async (req, res, next) => {
  const auth = req.headers.authorization;

  if (!auth) return next();

  try {
    const token = auth.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id || decoded.userId);

    if (user) {
      req.user = user;
      if (user.shopId) {
        req.shop = await Shop.findById(user.shopId);
      }
    }
  } catch (_err) {
    // ignore invalid token -> guest
  }

  next();
};
