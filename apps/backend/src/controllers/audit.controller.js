const AuditLog = require("../models/audit.model");
const { t } = require('@/core/infrastructure');

exports.getAuditLogs = async (req, res) => {
  try {
    const logs = await AuditLog.find()
      .populate("performedBy", "name email role")
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({
      message: t('common.updated', req.lang),
      data: logs,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch audit logs",
    });
  }
};
