const mongoose = require("mongoose");

const supportCommentSchema = new mongoose.Schema(
  {
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    authorRole: {
      type: String,
      default: "",
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const supportTicketSchema = new mongoose.Schema(
  {
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
      index: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    createdByRole: {
      type: String,
      default: "",
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      enum: ["ORDER", "PAYMENT", "DELIVERY", "PRODUCT", "TECHNICAL", "GENERAL"],
      default: "GENERAL",
      index: true,
    },
    priority: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH", "URGENT"],
      default: "MEDIUM",
      index: true,
    },
    status: {
      type: String,
      enum: ["OPEN", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "CLOSED"],
      default: "OPEN",
      index: true,
    },
    assignedTeam: {
      type: String,
      default: "",
      index: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    slaDueAt: {
      type: Date,
      default: null,
      index: true,
    },
    resolutionNote: {
      type: String,
      default: "",
    },
    satisfactionRating: {
      type: Number,
      default: null,
      min: 1,
      max: 5,
    },
    feedback: {
      type: String,
      default: "",
    },
    comments: {
      type: [supportCommentSchema],
      default: [],
    },
  },
  { timestamps: true }
);

supportTicketSchema.index({ shopId: 1, status: 1, createdAt: -1 });
supportTicketSchema.index({ shopId: 1, priority: 1, createdAt: -1 });

module.exports =
  mongoose.models.SupportTicket ||
  mongoose.model("SupportTicket", supportTicketSchema);
