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

  processedAt: {
    type: Date,
    default: null,
    index: true,
  },

  processingAt: {
    type: Date,
    default: null,
    index: true,
  },

  processingBy: {
    type: String,
    default: null,
  },

  retryCount: {
    type: Number,
    default: 0,
  },

  lastError: {
    type: String,
    default: null,
  },

  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

/**
 * ✅ Prevent OverwriteModelError
 */
module.exports =
  mongoose.models.Outbox ||
  mongoose.model("Outbox", OutboxSchema);
