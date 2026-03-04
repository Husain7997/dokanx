const mongoose = require("mongoose");

const schema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
  },

  scope: {
    type: String,
    required: true,
  },

  createdAt: {
    type: Date,
    default: Date.now,
    expires: 60 * 60 * 24, // auto delete after 24h
  },
});

schema.index(
  { key: 1, scope: 1 },
  { unique: true }
);

module.exports =
  mongoose.models.Idempotency ||
  mongoose.model("Idempotency", schema);