const router = require("express").Router();

const spec = {
  openapi: "3.0.3",
  info: {
    title: "DokanX API",
    version: "2.0.0-phase2",
    description: "Phase-2 baseline OpenAPI document"
  },
  servers: [{ url: "/api" }],
  paths: {
    "/auth/login": { post: { summary: "Login" } },
    "/products": { get: { summary: "List products" }, post: { summary: "Create product" } },
    "/orders": { get: { summary: "List orders" }, post: { summary: "Create order" } },
    "/shop/wallet/topup": { post: { summary: "Wallet topup" } },
    "/shop/wallet/transfer": { post: { summary: "Wallet transfer" } },
    "/settlements": { post: { summary: "Create settlement" } },
    "/system/metrics": { get: { summary: "Tenant-aware metrics" } },
    "/system/queues/dead-letter": { get: { summary: "Queue dead-letter report" } }
  }
};

router.get("/openapi.json", (_req, res) => {
  res.json(spec);
});

module.exports = router;
