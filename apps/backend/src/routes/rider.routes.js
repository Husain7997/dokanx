const express = require("express");
const router = express.Router();
const { Rider, RiderLocation } = require("../models/rider.model");

// POST /rider/location - Update rider location
router.post("/location", async (req, res) => {
  try {
    const { riderId, lat, lng } = req.body;

    const location = new RiderLocation({
      riderId,
      lat,
      lng
    });

    await location.save();

    // Update rider's current location
    await Rider.findByIdAndUpdate(riderId, { location: { lat, lng } });

    res.json({ success: true });
  } catch (error) {
    console.error("Location update error:", error);
    res.status(500).json({ error: "Failed to update location" });
  }
});

// GET /rider/:id/location - Get rider location history
router.get("/:id/location", async (req, res) => {
  try {
    const riderId = req.params.id;
    const limit = parseInt(req.query.limit) || 10;

    const locations = await RiderLocation.find({ riderId })
      .sort({ updatedAt: -1 })
      .limit(limit);

    res.json(locations);
  } catch (error) {
    console.error("Location fetch error:", error);
    res.status(500).json({ error: "Failed to fetch location" });
  }
});

module.exports = router;