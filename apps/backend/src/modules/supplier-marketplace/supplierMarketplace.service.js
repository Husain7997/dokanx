const Supplier = require("./models/supplier.model");
const SupplierOffer = require("./models/supplierOffer.model");
const BulkOrderRequest = require("./models/bulkOrderRequest.model");

function toNumber(value, fallback = null) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function parseRegexQuery(value) {
  const term = String(value || "").trim();
  if (!term) return null;
  return new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
}

function buildSupplierScore({ distanceKm, ratingAverage, verified }) {
  const distanceScore = distanceKm == null ? 45 : Math.max(0, 50 - Math.min(distanceKm * 4, 50));
  const ratingScore = Math.min((Number(ratingAverage || 0) / 5) * 35, 35);
  const verificationScore = verified ? 15 : 0;
  return Number((distanceScore + ratingScore + verificationScore).toFixed(2));
}

function buildOfferScore({ price, availableQty, leadTimeDays }) {
  const priceScore = Math.max(0, 45 - Math.min(Number(price || 0) / 100, 45));
  const stockScore = Math.min(Number(availableQty || 0), 30);
  const leadTimeScore = Math.max(0, 25 - Math.min(Number(leadTimeDays || 0) * 4, 25));
  return Number((priceScore + stockScore + leadTimeScore).toFixed(2));
}

async function getNearbySuppliers({ lat, lng, radiusKm = 25, limit = 500, query = {} }) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return [];

  return Supplier.aggregate([
    {
      $geoNear: {
        near: { type: "Point", coordinates: [lng, lat] },
        distanceField: "distanceMeters",
        maxDistance: Math.max(radiusKm, 0.5) * 1000,
        spherical: true,
        query,
      },
    },
    { $limit: limit },
    {
      $project: {
        _id: 1,
        name: 1,
        slug: 1,
        categories: 1,
        coverageAreas: 1,
        minimumOrderValue: 1,
        ratingAverage: 1,
        ratingCount: 1,
        isVerified: 1,
        location: 1,
        distanceMeters: 1,
      },
    },
  ]);
}

async function searchSuppliers({
  q,
  category,
  area,
  lat,
  lng,
  radiusKm = 25,
  limit = 20,
}) {
  const regex = parseRegexQuery(q);
  const categoryRegex = parseRegexQuery(category);
  const areaRegex = parseRegexQuery(area);

  const baseQuery = {
    isActive: true,
    ...(categoryRegex ? { categories: categoryRegex } : {}),
    ...(areaRegex ? { coverageAreas: areaRegex } : {}),
    ...(regex ? { $or: [{ name: regex }, { companyName: regex }, { categories: regex }, { brands: regex }] } : {}),
  };

  const nearby = await getNearbySuppliers({
    lat,
    lng,
    radiusKm,
    limit: limit * 5,
    query: baseQuery,
  });

  if (nearby.length) {
    return nearby
      .map(s => {
        const distanceKm = Number((s.distanceMeters / 1000).toFixed(2));
        return {
          _id: s._id,
          name: s.name,
          slug: s.slug,
          categories: s.categories || [],
          coverageAreas: s.coverageAreas || [],
          minimumOrderValue: s.minimumOrderValue || 0,
          ratingAverage: s.ratingAverage || 0,
          ratingCount: s.ratingCount || 0,
          isVerified: Boolean(s.isVerified),
          location: s.location || null,
          distanceKm,
          score: buildSupplierScore({
            distanceKm,
            ratingAverage: s.ratingAverage,
            verified: s.isVerified,
          }),
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  const fallback = await Supplier.find(baseQuery)
    .sort({ isVerified: -1, ratingAverage: -1, createdAt: -1 })
    .limit(limit)
    .lean();

  return fallback.map(s => ({
    _id: s._id,
    name: s.name,
    slug: s.slug,
    categories: s.categories || [],
    coverageAreas: s.coverageAreas || [],
    minimumOrderValue: s.minimumOrderValue || 0,
    ratingAverage: s.ratingAverage || 0,
    ratingCount: s.ratingCount || 0,
    isVerified: Boolean(s.isVerified),
    location: s.location || null,
    distanceKm: null,
    score: buildSupplierScore({
      distanceKm: null,
      ratingAverage: s.ratingAverage,
      verified: s.isVerified,
    }),
  }));
}

async function listSupplierOffers({
  supplierId,
  q,
  category,
  brand,
  minPrice,
  maxPrice,
  limit = 50,
}) {
  const supplier = await Supplier.findOne({ _id: supplierId, isActive: true }).lean();
  if (!supplier) {
    const err = new Error("Supplier not found");
    err.statusCode = 404;
    throw err;
  }

  const regex = parseRegexQuery(q);
  const query = {
    supplierId,
    isActive: true,
    ...(category ? { category: new RegExp(`^${String(category).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") } : {}),
    ...(brand ? { brand: new RegExp(`^${String(brand).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") } : {}),
    ...(Number.isFinite(minPrice) || Number.isFinite(maxPrice)
      ? {
          wholesalePrice: {
            ...(Number.isFinite(minPrice) ? { $gte: minPrice } : {}),
            ...(Number.isFinite(maxPrice) ? { $lte: maxPrice } : {}),
          },
        }
      : {}),
    ...(regex
      ? { $or: [{ title: regex }, { productName: regex }, { brand: regex }, { category: regex }] }
      : {}),
  };

  const rows = await SupplierOffer.find(query)
    .sort({ availableQty: -1, wholesalePrice: 1, updatedAt: -1 })
    .limit(limit)
    .lean();

  const offers = rows
    .map(o => ({
      _id: o._id,
      supplierId: o.supplierId,
      title: o.title,
      productName: o.productName || "",
      brand: o.brand || "",
      category: o.category || "",
      unit: o.unit || "pcs",
      wholesalePrice: o.wholesalePrice,
      minOrderQty: o.minOrderQty || 1,
      availableQty: o.availableQty || 0,
      leadTimeDays: o.leadTimeDays || 0,
      score: buildOfferScore({
        price: o.wholesalePrice,
        availableQty: o.availableQty,
        leadTimeDays: o.leadTimeDays,
      }),
    }))
    .sort((a, b) => b.score - a.score);

  return {
    supplier: {
      _id: supplier._id,
      name: supplier.name,
      slug: supplier.slug,
      ratingAverage: supplier.ratingAverage || 0,
      ratingCount: supplier.ratingCount || 0,
      isVerified: Boolean(supplier.isVerified),
      minimumOrderValue: supplier.minimumOrderValue || 0,
    },
    offers,
  };
}

function isSameId(left, right) {
  return String(left || "") === String(right || "");
}

async function getWritableSupplier({ supplierId, shopId }) {
  const supplier = await Supplier.findOne({
    _id: supplierId,
    isActive: true,
  });

  if (!supplier) {
    const err = new Error("Supplier not found");
    err.statusCode = 404;
    throw err;
  }

  if (!supplier.createdByShop || !isSameId(supplier.createdByShop, shopId)) {
    const err = new Error("Supplier write access denied for this tenant");
    err.statusCode = 403;
    throw err;
  }

  return supplier;
}

async function createSupplierOffer({
  supplierId,
  shopId,
  payload = {},
}) {
  await getWritableSupplier({ supplierId, shopId });

  return SupplierOffer.create({
    supplierId,
    title: String(payload.title || "").trim(),
    productName: String(payload.productName || "").trim(),
    brand: String(payload.brand || "").trim(),
    category: String(payload.category || "").trim(),
    barcode: String(payload.barcode || "").trim(),
    unit: String(payload.unit || "pcs").trim(),
    wholesalePrice: Number(payload.wholesalePrice || 0),
    minOrderQty: Number(payload.minOrderQty || 1),
    availableQty: Number(payload.availableQty || 0),
    leadTimeDays: Number(payload.leadTimeDays || 1),
    isActive: payload.isActive !== undefined ? Boolean(payload.isActive) : true,
  });
}

async function updateSupplierOffer({
  supplierId,
  offerId,
  shopId,
  payload = {},
}) {
  await getWritableSupplier({ supplierId, shopId });

  const data = {
    title: String(payload.title || "").trim(),
    productName: String(payload.productName || "").trim(),
    brand: String(payload.brand || "").trim(),
    category: String(payload.category || "").trim(),
    barcode: String(payload.barcode || "").trim(),
    unit: String(payload.unit || "pcs").trim(),
    wholesalePrice: Number(payload.wholesalePrice || 0),
    minOrderQty: Number(payload.minOrderQty || 1),
    availableQty: Number(payload.availableQty || 0),
    leadTimeDays: Number(payload.leadTimeDays || 1),
    isActive: payload.isActive !== undefined ? Boolean(payload.isActive) : true,
  };

  const updated = await SupplierOffer.findOneAndUpdate(
    { _id: offerId, supplierId },
    { $set: data },
    { returnDocument: "after" }
  );

  if (!updated) {
    const err = new Error("Supplier offer not found");
    err.statusCode = 404;
    throw err;
  }

  return updated;
}

async function createBulkOrderRequest({
  shopId,
  supplierId,
  items = [],
  notes = "",
  idempotencyKey = null,
}) {
  const supplier = await Supplier.findOne({
    _id: supplierId,
    isActive: true,
  }).lean();

  if (!supplier) {
    const err = new Error("Supplier not found");
    err.statusCode = 404;
    throw err;
  }

  if (idempotencyKey) {
    const existing = await BulkOrderRequest.findOne({
      shopId,
      idempotencyKey,
    });
    if (existing) {
      return {
        order: existing,
        idempotencyReplay: true,
      };
    }
  }

  const offerIds = items.map(i => i.offerId);
  const offers = await SupplierOffer.find({
    _id: { $in: offerIds },
    supplierId,
    isActive: true,
  }).lean();
  const offerMap = new Map(offers.map(o => [String(o._id), o]));

  const lines = [];
  let totalAmount = 0;

  for (const item of items) {
    const offer = offerMap.get(String(item.offerId));
    if (!offer) {
      const err = new Error(`Offer not found: ${item.offerId}`);
      err.statusCode = 400;
      throw err;
    }

    const qty = Number(item.quantity || 0);
    if (!Number.isFinite(qty) || qty < 1) {
      const err = new Error(`Invalid quantity for offer: ${item.offerId}`);
      err.statusCode = 400;
      throw err;
    }

    if (qty < Number(offer.minOrderQty || 1)) {
      const err = new Error(`Quantity below minimum order for offer: ${item.offerId}`);
      err.statusCode = 400;
      throw err;
    }

    if (qty > Number(offer.availableQty || 0)) {
      const err = new Error(`Requested quantity exceeds available stock for offer: ${item.offerId}`);
      err.statusCode = 400;
      throw err;
    }

    const unitPrice = Number(offer.wholesalePrice || 0);
    const lineTotal = Number((qty * unitPrice).toFixed(2));
    totalAmount += lineTotal;

    lines.push({
      offerId: offer._id,
      title: offer.title,
      quantity: qty,
      unitPrice,
      lineTotal,
    });
  }

  try {
    const order = await BulkOrderRequest.create({
      shopId,
      supplierId,
      status: "PENDING",
      lines,
      totalAmount: Number(totalAmount.toFixed(2)),
      idempotencyKey: idempotencyKey || null,
      notes: String(notes || "").trim(),
    });

    return {
      order,
      idempotencyReplay: false,
    };
  } catch (err) {
    if (err?.code === 11000 && idempotencyKey) {
      const existing = await BulkOrderRequest.findOne({
        shopId,
        idempotencyKey,
      });
      if (existing) {
        return {
          order: existing,
          idempotencyReplay: true,
        };
      }
    }
    throw err;
  }
}

async function getSellerScopeSupplierIds({ shopId, supplierId = null }) {
  const filter = {
    createdByShop: shopId,
    isActive: true,
    ...(supplierId ? { _id: supplierId } : {}),
  };

  const suppliers = await Supplier.find(filter).select("_id").lean();
  return suppliers.map(s => s._id);
}

async function listBulkOrderRequests({
  shopId,
  mode = "buyer",
  supplierId = "",
  status = "",
  limit = 50,
}) {
  const normalizedMode = String(mode || "buyer").toLowerCase();
  const query = {};

  if (normalizedMode === "seller") {
    const ids = await getSellerScopeSupplierIds({
      shopId,
      supplierId: supplierId || null,
    });

    if (!ids.length) return [];
    query.supplierId = { $in: ids };
  } else {
    query.shopId = shopId;
    if (supplierId) query.supplierId = supplierId;
  }

  if (status) {
    query.status = String(status).toUpperCase();
  }

  const rows = await BulkOrderRequest.find(query)
    .sort({ createdAt: -1 })
    .limit(Math.min(Math.max(Number(limit) || 50, 1), 200))
    .lean();

  return rows.map(order => ({
    _id: order._id,
    shopId: order.shopId,
    supplierId: order.supplierId,
    status: order.status,
    totalAmount: order.totalAmount,
    lines: order.lines || [],
    notes: order.notes || "",
    acceptedAt: order.acceptedAt || null,
    rejectedAt: order.rejectedAt || null,
    cancelledAt: order.cancelledAt || null,
    fulfilledAt: order.fulfilledAt || null,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  }));
}

async function resolveActorScope({ order, actorShopId }) {
  const isBuyer = isSameId(order.shopId, actorShopId);

  const supplier = await Supplier.findOne({
    _id: order.supplierId,
    isActive: true,
  }).select("createdByShop").lean();

  const isSeller = Boolean(supplier?.createdByShop) && isSameId(supplier.createdByShop, actorShopId);
  return { isBuyer, isSeller };
}

function getTargetStatusForAction(action) {
  const map = {
    ACCEPT: "ACCEPTED",
    REJECT: "REJECTED",
    FULFILL: "FULFILLED",
    CANCEL: "CANCELLED",
  };
  return map[action] || null;
}

function assertAllowedTransition({ currentStatus, action }) {
  const transitions = {
    PENDING: ["ACCEPT", "REJECT", "CANCEL"],
    ACCEPTED: ["FULFILL"],
    REJECTED: [],
    CANCELLED: [],
    FULFILLED: [],
  };

  const allowed = transitions[currentStatus] || [];
  if (!allowed.includes(action)) {
    const err = new Error(`Invalid transition from ${currentStatus} using ${action}`);
    err.statusCode = 409;
    throw err;
  }
}

async function updateBulkOrderStatus({
  orderId,
  actorShopId,
  actorUserId,
  action,
  note = "",
}) {
  const order = await BulkOrderRequest.findById(orderId);
  if (!order) {
    const err = new Error("Bulk order request not found");
    err.statusCode = 404;
    throw err;
  }

  const normalizedAction = String(action || "").toUpperCase();
  const targetStatus = getTargetStatusForAction(normalizedAction);
  if (!targetStatus) {
    const err = new Error("Unsupported lifecycle action");
    err.statusCode = 400;
    throw err;
  }

  const scope = await resolveActorScope({
    order,
    actorShopId,
  });

  if (!scope.isBuyer && !scope.isSeller) {
    const err = new Error("Bulk order access denied for this tenant");
    err.statusCode = 403;
    throw err;
  }

  if (["ACCEPT", "REJECT", "FULFILL"].includes(normalizedAction) && !scope.isSeller) {
    const err = new Error("Only supplier tenant can perform this action");
    err.statusCode = 403;
    throw err;
  }

  if (normalizedAction === "CANCEL" && !scope.isBuyer) {
    const err = new Error("Only buyer tenant can cancel bulk order");
    err.statusCode = 403;
    throw err;
  }

  if (order.status === targetStatus) {
    return {
      order,
      idempotencyReplay: true,
    };
  }

  assertAllowedTransition({
    currentStatus: order.status,
    action: normalizedAction,
  });

  const previousStatus = order.status;
  order.status = targetStatus;

  const now = new Date();
  if (targetStatus === "ACCEPTED") order.acceptedAt = now;
  if (targetStatus === "REJECTED") order.rejectedAt = now;
  if (targetStatus === "CANCELLED") order.cancelledAt = now;
  if (targetStatus === "FULFILLED") order.fulfilledAt = now;

  order.statusHistory = order.statusHistory || [];
  order.statusHistory.push({
    fromStatus: previousStatus,
    toStatus: targetStatus,
    action: normalizedAction,
    actorShopId: actorShopId || null,
    actorUserId: actorUserId || null,
    note: String(note || "").trim(),
    at: now,
  });

  await order.save();

  return {
    order,
    idempotencyReplay: false,
  };
}

module.exports = {
  searchSuppliers,
  listSupplierOffers,
  createSupplierOffer,
  updateSupplierOffer,
  createBulkOrderRequest,
  listBulkOrderRequests,
  updateBulkOrderStatus,
  toNumber,
};
