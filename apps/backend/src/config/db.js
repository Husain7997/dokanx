const mongoose = require("mongoose");

module.exports = async () => {
  const uri =
    process.env.NODE_ENV === "test"
      ? process.env.MONGO_URI_TEST
      : process.env.MONGO_URI;

  if (!uri) throw new Error("❌ Mongo URI missing");

  await mongoose.connect(uri);
  console.log("✅ MongoDB Connected");
};
