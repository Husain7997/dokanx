function asUpper(value) {
  return String(value || "").trim().toUpperCase();
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const PROVIDER_STATUS_MAP = {
  PATHAO: {
    PICKED_UP: "ORDER_PICKED",
    PICKUP_COMPLETED: "ORDER_PICKED",
    IN_TRANSIT: "IN_TRANSIT",
    ON_THE_WAY: "OUT_FOR_DELIVERY",
    DELIVERED: "DELIVERED",
    RETURNED: "RETURNED",
    DELIVERY_FAILED: "FAILED",
  },
  REDX: {
    PARCEL_RECEIVED: "ORDER_PICKED",
    IN_HUB: "IN_TRANSIT",
    FOR_DELIVERY: "OUT_FOR_DELIVERY",
    DELIVERED: "DELIVERED",
    PARTIAL_DELIVERY: "FAILED",
    RETURN: "RETURNED",
  },
  STEADFAST: {
    PICKED: "ORDER_PICKED",
    TRANSIT: "IN_TRANSIT",
    DELIVERY_MAN: "OUT_FOR_DELIVERY",
    DELIVERED: "DELIVERED",
    CANCELLED: "FAILED",
    RETURNED: "RETURNED",
  },
};

function mapProviderShipmentStatus(provider, rawStatus) {
  const providerKey = asUpper(provider);
  const normalizedStatus = asUpper(rawStatus);
  return PROVIDER_STATUS_MAP[providerKey]?.[normalizedStatus] || normalizedStatus;
}

function detectCodMismatch(shipment, toleranceAmount = 0) {
  const expected = toNumber(shipment.cashOnDeliveryAmount, 0);
  const actual = toNumber(shipment.codCollectedAmount, 0);
  const delta = Number((actual - expected).toFixed(2));
  const mismatch = Math.abs(delta) > Math.max(0, toNumber(toleranceAmount, 0));

  return {
    shipmentId: String(shipment._id || ""),
    orderId: String(shipment.orderId || ""),
    courier: asUpper(shipment.courier),
    expected,
    actual,
    delta,
    mismatch,
    severity: mismatch && Math.abs(delta) >= 100 ? "HIGH" : mismatch ? "MEDIUM" : "LOW",
  };
}

function detectShipmentDelay(shipment, thresholds = {}) {
  const now = thresholds.now ? new Date(thresholds.now) : new Date();
  const updatedAt = shipment.updatedAt ? new Date(shipment.updatedAt) : new Date();
  const ageHours = (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60);
  const warningHours = Math.max(1, toNumber(thresholds.warningHours, 48));
  const criticalHours = Math.max(warningHours, toNumber(thresholds.criticalHours, 72));
  const status = asUpper(shipment.status);
  const delayedStatuses = ["IN_TRANSIT", "OUT_FOR_DELIVERY"];
  const delayed = delayedStatuses.includes(status) && ageHours >= warningHours;

  return {
    shipmentId: String(shipment._id || ""),
    delayed,
    ageHours: Number(ageHours.toFixed(2)),
    severity: delayed ? (ageHours >= criticalHours ? "HIGH" : "MEDIUM") : "LOW",
    status,
  };
}

function buildCourierPerformanceMetrics(shipments = []) {
  const grouped = shipments.reduce((acc, shipment) => {
    const courier = asUpper(shipment.courier);
    acc[courier] = acc[courier] || {
      courier,
      shipmentCount: 0,
      deliveredCount: 0,
      failedCount: 0,
      returnedCount: 0,
      totalCodExpected: 0,
      totalCodCollected: 0,
    };
    const row = acc[courier];
    row.shipmentCount += 1;
    row.totalCodExpected += toNumber(shipment.cashOnDeliveryAmount, 0);
    row.totalCodCollected += toNumber(shipment.codCollectedAmount, 0);
    if (asUpper(shipment.status) === "DELIVERED") row.deliveredCount += 1;
    if (asUpper(shipment.status) === "FAILED") row.failedCount += 1;
    if (asUpper(shipment.status) === "RETURNED") row.returnedCount += 1;
    return acc;
  }, {});

  return Object.values(grouped).map(row => ({
    ...row,
    successRate: row.shipmentCount
      ? Number(((row.deliveredCount / row.shipmentCount) * 100).toFixed(2))
      : 0,
    codCollectionRate: row.totalCodExpected
      ? Number(((row.totalCodCollected / row.totalCodExpected) * 100).toFixed(2))
      : 0,
  }));
}

function reconcileCodCollections(shipments = [], options = {}) {
  const toleranceAmount = toNumber(options.toleranceAmount, 0);
  const mismatches = shipments
    .map(shipment => detectCodMismatch(shipment, toleranceAmount))
    .filter(row => row.mismatch);

  const delayed = shipments
    .map(shipment => detectShipmentDelay(shipment, options.delayThresholds))
    .filter(row => row.delayed);

  return {
    summary: {
      totalShipments: shipments.length,
      codMismatchCount: mismatches.length,
      delayedShipmentCount: delayed.length,
    },
    mismatches,
    delayed,
    performance: buildCourierPerformanceMetrics(shipments),
  };
}

module.exports = {
  mapProviderShipmentStatus,
  detectCodMismatch,
  detectShipmentDelay,
  buildCourierPerformanceMetrics,
  reconcileCodCollections,
};
