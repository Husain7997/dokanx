const SUPPORTED_COURIERS = ["PATHAO", "REDX", "STEADFAST", "ECOURIER", "PAPERFLY"];
const WEBHOOK_EVENTS = ["ORDER_PICKED", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED", "RETURNED"];

function asUpper(value) {
  return String(value || "").trim().toUpperCase();
}

function validateCreateShipmentBody(body = {}) {
  const errors = [];
  if (!String(body.orderId || "").trim()) errors.push("orderId is required");
  if (!SUPPORTED_COURIERS.includes(asUpper(body.courier))) errors.push("courier is invalid");

  if (!body.recipient || typeof body.recipient !== "object") {
    errors.push("recipient is required");
  } else {
    if (!String(body.recipient.name || "").trim()) errors.push("recipient.name is required");
    if (!String(body.recipient.phone || "").trim()) errors.push("recipient.phone is required");
    if (!String(body.recipient.address || "").trim()) errors.push("recipient.address is required");
  }

  if (body.cashOnDeliveryAmount !== undefined) {
    const cod = Number(body.cashOnDeliveryAmount);
    if (!Number.isFinite(cod) || cod < 0) errors.push("cashOnDeliveryAmount must be >= 0");
  }

  return { valid: errors.length === 0, errors };
}

function validateShipmentQuery(query = {}) {
  const errors = [];
  if (query.courier && !SUPPORTED_COURIERS.includes(asUpper(query.courier))) {
    errors.push("courier is invalid");
  }
  return { valid: errors.length === 0, errors };
}

function validateShipmentIdParam(params = {}) {
  const shipmentId = String(params.shipmentId || "").trim();
  return {
    valid: Boolean(shipmentId),
    errors: shipmentId ? [] : ["shipmentId is required"],
  };
}

function validateWebhookBody(body = {}) {
  const errors = [];
  if (!String(body.trackingCode || "").trim()) errors.push("trackingCode is required");
  if (!SUPPORTED_COURIERS.includes(asUpper(body.courier))) errors.push("courier is invalid");
  if (!WEBHOOK_EVENTS.includes(asUpper(body.event))) errors.push("event is invalid");

  if (body.codCollectedAmount !== undefined) {
    const amount = Number(body.codCollectedAmount);
    if (!Number.isFinite(amount) || amount < 0) errors.push("codCollectedAmount must be >= 0");
  }

  return { valid: errors.length === 0, errors };
}

module.exports = {
  validateCreateShipmentBody,
  validateShipmentQuery,
  validateShipmentIdParam,
  validateWebhookBody,
};
