const mongoose = require("mongoose");

const quickReplySchema = new mongoose.Schema(
  {
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    body: {
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
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

quickReplySchema.index({ shopId: 1, category: 1, isActive: 1 });

module.exports =
  mongoose.models.SupportQuickReply ||
  mongoose.model("SupportQuickReply", quickReplySchema);
