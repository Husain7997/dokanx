class DokanXClient {
  constructor({ baseUrl, apiKey }) {
    this.baseUrl = baseUrl?.replace(/\/$/, "") || "http://localhost:5001/api/v1";
    this.apiKey = apiKey;
  }

  async request(path, options = {}) {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        ...(options.headers || {}),
      },
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(payload?.message || "Request failed");
    }
    return payload;
  }

  listProducts(shopId) {
    const query = shopId ? `?shopId=${encodeURIComponent(shopId)}` : "";
    return this.request(`/products${query}`);
  }

  createOrder(payload) {
    return this.request("/orders", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }
}

module.exports = { DokanXClient };
