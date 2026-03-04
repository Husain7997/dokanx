const mongoose = require("mongoose");

const schema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: true,
      index: true,
      unique: true,
    },

    name: String,

    globalCreditScore: {
      type: Number,
      default: 0,
    },

    riskLevel: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH"],
      default: "LOW",
    },

    metadata: Object,
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  "CustomerIdentity",
  schema
);