// src/middlewares/financeLock.middleware.js

const mongoose = require("mongoose");

const financeLock = async (req, res, next) => {
  const session = await mongoose.startSession();

  try {
    await session.startTransaction();

    req.mongoSession = session;

    res.on("finish", async () => {
      if (res.statusCode >= 400) {
        await session.abortTransaction();
      } else {
        await session.commitTransaction();
      }
      session.endSession();
    });

    next();
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    return res.status(500).json({
      success: false,
      message: "Finance lock failed",
      error: error.message,
    });
  }
};

module.exports = financeLock;