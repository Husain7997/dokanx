const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    action: String,
    actorId: mongoose.Schema.Types.ObjectId,
    actorRole: String,
    targetType: String,
    targetId: mongoose.Schema.Types.ObjectId,
    meta: Object,
    ip: String
  },
  { timestamps: true }
);

// 🔥 SAFE EXPORT (NO overwrite error)
module.exports =
  mongoose.models.AuditLog ||
  mongoose.model('AuditLog', auditLogSchema);
