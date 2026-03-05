const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    channel: { type: String, default: "inapp", index: true },
    message: { type: String, required: true },
    data: { type: Object, default: {} },
    status: {
      type: String,
      enum: ["PENDING", "SENT", "FAILED"],
      default: "SENT"
    }
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.Notification ||
  mongoose.model("Notification", NotificationSchema);
