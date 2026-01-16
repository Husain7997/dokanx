module.exports = (...roles) => {
  return (req, res, next) => {
    console.log("ROLE CHECK:", req.user?.role); // 👈 ADD
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        message: "Unauthorized role"
      });
    }
    next();
  };
};
