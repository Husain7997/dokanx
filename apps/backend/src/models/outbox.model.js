const mongoose = require("mongoose");

const OutboxSchema = new mongoose.Schema({
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    index: true,
  },

  type: {
    type: String,
    required: true,
    index: true,
  },

  payload: mongoose.Schema.Types.Mixed,

  processed: {
    type: Boolean,
    default: false,
    index: true,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

/**
 * ✅ Prevent OverwriteModelError
 */
module.exports =
  mongoose.models.Outbox ||
  mongoose.model("Outbox", OutboxSchema);