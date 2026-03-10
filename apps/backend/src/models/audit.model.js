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
module.exports =
  mongoose.models.AuditLog ||
  mongoose.model("AuditLog", auditSchema);

