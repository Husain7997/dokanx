const mongoose = require("mongoose");

const developerSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    companyName: {
      type: String,
      default: "",
      trim: true,
    },
    email: {
      type: String,
      default: "",
      trim: true,
      lowercase: true,
    },
    website: {
      type: String,
      default: "",
      trim: true,
    },
    status: {
      type: String,
      enum: ["ACTIVE", "SUSPENDED"],
      default: "ACTIVE",
      index: true,
    },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.MarketplaceDeveloper ||
  mongoose.model("MarketplaceDeveloper", developerSchema);
