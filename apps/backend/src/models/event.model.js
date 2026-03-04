const mongoose = require("mongoose");

const schema = new mongoose.Schema({
  type: { type: String, required: true },

  aggregateId: mongoose.Types.ObjectId,

  payload: Object,

  metadata: {
    shopId: mongoose.Types.ObjectId,
    user: mongoose.Types.ObjectId,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

schema.index({ aggregateId: 1, createdAt: 1 });



module.exports =
  mongoose.models.Event ||
  mongoose.model("Event", schema);