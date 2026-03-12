const mongoose = require("mongoose");

const knowledgeGraphEdgeSchema = new mongoose.Schema(
  {
    tenantScope: {
      type: String,
      enum: ["GLOBAL", "SHOP"],
      default: "GLOBAL",
      index: true,
    },
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      default: null,
      index: true,
    },
    fromNodeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "KnowledgeGraphNode",
      required: true,
      index: true,
    },
    toNodeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "KnowledgeGraphNode",
      required: true,
      index: true,
    },
    edgeType: {
      type: String,
      enum: [
        "BELONGS_TO_CATEGORY",
        "HAS_BRAND",
        "HAS_ATTRIBUTE",
        "SIMILAR_TO",
        "VARIANT_OF",
      ],
      required: true,
      index: true,
    },
    weight: {
      type: Number,
      default: 0.5,
      min: 0,
      max: 1,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

knowledgeGraphEdgeSchema.index(
  { tenantScope: 1, shopId: 1, fromNodeId: 1, toNodeId: 1, edgeType: 1 },
  { unique: true, sparse: true }
);

module.exports =
  mongoose.models.KnowledgeGraphEdge ||
  mongoose.model("KnowledgeGraphEdge", knowledgeGraphEdgeSchema);
