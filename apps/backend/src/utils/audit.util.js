const AuditLog = require("../models/audit.model");

exports.createAudit = async ({
  action,
  performedBy,
  targetType,
  targetId,
  req,
  meta
}) => {
  try {
    await AuditLog.create({
      action,
      performedBy,
      targetType,
      targetId,
      meta: meta || null,
      ip: req?.ip || "SYSTEM",
      userAgent: req?.headers?.["user-agent"] || "SYSTEM"
    });
  } catch (err) {
    console.error("AUDIT ERROR:", err.message);
  }
};
