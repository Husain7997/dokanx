const mongoose = require("mongoose");

const schema = new mongoose.Schema(
  {
    shop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
      index: true,
    },

    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CustomerIdentity",
      required: true,
      index: true,
    },

    signalType: {
      type: String,
      enum: [
        "LATE_PAYMENT_RISK",
        "CREDIT_EXPOSURE",
        "PURCHASE_BEHAVIOR",
        "COMPOSITE_RISK",
      ],
      required: true,
      index: true,
    },

    severity: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH"],
      required: true,
      index: true,
    },

    score: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    message: {
      type: String,
      required: true,
    },

    meta: {
      type: Object,
      default: {},
    },

    dateKey: {
      type: String,
      required: true,
      index: true,
    },

    resolved: {
      type: Boolean,
      default: false,
      index: true,
    },

    resolvedAt: Date,
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

schema.index(
  { shop: 1, customer: 1, signalType: 1, dateKey: 1 },
  { unique: true }
);

schema.pre("deleteOne", () => {
  throw new Error("Behavior signals cannot be deleted");
});

module.exports =
  mongoose.models.BehaviorSignal ||
  mongoose.model("BehaviorSignal", schema);
