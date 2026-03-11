const AuditLog = require("../models/audit.model");
const { logger } = require('@/core/infrastructure');
const response = require("@/utils/controllerResponse");

exports.getAuditLogs = async (req, res) => {
  try {
    const logs = await AuditLog.find()
      .populate("performedBy", "name email role")
      .sort({ createdAt: -1 })
      .limit(100);

    response.updated(res, req, logs);
  } catch (error) {
    logger.error({ err: error.message }, "Failed to fetch audit logs");
    response.failure(res, "Failed to fetch audit logs", 500);
  }
};
