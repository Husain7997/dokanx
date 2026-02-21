/* ===============================
   ROLE BASED ACCESS
================================*/
const allowRoles = (...roles) => {
  const normalized = roles.map(r => r.toUpperCase());

  return (req, res, next) => {
    const role = req.user?.role?.toUpperCase();

    if (!role || !normalized.includes(role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    next();
  };
};

/* ===============================
   BLOCK CUSTOMER
================================*/
const blockCustomer = (req, res, next) => {
  if (req.user.role === "CUSTOMER") {
    return res.status(403).json({
      message: "Customers not allowed",
    });
  }

  next();
};

module.exports = {
  allowRoles,
  blockCustomer,
};
