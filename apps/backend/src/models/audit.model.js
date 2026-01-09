const mongoose = require("mongoose");
const auditSchema = new mongoose.Schema(
  {
    action: { type: String, required: true },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
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
  user,
  action,
  targetType,
  targetId,
  req,
}) => {
  if (!user) return;

  await Audit.create({
    performedBy: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "User",
  required: true
},
    action,
    targetType,
    targetId,
    ip: req.ip,
    userAgent: req.headers["user-agent"],
  });
};
