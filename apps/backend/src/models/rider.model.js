const mongoose = require("mongoose");

const riderLocationSchema = new mongoose.Schema({
  riderId: { type: mongoose.Schema.Types.ObjectId, ref: "Rider", required: true },
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  updatedAt: { type: Date, default: Date.now }
});

riderLocationSchema.index({ riderId: 1, updatedAt: -1 });

const RiderLocation = mongoose.model("RiderLocation", riderLocationSchema);

const riderSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String },
  status: { type: String, enum: ["active", "inactive"], default: "active" },
  location: {
    lat: Number,
    lng: Number
  },
  createdAt: { type: Date, default: Date.now }
});

const Rider = mongoose.model("Rider", riderSchema);

module.exports = {
  Rider,
  RiderLocation
};