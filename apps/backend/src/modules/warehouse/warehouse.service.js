const Warehouse = require("@/warehouse/warehouse.model");
const WarehouseStock = require("./models/warehouseStock.model");
const StockTransfer = require("./models/stockTransfer.model");

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function asUpper(value) {
  return String(value || "").trim().toUpperCase();
}

function appendHistory(transfer, status, actorId, note = "") {
  transfer.history = transfer.history || [];
  transfer.history.push({
    status,
    actorId: actorId || null,
    note: String(note || "").trim(),
    createdAt: new Date(),
  });
}

async function createWarehouse({ shopId, actorId, payload }) {
  return Warehouse.create({
    shopId,
    code: String(payload.code || "").trim().toUpperCase(),
    name: String(payload.name || "").trim(),
    type: asUpper(payload.type || "WAREHOUSE"),
    location: String(payload.location || "").trim(),
    isActive: payload.isActive !== undefined ? Boolean(payload.isActive) : true,
    createdBy: actorId || null,
  });
}

async function listWarehouses({ shopId }) {
  return Warehouse.find({ shopId, isActive: true }).sort({ createdAt: -1 }).lean();
}

async function upsertWarehouseStock({ shopId, payload }) {
  return WarehouseStock.findOneAndUpdate(
    {
      shopId,
      warehouseId: payload.warehouseId,
      productId: payload.productId,
    },
    {
      $set: {
        available: toNumber(payload.available, 0),
        reserved: toNumber(payload.reserved, 0),
        reorderPoint: toNumber(payload.reorderPoint, 0),
        ...(payload.lastSoldAt ? { lastSoldAt: new Date(payload.lastSoldAt) } : {}),
      },
      $setOnInsert: {
        shopId,
        warehouseId: payload.warehouseId,
        productId: payload.productId,
      },
    },
    { upsert: true, new: true }
  );
}

async function listWarehouseStocks({ shopId, filters = {} }) {
  const query = { shopId };
  if (filters.warehouseId) query.warehouseId = filters.warehouseId;
  if (filters.productId) query.productId = filters.productId;

  return WarehouseStock.find(query).sort({ updatedAt: -1 }).lean();
}

async function createTransferRequest({ shopId, actorId, payload }) {
  const sourceStock = await WarehouseStock.findOne({
    shopId,
    warehouseId: payload.fromWarehouseId,
    productId: payload.productId,
  });

  if (!sourceStock || Number(sourceStock.available || 0) < Number(payload.quantity || 0)) {
    const err = new Error("Insufficient stock in source warehouse");
    err.statusCode = 400;
    throw err;
  }

  const transfer = await StockTransfer.create({
    shopId,
    productId: payload.productId,
    fromWarehouseId: payload.fromWarehouseId,
    toWarehouseId: payload.toWarehouseId,
    quantity: toNumber(payload.quantity, 0),
    status: "REQUESTED",
    notes: String(payload.notes || "").trim(),
    requestedBy: actorId || null,
    history: [
      {
        status: "REQUESTED",
        actorId: actorId || null,
        note: String(payload.notes || "").trim(),
        createdAt: new Date(),
      },
    ],
  });

  return transfer;
}

async function listTransfers({ shopId, filters = {} }) {
  const query = { shopId };
  if (filters.status) query.status = asUpper(filters.status);
  return StockTransfer.find(query).sort({ createdAt: -1 }).lean();
}

async function updateTransferStatus({ shopId, transferId, actorId, status, note = "" }) {
  const transfer = await StockTransfer.findOne({ _id: transferId, shopId });
  if (!transfer) {
    const err = new Error("Transfer not found");
    err.statusCode = 404;
    throw err;
  }

  const nextStatus = asUpper(status);
  const allowedTransitions = {
    REQUESTED: ["APPROVED", "CANCELLED"],
    APPROVED: ["SHIPPED", "CANCELLED"],
    SHIPPED: ["RECEIVED"],
    RECEIVED: [],
    CANCELLED: [],
  };

  if (!allowedTransitions[transfer.status]?.includes(nextStatus)) {
    const err = new Error(`Invalid transfer status transition from ${transfer.status} to ${nextStatus}`);
    err.statusCode = 400;
    throw err;
  }

  transfer.status = nextStatus;
  if (nextStatus === "APPROVED") transfer.approvedBy = actorId || null;
  if (nextStatus === "SHIPPED") transfer.shippedAt = new Date();
  if (nextStatus === "RECEIVED") transfer.receivedAt = new Date();
  appendHistory(transfer, nextStatus, actorId, note);

  if (nextStatus === "RECEIVED") {
    const source = await WarehouseStock.findOne({
      shopId,
      warehouseId: transfer.fromWarehouseId,
      productId: transfer.productId,
    });

    if (!source || Number(source.available || 0) < Number(transfer.quantity || 0)) {
      const err = new Error("Source warehouse stock became insufficient");
      err.statusCode = 409;
      throw err;
    }

    source.available = Number(source.available || 0) - Number(transfer.quantity || 0);
    await source.save();

    await WarehouseStock.findOneAndUpdate(
      {
        shopId,
        warehouseId: transfer.toWarehouseId,
        productId: transfer.productId,
      },
      {
        $inc: { available: Number(transfer.quantity || 0) },
        $setOnInsert: {
          shopId,
          warehouseId: transfer.toWarehouseId,
          productId: transfer.productId,
          reserved: 0,
          reorderPoint: 0,
        },
      },
      { upsert: true, new: true }
    );
  }

  await transfer.save();
  return transfer;
}

async function getStockAlerts({ shopId, filters = {} }) {
  const daysWithoutSale = Math.max(toNumber(filters.daysWithoutSale, 45), 1);
  const cutoff = new Date(Date.now() - daysWithoutSale * 24 * 60 * 60 * 1000);
  const rows = await WarehouseStock.find({ shopId }).lean();

  return rows.map(row => {
    const available = Number(row.available || 0);
    const reorderPoint = Number(row.reorderPoint || 0);
    const lowStock = available <= reorderPoint;
    const deadStock = !row.lastSoldAt || new Date(row.lastSoldAt).getTime() < cutoff.getTime();

    return {
      warehouseId: row.warehouseId,
      productId: row.productId,
      available,
      reorderPoint,
      lowStock,
      deadStock,
    };
  });
}

async function buildWarehouseStockExportRows({ shopId, filters = {} }) {
  const rows = await listWarehouseStocks({ shopId, filters });
  return rows.map(row => ({
    warehouseId: String(row.warehouseId || ""),
    productId: String(row.productId || ""),
    available: Number(row.available || 0),
    reserved: Number(row.reserved || 0),
    reorderPoint: Number(row.reorderPoint || 0),
    lastSoldAt: row.lastSoldAt || "",
    updatedAt: row.updatedAt || "",
  }));
}

async function buildTransferExportRows({ shopId, filters = {} }) {
  const rows = await listTransfers({ shopId, filters });
  return rows.map(row => ({
    transferId: String(row._id || ""),
    productId: String(row.productId || ""),
    fromWarehouseId: String(row.fromWarehouseId || ""),
    toWarehouseId: String(row.toWarehouseId || ""),
    quantity: Number(row.quantity || 0),
    status: String(row.status || ""),
    requestedBy: String(row.requestedBy || ""),
    approvedBy: String(row.approvedBy || ""),
    createdAt: row.createdAt || "",
    receivedAt: row.receivedAt || "",
  }));
}

module.exports = {
  createWarehouse,
  listWarehouses,
  upsertWarehouseStock,
  listWarehouseStocks,
  createTransferRequest,
  listTransfers,
  updateTransferStatus,
  getStockAlerts,
  buildWarehouseStockExportRows,
  buildTransferExportRows,
};
