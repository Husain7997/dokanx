const mongoose = require('mongoose');

/**
 * Mongo Singleton Client
 * Required for transaction support
 */

let isConnected = false;

async function connectMongo() {

  if (isConnected) return mongoose;

  await mongoose.connect(process.env.MONGO_URI, {
    autoIndex: false,
  });

  isConnected = true;

  console.log('✅ MongoDB Connected');

  return mongoose;
}

module.exports = {
  connectMongo,
  mongoose,
};