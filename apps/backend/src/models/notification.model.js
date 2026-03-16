const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true },
    message: { type: String, default: "" },
    type: { type: String, default: "INFO" },
    isRead: { type: Boolean, default: false },
    metadata: { type: Object, default: null },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.Notification ||
  mongoose.model("Notification", notificationSchema);
