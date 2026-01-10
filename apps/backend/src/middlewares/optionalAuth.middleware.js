const jwt = require("jsonwebtoken");
const User = require("../models/user.model");

module.exports = async (req, res, next) => {
  const auth = req.headers.authorization;

  if (!auth) return next(); // guest

  try {
    const token = auth.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (user) req.user = user;
  } catch (err) {
    // ignore invalid token → guest
  }

  next();
};