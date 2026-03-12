const BaseCourierProvider = require("./base.provider");

class RedxProvider extends BaseCourierProvider {
  constructor() {
    super("REDX", "REDX");
  }

  getCreateShipmentEndpoint() {
    return "/v1.0.0-beta/parcel";
  }

  getTrackShipmentEndpoint(reference) {
    return `/v1.0.0-beta/parcel/${reference}`;
  }

  buildCreateShipmentPayload(payload = {}) {
    return {
      merchantOrderId: payload.orderId,
      customerName: payload?.recipient?.name || "",
      customerPhone: payload?.recipient?.phone || "",
      deliveryAddress: payload?.recipient?.address || "",
      trackingCode: payload.trackingCode || "",
    };
  }

  normalizeCreateShipmentResponse(dispatch = {}, payload = {}) {
    return {
      accepted: Boolean(dispatch.accepted),
      externalReference: dispatch?.responseBody?.tracking_id || this.buildExternalReference(payload),
      providerStatus: dispatch.responseStatus || 0,
      mode: dispatch.mode || "MANUAL",
      raw: dispatch.responseBody || null,
    };
  }

  normalizeTrackShipmentResponse(dispatch = {}, shipment = {}) {
    return {
      accepted: Boolean(dispatch.accepted),
      shipmentStatus: dispatch?.responseBody?.status || shipment.status || "UNKNOWN",
      providerStatus: dispatch.responseStatus || 0,
      mode: dispatch.mode || "MANUAL",
      raw: dispatch.responseBody || null,
    };
  }
}

module.exports = RedxProvider;
