const WarehouseStock = require("../modules/warehouse/models/warehouseStock.model");

async function allocateWarehouse(product, qty) {

  const stocks =
    await WarehouseStock.find({
      product,
      available: { $gte: qty },
    }).sort({ available: -1 });

  return stocks[0];
}

module.exports = { allocateWarehouse };
