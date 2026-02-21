// src/controllers/readiness.controller.js

const mongoose = require("mongoose");

exports.readinessCheck = async (req, res) => {
  try {
    const mongoState = mongoose.connection.readyState;

    const mongo =
      mongoState === 1 ? "connected" : "disconnected";

    res.status(200).json({
      status: "ready",
      services: {
        database: mongo,
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    res.status(500).json({
      status: "not-ready",
      error: err.message,
    });
  }
};
