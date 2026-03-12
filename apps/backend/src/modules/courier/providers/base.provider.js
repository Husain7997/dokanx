const { getProviderConfig, isConfigured } = require("../providerConfig.service");
const axios = require("axios");

class BaseCourierProvider {
  constructor(name, envPrefix = name) {
    this.name = name;
    this.envPrefix = envPrefix;
  }

  getConfig() {
    return getProviderConfig(this.envPrefix);
  }

  isConfigured() {
    return isConfigured(this.getConfig());
  }

  getCreateShipmentEndpoint() {
    return "/shipments";
  }

  buildHeaders(config) {
    return {
      "content-type": "application/json",
      "x-api-key": config.apiKey || "",
      "x-client-id": config.clientId || "",
    };
  }

  buildCreateShipmentPayload(payload = {}) {
    return payload;
  }

  getTrackShipmentEndpoint(reference) {
    return `/shipments/${reference}`;
  }

  buildTrackShipmentRequest(reference) {
    const config = this.getConfig();
    return {
      method: "GET",
      url: `${String(config.baseUrl || "").replace(/\/$/, "")}${this.getTrackShipmentEndpoint(reference)}`,
      headers: this.buildHeaders(config),
      sandbox: config.sandbox,
    };
  }

  buildCreateShipmentRequest(payload = {}) {
    const config = this.getConfig();
    return {
      method: "POST",
      url: `${String(config.baseUrl || "").replace(/\/$/, "")}${this.getCreateShipmentEndpoint()}`,
      headers: this.buildHeaders(config),
      body: this.buildCreateShipmentPayload(payload),
      sandbox: config.sandbox,
    };
  }

  buildExternalReference(payload = {}) {
    return `${this.name}-${String(payload.trackingCode || payload.orderId || Date.now()).toUpperCase()}`;
  }

  normalizeCreateShipmentResponse(dispatch = {}, payload = {}) {
    return {
      accepted: Boolean(dispatch.accepted),
      externalReference: this.buildExternalReference(payload),
      providerStatus: dispatch.responseStatus || 0,
      mode: dispatch.mode || "MANUAL",
      raw: dispatch.responseBody || null,
    };
  }

  normalizeTrackShipmentResponse(dispatch = {}, shipment = {}) {
    return {
      accepted: Boolean(dispatch.accepted),
      shipmentStatus: shipment.status || "UNKNOWN",
      providerStatus: dispatch.responseStatus || 0,
      mode: dispatch.mode || "MANUAL",
      raw: dispatch.responseBody || null,
    };
  }

  async dispatchRequest(request) {
    const executeLive = String(process.env.COURIER_EXECUTE_REQUESTS || "false") === "true";
    if (!executeLive || !this.isConfigured()) {
      return {
        accepted: this.isConfigured(),
        mode: this.isConfigured() ? "LIVE_READY" : "MANUAL",
        request,
        responseStatus: 0,
      };
    }

    const response = await axios({
      method: request.method,
      url: request.url,
      headers: request.headers,
      data: request.body,
      timeout: Number(process.env.COURIER_HTTP_TIMEOUT_MS || 5000),
      validateStatus: () => true,
    });

    return {
      accepted: response.status >= 200 && response.status < 300,
      mode: "LIVE_EXECUTED",
      request,
      responseStatus: response.status,
      responseBody: response.data,
    };
  }

  async createShipment(payload = {}) {
    const config = this.getConfig();
    const request = this.buildCreateShipmentRequest(payload);
    const dispatch = await this.dispatchRequest(request);
    return {
      provider: this.name,
      status: this.isConfigured() ? "QUEUED" : "MANUAL_CONFIG_REQUIRED",
      externalReference: this.buildExternalReference(payload),
      request,
      dispatch,
      normalizedResponse: this.normalizeCreateShipmentResponse(dispatch, payload),
    };
  }

  async fetchShipmentStatus(shipment = {}) {
    const reference = shipment.externalReference || shipment.trackingCode || "";
    const request = this.buildTrackShipmentRequest(reference);
    const dispatch = await this.dispatchRequest(request);
    return {
      provider: this.name,
      request,
      dispatch,
      normalizedResponse: this.normalizeTrackShipmentResponse(dispatch, shipment),
    };
  }
}

module.exports = BaseCourierProvider;
