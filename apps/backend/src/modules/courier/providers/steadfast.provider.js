const BaseCourierProvider = require("./base.provider");

class SteadfastProvider extends BaseCourierProvider {
  constructor() {
    super("STEADFAST", "STEADFAST");
  }

  getCreateShipmentEndpoint() {
    return "/api/v1/create_order";
  }

  getTrackShipmentEndpoint(reference) {
    return `/api/v1/status_by_cid/${reference}`;
  }

  buildCreateShipmentPayload(payload = {}) {
    return {
      invoice: payload.orderId,
      recipient_name: payload?.recipient?.name || "",
      recipient_phone: payload?.recipient?.phone || "",
      recipient_address: payload?.recipient?.address || "",
      tracking_code: payload.trackingCode || "",
    };
  }

  normalizeCreateShipmentResponse(dispatch = {}, payload = {}) {
    return {
      accepted: Boolean(dispatch.accepted),
      externalReference: dispatch?.responseBody?.consignment?.tracking_code || this.buildExternalReference(payload),
      providerStatus: dispatch.responseStatus || 0,
      mode: dispatch.mode || "MANUAL",
      raw: dispatch.responseBody || null,
    };
  }

  normalizeTrackShipmentResponse(dispatch = {}, shipment = {}) {
    return {
      accepted: Boolean(dispatch.accepted),
      shipmentStatus: dispatch?.responseBody?.delivery_status || shipment.status || "UNKNOWN",
      providerStatus: dispatch.responseStatus || 0,
      mode: dispatch.mode || "MANUAL",
      raw: dispatch.responseBody || null,
    };
  }
}

module.exports = SteadfastProvider;
