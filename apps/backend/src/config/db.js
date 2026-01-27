// const mongoose = require("mongoose");

// module.exports = async () => {
//   const uri =
//     process.env.NODE_ENV === "test"
//       ? process.env.MONGO_URI_TEST
//       : process.env.MONGO_URI;

//   if (!uri) throw new Error("❌ Mongo URI missing");

//   await mongoose.connect(uri);
//   console.log("✅ MongoDB Connected");
// };
const mongoose = require("mongoose");

mongoose.set("bufferCommands", false);

const connectDB = async () => {
  const uri =
    process.env.NODE_ENV === "test"
      ? process.env.MONGO_URI_TEST
      : process.env.MONGO_URI;

  if (!uri) throw new Error("❌ Mongo URI missing");

  if (mongoose.connection.readyState === 1) {
  console.log("ℹ️ Mongo already connected");
  return;
}


  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 15000,
    socketTimeoutMS: 45000,
    maxPoolSize: 5,
  });

  console.log(`✅ MongoDB connected [${process.env.NODE_ENV}]`);
};

const disconnectDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
    console.log("✅ MongoDB disconnected");
  }
};

module.exports = { connectDB, disconnectDB };
