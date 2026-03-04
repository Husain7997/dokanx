const mongoose = require("mongoose");

const schema = new mongoose.Schema({
  shopId: mongoose.Types.ObjectId,
  key: String,
});



module.exports =
  mongoose.models.ApiKey ||
  mongoose.model("ApiKey", schema);