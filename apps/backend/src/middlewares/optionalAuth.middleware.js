const jwt = require("jsonwebtoken");
const User = require("../models/user.model");

module.exports = async (req, _res, next) => {
  const auth = req.headers.authorization;

  if (!auth) return next();

  try {
    const token = auth.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded?.id || decoded?.userId || null;

    if (!userId) {
      console.warn("OPTIONAL_AUTH_MISSING_USER_ID", {
        path: req.originalUrl || req.url,
      });
      return next();
    }

    const user = await User.findById(userId);
    if (!user) {
      console.warn("OPTIONAL_AUTH_USER_NOT_FOUND", {
        path: req.originalUrl || req.url,
        userId: String(userId),
      });
      return next();
    }

    req.user = user;
    req.user.id = String(user._id);
  } catch (error) {
    console.warn("OPTIONAL_AUTH_INVALID_TOKEN", {
      path: req.originalUrl || req.url,
      message: error?.message || String(error),
    });
  }

  next();
};
