const allowRoles = require("./allowRoles");

// Legacy wrapper so older route files can stay unchanged while RBAC logic remains centralized.
module.exports = (requiredRole) => allowRoles(requiredRole);
