const mongoose = require("mongoose");

const contactRequestSchema = new mongoose.Schema(
  {
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
      index: true,
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    sourceIntent: {
      type: String,
      enum: ["CONTACT_SUPPORT", "MANUAL"],
      default: "MANUAL",
      index: true,
    },
    targetRole: {
      type: String,
      enum: ["ADMIN", "STAFF", "SUPPORT"],
      required: true,
      index: true,
    },
    channel: {
      type: String,
      enum: ["WHATSAPP", "VOICE"],
      default: "WHATSAPP",
      index: true,
    },
    priority: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH"],
      default: "MEDIUM",
      index: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    callbackPhone: {
      type: String,
      default: "",
      trim: true,
      maxlength: 32,
    },
    status: {
      type: String,
      enum: ["QUEUED", "IN_PROGRESS", "RESOLVED", "CANCELLED"],
      default: "QUEUED",
      index: true,
    },
    inProgressAt: {
      type: Date,
      default: null,
    },
    inProgressBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    statusHistory: {
      type: [
        new mongoose.Schema(
          {
            fromStatus: {
              type: String,
              enum: ["QUEUED", "IN_PROGRESS", "RESOLVED", "CANCELLED"],
              required: true,
            },
            toStatus: {
              type: String,
              enum: ["QUEUED", "IN_PROGRESS", "RESOLVED", "CANCELLED"],
              required: true,
            },
            actorUserId: {
              type: mongoose.Schema.Types.ObjectId,
              ref: "User",
              default: null,
            },
            actorRole: {
              type: String,
              default: "",
            },
            note: {
              type: String,
              default: "",
              trim: true,
            },
            at: {
              type: Date,
              default: Date.now,
            },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
    idempotencyKey: {
      type: String,
      default: null,
      trim: true,
    },
  },
  { timestamps: true }
);

contactRequestSchema.index(
  { shopId: 1, idempotencyKey: 1 },
  { unique: true, sparse: true }
);
contactRequestSchema.index({ shopId: 1, status: 1, createdAt: -1 });
contactRequestSchema.index({ shopId: 1, targetRole: 1, createdAt: -1 });

module.exports =
  mongoose.models.ContactRequest ||
  mongoose.model("ContactRequest", contactRequestSchema);
