const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  shopId: String,
  totalOrders: { type: Number, default: 0 },
  totalSales: { type: Number, default: 0 },
});

module.exports = mongoose.model(
  'ShopDashboardReadModel',
  schema
);