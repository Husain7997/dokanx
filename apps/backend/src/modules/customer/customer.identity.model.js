const mongoose = require("mongoose");

const schema = new mongoose.Schema(
  {
    globalCustomerId: {
      type: String,
      index: true,
      sparse: true,
      unique: true,
    },
    linkedUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    phone: {
      type: String,
      required: true,
      index: true,
      unique: true,
    },
    normalizedPhone: {
      type: String,
      index: true,
      sparse: true,
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
