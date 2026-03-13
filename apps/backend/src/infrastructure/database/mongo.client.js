const mongoose = require('mongoose');
const { MongoMemoryServer } = require("mongodb-memory-server");

/**
 * Mongo Singleton Client
 * Required for transaction support
 */

let isConnected = false;
let memoryServer = null;

async function connectMongo() {

  if (isConnected) return mongoose;

  let uri = process.env.MONGO_URI;

  if (!uri && process.env.NODE_ENV === "test") {
    memoryServer = await MongoMemoryServer.create();
    uri = memoryServer.getUri();
  }

  if (!uri) {
    throw new Error("MONGO_URI is required");
  }

  await mongoose.connect(uri, {
    autoIndex: false,
  });

  isConnected = true;

  console.log('✅ MongoDB Connected');

  return mongoose;
}

module.exports = {
  connectMongo,
  async disconnectMongo() {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    if (memoryServer) {
      await memoryServer.stop();
      memoryServer = null;
    }
    isConnected = false;
  },
  mongoose,
};
