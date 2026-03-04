/* ===============================
   ROLE BASED ACCESS
================================*/

const allowRoles = (...allowedRoles) => {
  return (req, res, next) => {

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const userRole = req.user.role?.toLowerCase();

    const normalized = allowedRoles.map(r =>
      r.toLowerCase()
    );

    if (!normalized.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden",
      });
    }

    next();
  };
};

/* ===============================
   BLOCK CUSTOMER
================================*/

const blockCustomer = (req, res, next) => {
  if (req.user.role?.toLowerCase() === "customer") {
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