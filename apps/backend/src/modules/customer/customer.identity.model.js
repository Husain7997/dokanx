const mongoose = require("mongoose");

const schema = new mongoose.Schema(
  {
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      default: null,
      index: true,
    },

    phone: {
      type: String,
      required: true,
      index: true,
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

schema.index(
  { shopId: 1, phone: 1 },
  {
    unique: true,
    sparse: true,
  }
);

module.exports = mongoose.model(
  "CustomerIdentity",
  schema
);
