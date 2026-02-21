const jwt = require("jsonwebtoken");
const User = require("../models/User.model");

const protect = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token)
      return res.status(401).json({ message: "No token" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id);

    if (!user)
      return res.status(401).json({ message: "User not found" });

    req.user = user;

    next();
  } catch (err) {
    console.error("Auth error:", err.message);
    res.status(401).json({ message: "Unauthorized" });
  }
};

module.exports = {
  protect,
};


// async function protect(req, res, next) {
//   try {
//     const token = req.headers.authorization?.split(" ")[1];
//     if (!token) return res.status(401).json({ message: "No token provided" });

//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     const user = await User.findById(decoded.id || decoded.userId);
//     if (!user) return res.status(401).json({ message: "User not found" });

//     if (user.isBlocked) return res.status(403).json({ message: "User blocked" });

//     req.user = { _id: user._id, role: user.role || "SHOP" };
//     next();
//   } catch (err) {
//     console.error("AUTH ERROR:", err.message);
//     res.status(401).json({ message: "Invalid or expired token" });
//   }
// }

// module.exports = { protect };
