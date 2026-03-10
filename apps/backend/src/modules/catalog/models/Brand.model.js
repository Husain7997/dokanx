const mongoose = require("mongoose");

const schema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
    },

    logo: {
      type: String,
      default: "",
    },

    country: {
      type: String,
      default: "",
    },

    popularityScore: {
      type: Number,
      default: 0,
      index: true,
    },
  },
  { timestamps: true }
);

schema.index({ name: "text" });

module.exports =
  mongoose.models.Brand ||
  mongoose.model("Brand", schema);