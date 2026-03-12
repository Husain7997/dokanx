const BaseCourierProvider = require("./base.provider");

class PathaoProvider extends BaseCourierProvider {
  constructor() {
    super("PATHAO", "PATHAO");
  }

  getCreateShipmentEndpoint() {
    return "/aladdin/api/v1/orders";
  }

  getTrackShipmentEndpoint(reference) {
    return `/aladdin/api/v1/orders/${reference}`;
  }

  buildCreateShipmentPayload(payload = {}) {
    return {
      merchant_order_id: payload.orderId,
      recipient_name: payload?.recipient?.name || "",
      recipient_phone: payload?.recipient?.phone || "",
      recipient_address: payload?.recipient?.address || "",
      tracking_code: payload.trackingCode || "",
    };
  }

  normalizeCreateShipmentResponse(dispatch = {}, payload = {}) {
    return {
      accepted: Boolean(dispatch.accepted),
      externalReference: dispatch?.responseBody?.data?.consignment_id || this.buildExternalReference(payload),
      providerStatus: dispatch.responseStatus || 0,
      mode: dispatch.mode || "MANUAL",
      raw: dispatch.responseBody || null,
    };
  }

  normalizeTrackShipmentResponse(dispatch = {}, shipment = {}) {
    return {
      accepted: Boolean(dispatch.accepted),
      shipmentStatus: dispatch?.responseBody?.data?.order_status || shipment.status || "UNKNOWN",
      providerStatus: dispatch.responseStatus || 0,
      mode: dispatch.mode || "MANUAL",
      raw: dispatch.responseBody || null,
    };
  }
}

module.exports = PathaoProvider;
