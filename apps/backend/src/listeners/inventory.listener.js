const InventoryLedgerService =
require('@/inventory/inventoryLedger.service');

async function handleInventoryReserved(event) {

  const { aggregateId, payload } = event;

  await InventoryLedgerService.reserve({
    productId: aggregateId,
    quantity: payload.quantity,
  });
}

module.exports = { handleInventoryReserved };