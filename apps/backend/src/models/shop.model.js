const mongoose = require("mongoose");

const shopSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },

    domain: String,

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // ✅ ADD THIS
    isActive: {
      type: Boolean,
      default: true,
    },

    // ✅ Future ready
    status: {
      type: String,
      enum: ["ACTIVE", "SUSPENDED"],
      default: "ACTIVE",
    },
  },
  {
    timestamps: true,
    bufferCommands: false,
  }
);

module.exports =
  mongoose.models.Shop ||
  mongoose.model("Shop", shopSchema);