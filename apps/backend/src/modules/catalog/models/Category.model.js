const mongoose = require("mongoose");

const schema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },

  slug: {
    type: String,
    required: true,
    unique: true
  },

  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category",
    default: null
  },

  path: {
    type: String,
    index: true
  },

  level: {
    type: Number,
    default: 0
  }

}, { timestamps: true });

schema.index({ name: "text" });

module.exports =
mongoose.models.Category ||
mongoose.model("Category", schema);