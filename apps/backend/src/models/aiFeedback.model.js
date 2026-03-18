const mongoose = require("mongoose");

const aiFeedbackSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      default: null,
      index: true,
    },
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      default: null,
      index: true,
    },
    eventType: {
      type: String,
      enum: ["click", "purchase", "ignore"],
      required: true,
      index: true,
    },
    context: {
      type: String,
      default: "general",
    },
    metadata: {
      type: Object,
      default: {},
    },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.AiFeedback ||
  mongoose.model("AiFeedback", aiFeedbackSchema);
