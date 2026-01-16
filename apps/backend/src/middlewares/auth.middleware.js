const jwt = require("jsonwebtoken");
const User = require("../models/User.model");

exports.protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Authorization header missing"
      });
    }

    const token = authHeader.split(" ")[1];

    // 🔍 VERIFY TOKEN
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const userId = decoded.id || decoded.userId;

    if (!userId) {
      return res.status(401).json({
        message: "Invalid token payload"
      });
    }

    const user = await User.findById(userId).select("-password");

    if (!user) {
      return res.status(401).json({
        message: "User not found"
      });
    }

 if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        message: "User is blocked by admin",
      });
    }
    req.user = user;
    next();
  } catch (error) {
    console.error("AUTH ERROR:", error.message); // 👈 IMPORTANT
    return res.status(401).json({
      message: "Invalid or expired token"
    });
  }
};

