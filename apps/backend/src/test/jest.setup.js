require("dotenv").config({ path: ".env.test" });

const { connectDB, disconnectDB } = require("../config/db");

beforeAll(async () => {
  process.env.NODE_ENV = "test";
  if (!process.env.MONGO_URI_TEST) {
    throw new Error("❌ MONGO_URI_TEST is missing in .env.test");
  }

  await connectDB();
});

afterAll(async () => {
  await disconnectDB();
});
