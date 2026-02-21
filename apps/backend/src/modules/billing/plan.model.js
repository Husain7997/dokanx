const mongoose = require("mongoose");

const planSchema = new mongoose.Schema(
{
  name: String,

  price: Number,

  limits: {
    shops: Number,
    products: Number,
    ordersPerMonth: Number,
  },

  features: {
    analytics: Boolean,
    autoSettlement: Boolean,
    prioritySupport: Boolean,
  },
},
{ timestamps: true }
);

module.exports =
mongoose.model("Plan", planSchema);
