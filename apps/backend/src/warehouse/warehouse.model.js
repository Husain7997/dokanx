const mongoose = require("mongoose");

const schema = new mongoose.Schema({
  shopId: mongoose.Types.ObjectId,
  name: String,
  location: String,
});



module.exports =
  mongoose.models.Warehouse ||
  mongoose.model("Warehouse", schema);