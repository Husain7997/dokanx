// apps/backend/src/config/db.js

const mongoose = require('mongoose');
const { MONGO_URI } = require('./env');

let isConnected = false;

async function connectDB() {
  if (isConnected) return;

  await mongoose.connect(MONGO_URI, {
    autoIndex: true,
  });

  isConnected = true;
  console.log('🟢 MongoDB connected');
}

async function disconnectDB() {
  if (!isConnected) return;

  await mongoose.disconnect();
  isConnected = false;
  console.log('🟡 MongoDB disconnected');
}

module.exports = {
  connectDB,
  disconnectDB,
};
