const BaseCourierProvider = require("./base.provider");

class ECourierProvider extends BaseCourierProvider {
  constructor() {
    super("ECOURIER", "ECOURIER");
  }

  getCreateShipmentEndpoint() {
    return "/api/order";
  }

  getTrackShipmentEndpoint(reference) {
    return `/api/order/${reference}`;
  }

  buildCreateShipmentPayload(payload = {}) {
    return {
      order_id: payload.orderId,
      recipient_name: payload?.recipient?.name || "",
      recipient_mobile: payload?.recipient?.phone || "",
      recipient_address: payload?.recipient?.address || "",
      tracking_code: payload.trackingCode || "",
    };
  }

  normalizeCreateShipmentResponse(dispatch = {}, payload = {}) {
    return {
      accepted: Boolean(dispatch.accepted),
      externalReference: dispatch?.responseBody?.parcel_id || this.buildExternalReference(payload),
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

module.exports = ECourierProvider;
