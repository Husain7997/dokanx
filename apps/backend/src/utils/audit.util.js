const AuditLog = require("../models/audit.model");

exports.createAudit = async ({
  action,
  performedBy,
  targetType,
  targetId,
  req
}) => {
  try {
    await AuditLog.create({
      action,
      performedBy,
      targetType,
      targetId,
      ip: req.ip,
      userAgent: req.headers["user-agent"]
    });
  } catch (err) {
    console.error("AUDIT ERROR:", err.message);
  }
};
