const mongoose = require("mongoose");
const auditSchema = new mongoose.Schema(
  {
    action: { type: String, required: true },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false
    },
    targetId: mongoose.Schema.Types.ObjectId,
    targetType: String,
    ip: String,
    userAgent: String
  },
  { timestamps: true }
);

module.exports = mongoose.model("AuditLog", auditSchema);

exports.createAudit = async ({
  action,
  performedBy = null,
  targetType,
  targetId,
  req,
  meta = {}
}) => {
  try {
    await Audit.create({
      action,
      performedBy,
      targetType,
      targetId,
      meta,
      ip: req.ip,
      userAgent: req.headers["user-agent"]
    });
  } catch (err) {
    console.error("AUDIT ERROR:", err.message);
  }
};

