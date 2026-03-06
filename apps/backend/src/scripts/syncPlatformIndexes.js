require("module-alias/register");
require("dotenv").config();

const mongoose = require("mongoose");

const Shop = require("../models/shop.model");
const Product = require("../models/product.model");
const ProductImportBatch = require("../modules/catalog-import/models/productImportBatch.model");
const CreditAccount = require("../modules/credit/credit.account.model");
const CreditLedger = require("../modules/credit/credit.ledger.model");
const CreditPolicy = require("../modules/credit/credit.policy.model");
const BehaviorSignal = require("../modules/behavior/behaviorSignal.model");
const CatalogGlobalProduct = require("../modules/catalog/catalogGlobalProduct.model");
const CatalogDecision = require("../modules/catalog/catalogDecision.model");

const DRY_RUN = String(process.env.DRY_RUN || "false").toLowerCase() === "true";

async function ensureIndexes(model, indexes) {
  const collection = model.collection;
  const modelName = model.modelName;

  for (const index of indexes) {
    const { spec, options } = index;
    const printable = JSON.stringify({ spec, options });

    if (DRY_RUN) {
      console.log(`[DRY_RUN] ${modelName} -> ${printable}`);
      continue;
    }

    try {
      const result = await collection.createIndex(spec, options);
      console.log(`✅ ${modelName} index ensured: ${result}`);
    } catch (err) {
      if (err?.codeName === "IndexOptionsConflict" || err?.code === 85) {
        console.warn(`⚠️ ${modelName} index conflict: ${options?.name || JSON.stringify(spec)}`);
        continue;
      }
      throw err;
    }
  }
}

async function run() {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is required");
  }

  await mongoose.connect(process.env.MONGO_URI, {
    autoIndex: false,
  });

  console.log("🔌 Mongo connected");

  const plan = [
    {
      model: Shop,
      indexes: [
        {
          spec: { location: "2dsphere" },
          options: { name: "idx_shop_location_2dsphere", background: true },
        },
        {
          spec: { name: 1, status: 1 },
          options: { name: "idx_shop_name_status", background: true },
        },
      ],
    },
    {
      model: Product,
      indexes: [
        {
          spec: { shopId: 1, barcode: 1 },
          options: { name: "idx_product_shop_barcode", background: true },
        },
      ],
    },
    {
      model: ProductImportBatch,
      indexes: [
        {
          spec: { shopId: 1, idempotencyKey: 1 },
          options: {
            name: "uniq_product_import_shop_idempotency",
            unique: true,
            sparse: true,
            background: true,
          },
        },
      ],
    },
    {
      model: CreditAccount,
      indexes: [
        {
          spec: { shop: 1, customer: 1 },
          options: {
            name: "uniq_credit_account_shop_customer",
            unique: true,
            background: true,
          },
        },
      ],
    },
    {
      model: CreditLedger,
      indexes: [
        {
          spec: { idempotencyKey: 1 },
          options: {
            name: "uniq_credit_ledger_idempotency",
            unique: true,
            sparse: true,
            background: true,
          },
        },
        {
          spec: { shop: 1, customer: 1, createdAt: -1 },
          options: { name: "idx_credit_ledger_shop_customer_created", background: true },
        },
      ],
    },
    {
      model: CreditPolicy,
      indexes: [
        {
          spec: { shop: 1 },
          options: {
            name: "uniq_credit_policy_shop",
            unique: true,
            background: true,
          },
        },
      ],
    },
    {
      model: BehaviorSignal,
      indexes: [
        {
          spec: { shop: 1, customer: 1, signalType: 1, dateKey: 1 },
          options: {
            name: "uniq_behavior_signal_per_day",
            unique: true,
            background: true,
          },
        },
        {
          spec: { shop: 1, severity: 1, resolved: 1, createdAt: -1 },
          options: { name: "idx_behavior_signal_filter", background: true },
        },
      ],
    },
    {
      model: CatalogGlobalProduct,
      indexes: [
        {
          spec: { normalizedName: 1, brand: 1, category: 1 },
          options: { name: "idx_catalog_name_brand_category", background: true },
        },
        {
          spec: { barcode: 1 },
          options: { name: "idx_catalog_barcode", sparse: true, background: true },
        },
        {
          spec: { canonicalName: "text", aliases: "text", brand: "text", category: "text" },
          options: { name: "idx_catalog_text_search", background: true },
        },
      ],
    },
    {
      model: CatalogDecision,
      indexes: [
        {
          spec: { shopId: 1, action: 1, createdAt: -1 },
          options: { name: "idx_catalog_decision_shop_action", background: true },
        },
      ],
    },
  ];

  for (const step of plan) {
    await ensureIndexes(step.model, step.indexes);
  }

  console.log(DRY_RUN ? "🧪 Dry-run complete" : "✅ Index sync complete");
  await mongoose.disconnect();
  console.log("🔌 Mongo disconnected");
}

run().catch(async err => {
  console.error("❌ Index sync failed:", err);
  try {
    await mongoose.disconnect();
  } catch (_e) {}
  process.exit(1);
});
