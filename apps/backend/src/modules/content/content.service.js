const CmsPage = require("./models/cmsPage.model");
const SeoRule = require("./models/seoRule.model");
const AbExperiment = require("./models/abExperiment.model");

function asUpper(value) {
  return String(value || "").trim().toUpperCase();
}

async function upsertPage({ shopId, payload }) {
  return CmsPage.findOneAndUpdate(
    { shopId, slug: String(payload.slug || "").trim().toLowerCase() },
    {
      $set: {
        title: String(payload.title || "").trim(),
        body: String(payload.body || ""),
        seo: {
          title: String(payload?.seo?.title || "").trim(),
          description: String(payload?.seo?.description || "").trim(),
          schemaType: String(payload?.seo?.schemaType || "WebPage").trim(),
        },
        status: asUpper(payload.status || "DRAFT"),
      },
    },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
  );
}

async function listPages({ shopId }) {
  return CmsPage.find({ shopId }).sort({ updatedAt: -1 }).lean();
}

async function upsertSeoRule({ shopId, payload }) {
  return SeoRule.findOneAndUpdate(
    {
      shopId,
      entityType: asUpper(payload.entityType),
      entityRef: String(payload.entityRef || "").trim(),
    },
    {
      $set: {
        metaTitleTemplate: String(payload.metaTitleTemplate || "").trim(),
        metaDescriptionTemplate: String(payload.metaDescriptionTemplate || "").trim(),
        schemaType: String(payload.schemaType || "WebPage").trim(),
        canonicalUrl: String(payload.canonicalUrl || "").trim(),
      },
    },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
  );
}

async function listSeoRules({ shopId }) {
  return SeoRule.find({ shopId }).sort({ updatedAt: -1 }).lean();
}

async function createExperiment({ shopId, payload }) {
  return AbExperiment.create({
    shopId,
    name: String(payload.name || "").trim(),
    targetType: asUpper(payload.targetType),
    variants: Array.isArray(payload.variants) ? payload.variants : [],
    status: asUpper(payload.status || "DRAFT"),
  });
}

async function listExperiments({ shopId }) {
  return AbExperiment.find({ shopId }).sort({ createdAt: -1 }).lean();
}

module.exports = {
  upsertPage,
  listPages,
  upsertSeoRule,
  listSeoRules,
  createExperiment,
  listExperiments,
};
