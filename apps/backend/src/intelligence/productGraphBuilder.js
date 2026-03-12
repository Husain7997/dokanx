const CatalogGlobalProduct = require("@/modules/catalog/models/catalogGlobalProduct.model");
const { upsertNode, upsertEdge } = require("./knowledgeGraph.service");
const { computeSimilarity, inferMissingAttributes, extractAttributes } = require("./productSimilarity.service");
const { recordIntelligenceMetric } = require("./intelligenceTelemetry.service");

async function buildProductKnowledgeGraph({
  products = null,
  shopId = null,
  dependencies = {},
} = {}) {
  const rows =
    products ||
    (await (dependencies.CatalogGlobalProduct || CatalogGlobalProduct)
      .find({ isActive: true })
      .limit(500)
      .lean());

  const nodes = [];
  const edges = [];

  for (const product of rows) {
    const productNode = await upsertNode({
      nodeType: "PRODUCT",
      name: product.canonicalName || product.name,
      qualifier: product.brand || "",
      shopId,
      sourceRef: String(product._id || ""),
      metadata: {
        productId: product._id,
        barcode: product.barcode || "",
        attributes: inferMissingAttributes(product, rows),
      },
      models: dependencies.models,
    });
    nodes.push(productNode);

    if (product.brand) {
      const brandNode = await upsertNode({
        nodeType: "BRAND",
        name: product.brand,
        shopId,
        sourceRef: String(product._id || ""),
        models: dependencies.models,
      });
      nodes.push(brandNode);
      edges.push(
        await upsertEdge({
          fromNodeId: productNode._id,
          toNodeId: brandNode._id,
          edgeType: "HAS_BRAND",
          weight: 0.95,
          shopId,
          models: dependencies.models,
        })
      );
    }

    if (product.category) {
      const categoryNode = await upsertNode({
        nodeType: "CATEGORY",
        name: product.category,
        shopId,
        sourceRef: String(product._id || ""),
        models: dependencies.models,
      });
      nodes.push(categoryNode);
      edges.push(
        await upsertEdge({
          fromNodeId: productNode._id,
          toNodeId: categoryNode._id,
          edgeType: "BELONGS_TO_CATEGORY",
          weight: 0.95,
          shopId,
          models: dependencies.models,
        })
      );
    }

    const inferredAttributes = extractAttributes(product);
    for (const [attributeName, attributeValue] of Object.entries(inferredAttributes)) {
      const attributeNode = await upsertNode({
        nodeType: "ATTRIBUTE",
        name: `${attributeName}:${attributeValue}`,
        qualifier: attributeName,
        shopId,
        sourceRef: String(product._id || ""),
        models: dependencies.models,
      });
      nodes.push(attributeNode);
      edges.push(
        await upsertEdge({
          fromNodeId: productNode._id,
          toNodeId: attributeNode._id,
          edgeType: "HAS_ATTRIBUTE",
          weight: 0.75,
          shopId,
          metadata: { attributeName, attributeValue },
          models: dependencies.models,
        })
      );
    }
  }

  for (let i = 0; i < rows.length; i += 1) {
    for (let j = i + 1; j < rows.length; j += 1) {
      const similarity = computeSimilarity(rows[i], rows[j]);
      if (!similarity.isSimilar && !similarity.isVariant) continue;

      const fromNode = nodes.find(
        node => String(node.sourceRef || "") === String(rows[i]._id || "") && node.nodeType === "PRODUCT"
      );
      const toNode = nodes.find(
        node => String(node.sourceRef || "") === String(rows[j]._id || "") && node.nodeType === "PRODUCT"
      );
      if (!fromNode || !toNode) continue;

      edges.push(
        await upsertEdge({
          fromNodeId: fromNode._id,
          toNodeId: toNode._id,
          edgeType: similarity.isVariant ? "VARIANT_OF" : "SIMILAR_TO",
          weight: similarity.score,
          shopId,
          metadata: similarity,
          models: dependencies.models,
        })
      );
    }
  }

  await recordIntelligenceMetric({
    tenantId: shopId,
    metricType: "KNOWLEDGE_GRAPH_BUILD",
    latencyMs: 0,
    accuracyScore: rows.length ? Math.min(1, edges.length / Math.max(rows.length, 1)) : 1,
    metadata: {
      productCount: rows.length,
      nodeCount: nodes.length,
      edgeCount: edges.length,
    },
    persist: !dependencies.skipMetricPersist,
  });

  return {
    productCount: rows.length,
    nodeCount: nodes.length,
    edgeCount: edges.length,
  };
}

module.exports = {
  buildProductKnowledgeGraph,
};
