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
    "/system/queues/dead-letter": { get: { summary: "Queue dead-letter report" } },
    "/customers/segments": { get: { summary: "List customer segments" }, post: { summary: "Upsert customer segment" } },
    "/customers/segments/evaluate": { post: { summary: "Evaluate customer profiles into segments" } },
    "/gift-cards": { get: { summary: "List gift cards" }, post: { summary: "Create gift card" } },
    "/gift-cards/{code}/redeem": { post: { summary: "Redeem gift card" } },
    "/content/pages": { get: { summary: "List CMS pages" }, post: { summary: "Upsert CMS page" } },
    "/content/seo/rules": { get: { summary: "List SEO rules" }, post: { summary: "Upsert SEO rule" } },
    "/content/experiments": { get: { summary: "List A/B experiments" }, post: { summary: "Create A/B experiment" } },
    "/courier/optimization/profile": { get: { summary: "Courier optimization profile" }, post: { summary: "Upsert courier optimization profile" } },
    "/courier/optimization/recommendation": { post: { summary: "Recommend courier provider" } },
    "/analytics/warehouse": { get: { summary: "List analytics warehouse snapshots" } },
    "/analytics/warehouse/build": { post: { summary: "Build analytics warehouse snapshots" } }
  }
};

router.get("/openapi.json", (_req, res) => {
  res.json(spec);
});

module.exports = router;
