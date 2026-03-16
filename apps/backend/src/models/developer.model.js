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
    organizationName: {
      type: String,
      default: "",
    },
    website: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["ACTIVE", "SUSPENDED"],
      default: "ACTIVE",
    },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.Developer ||
  mongoose.model("Developer", developerSchema);
