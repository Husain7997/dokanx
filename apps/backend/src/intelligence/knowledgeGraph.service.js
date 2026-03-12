const KnowledgeGraphNode = require("@/models/KnowledgeGraphNode");
const KnowledgeGraphEdge = require("@/models/KnowledgeGraphEdge");
const { computeSimilarity, inferMissingAttributes } = require("./productSimilarity.service");
const { recordIntelligenceMetric } = require("./intelligenceTelemetry.service");

function normalizeText(value = "") {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function buildNodeKey(nodeType, name, qualifier = "") {
  return `${String(nodeType || "").toUpperCase()}:${normalizeText(name)}:${normalizeText(qualifier)}`;
}

async function upsertNode({
  nodeType,
  name,
  qualifier = "",
  shopId = null,
  tenantScope = "GLOBAL",
  sourceRef = "",
  confidence = 0.8,
  metadata = {},
  models = {},
}) {
  const NodeModel = models.NodeModel || KnowledgeGraphNode;
  const key = buildNodeKey(nodeType, name, qualifier);
  return NodeModel.findOneAndUpdate(
    { tenantScope, shopId, nodeType, key },
    {
      $set: {
        name: String(name || "").trim(),
        normalizedName: normalizeText(name),
        sourceRef: String(sourceRef || ""),
        confidence,
        metadata,
        isActive: true,
      },
    },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
  );
}

async function upsertEdge({
  fromNodeId,
  toNodeId,
  edgeType,
  weight = 0.8,
  shopId = null,
  tenantScope = "GLOBAL",
  metadata = {},
  models = {},
}) {
  const EdgeModel = models.EdgeModel || KnowledgeGraphEdge;
  return EdgeModel.findOneAndUpdate(
    { tenantScope, shopId, fromNodeId, toNodeId, edgeType },
    { $set: { weight, metadata } },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
  );
}

async function mergeDuplicateProducts({
  primaryProduct,
  duplicateProduct,
  shopId = null,
  models = {},
}) {
  const similarity = computeSimilarity(primaryProduct, duplicateProduct);
  if (!similarity.isSimilar) {
    return { merged: false, reason: "NOT_SIMILAR_ENOUGH", similarity };
  }

  const inferred = inferMissingAttributes(primaryProduct, [duplicateProduct]);
  const productNode = await upsertNode({
    nodeType: "PRODUCT",
    name: primaryProduct.canonicalName || primaryProduct.name,
    qualifier: primaryProduct.brand || "",
    shopId,
    sourceRef: String(primaryProduct._id || ""),
    metadata: { ...primaryProduct, inferredAttributes: inferred },
    models,
  });

  const duplicateNode = await upsertNode({
    nodeType: "PRODUCT",
    name: duplicateProduct.canonicalName || duplicateProduct.name,
    qualifier: duplicateProduct.brand || "",
    shopId,
    sourceRef: String(duplicateProduct._id || ""),
    metadata: { ...duplicateProduct },
    models,
  });

  await upsertEdge({
    fromNodeId: duplicateNode._id,
    toNodeId: productNode._id,
    edgeType: "SIMILAR_TO",
    weight: similarity.score,
    shopId,
    metadata: {
      action: "MERGED_DUPLICATE",
      inferredAttributes: inferred,
    },
    models,
  });

  await recordIntelligenceMetric({
    tenantId: shopId,
    metricType: "KNOWLEDGE_GRAPH_MERGE",
    latencyMs: 0,
    accuracyScore: similarity.score,
    metadata: {
      primaryProductId: String(primaryProduct._id || ""),
      duplicateProductId: String(duplicateProduct._id || ""),
    },
    persist: !models.skipMetricPersist,
  });

  return {
    merged: true,
    similarity,
    nodeId: productNode._id,
    duplicateNodeId: duplicateNode._id,
    inferredAttributes: inferred,
  };
}

module.exports = {
  upsertNode,
  upsertEdge,
  mergeDuplicateProducts,
  _internals: {
    buildNodeKey,
    normalizeText,
  },
};
