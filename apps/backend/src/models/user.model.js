const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: String,
    email: { type: String, unique: true, sparse: true },
    phone: { type: String, unique: true, sparse: true },
    password: String,
    role: {
      type: String,
      enum: ['admin', 'owner', 'staff', 'customer'],
      default: 'customer'
    },
    isBlocked: {
    type: Boolean,
    default: false
  }
  },
  
  { timestamps: true }
);

module.exports = mongoose.models.User || mongoose.model("User", userSchema);
