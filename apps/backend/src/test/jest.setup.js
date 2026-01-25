require("dotenv").config({ path: ".env.test" });
console.log("MONGO_URI_TEST:", process.env.MONGO_URI_TEST);

const mongoose = require("mongoose");
const { connectDB, disconnectDB } = require("../config/db");

beforeAll(async () => {
  process.env.NODE_ENV = "test";
  await connectDB();
}, 30000);

afterAll(async () => {
  await disconnectDB();
});

