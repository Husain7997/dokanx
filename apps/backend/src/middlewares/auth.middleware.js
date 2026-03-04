const jwt = require("jsonwebtoken");
const User = require("../models/user.model");
const Shop = require("../models/shop.model"); // ✅ MISSING
const { t } = require("@/core/infrastructure");
async function protect(req, res, next) {
  try {
    const header = req.headers.authorization;

    if (!header)
      return res.status(401).json({ message: "No token" });

    const token = header.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id);

    if (!user)
      return res.status(401).json({ message: "User not found" });

    let shop = null;

    // ✅ ALWAYS LOAD TENANT FROM DB
    if (user.shopId) {
      shop = await Shop.findById(user.shopId);
    }

    req.user = user;
    req.shop = shop || null;
console.log("CONTROLLER SHOP:", req.shop?._id);
    next();
  } catch (err) {
    console.error("AUTH ERROR:", err);
    res.status(401).json({ message: "Unauthorized" });
  }
}

module.exports = { protect };