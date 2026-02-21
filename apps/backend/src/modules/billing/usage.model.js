const mongoose = require("mongoose");

const schema = new mongoose.Schema({
  tenant: mongoose.Schema.Types.ObjectId,

  metric: String,

  count: {
    type: Number,
    default: 0,
  },
});

module.exports =
mongoose.model("Usage", schema);
