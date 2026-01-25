const mongoose = require("mongoose");
require("dotenv").config({ path: ".env.test" });

mongoose.set("bufferCommands", false);

const connectDB = async () => {
  const uri = process.env.MONGO_URI_TEST;
  if (!uri) throw new Error("❌ Mongo URI missing in .env.test");

  if (mongoose.connection.readyState === 1) return; // already connected

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 15000,
    socketTimeoutMS: 45000,
    maxPoolSize: 5,
  });

  console.log("✅ MongoDB connected (test)");
};

const disconnectDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
    console.log("✅ MongoDB disconnected (test)");
  }
};

const clearDB = async () => {
  if (mongoose.connection.readyState !== 1) {
    throw new Error("DB not connected");
  }

  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
    try {
      await collections[key].dropIndexes();
    } catch (err) {
      if (err.codeName !== 'NamespaceNotFound') throw err;
    }
  }
};



module.exports = { connectDB, disconnectDB, clearDB };
