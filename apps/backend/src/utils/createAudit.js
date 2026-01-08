const AuditLog = require("../models/audit.model");

const createAudit = async ({
  admin,
  action,
  targetType,
  targetId,
  req,
}) => {
  try {
    await AuditLog.create({
      performedBy: admin,
      action,
      targetType,
      targetId,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });
  } catch (error) {
    console.error("AUDIT LOG FAILED:", error.message);
  }
};

module.exports = createAudit;
