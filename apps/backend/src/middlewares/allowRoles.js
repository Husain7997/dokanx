module.exports = (...roles) => {
  return (req, res, next) => {

    const role = req.user.role?.toUpperCase();

    if (!roles.includes(role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    next();
  };
};
