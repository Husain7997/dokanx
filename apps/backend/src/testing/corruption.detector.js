const Shop = require("@/models/shop.model");
const { verifyShop } = require("./ledger.integrity.service");

async function scanAll() {
  const shops = await Shop.find();

  const report = [];

  for (const shop of shops) {
    const result = await verifyShop(shop._id);

    if (result.corrupted) {
      report.push({
        shop: shop._id,
        ...result,
      });
    }
  }

  return report;
}

module.exports = {
  scanAll,
};