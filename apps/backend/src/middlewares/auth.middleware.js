const jwt = require("jsonwebtoken");
const User = require("../models/user.model");
const Shop = require("../models/shop.model");
const { logger } = require("@/core/infrastructure");

async function protect(req, res, next) {
  try {
    const header = req.headers.authorization;

    if (!header) {
      return res.status(401).json({ message: "No token" });
    }

    const token = header.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    let shop = null;
    if (user.shopId) {
      shop = await Shop.findById(user.shopId);
    }

    req.user = user;
    req.shop = shop || req.shop || null;
    req.tenant = req.shop?._id ? String(req.shop._id) : req.tenant || null;

    next();
  } catch (err) {
    logger.warn({ err: err.message }, "Authentication failed");
    res.status(401).json({ message: "Unauthorized" });
  }
}

module.exports = { protect };
