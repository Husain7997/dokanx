const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
  },
  description: {
    type: String,
    trim: true,
    maxlength: 1000,
  },
  completed: {
    type: Boolean,
    default: false,
  },
  priority: {
    type: String,
    enum: ["low", "medium", "high"],
    default: "medium",
  },
  dueDate: {
    type: Date,
  },
  category: {
    type: String,
    enum: ["shopping", "payment", "order", "general"],
    default: "general",
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
  },
}, {
  timestamps: true,
});

// Index for efficient queries
taskSchema.index({ userId: 1, completed: 1, createdAt: -1 });
taskSchema.index({ userId: 1, dueDate: 1 });

module.exports = mongoose.model("Task", taskSchema);