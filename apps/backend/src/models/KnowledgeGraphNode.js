const mongoose = require("mongoose");

const knowledgeGraphNodeSchema = new mongoose.Schema(
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
    nodeType: {
      type: String,
      enum: ["PRODUCT", "BRAND", "CATEGORY", "ATTRIBUTE"],
      required: true,
      index: true,
    },
    key: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    normalizedName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    sourceRef: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },
    confidence: {
      type: Number,
      default: 0.5,
      min: 0,
      max: 1,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true }
);

knowledgeGraphNodeSchema.index(
  { tenantScope: 1, shopId: 1, nodeType: 1, key: 1 },
  { unique: true, sparse: true }
);

module.exports =
  mongoose.models.KnowledgeGraphNode ||
  mongoose.model("KnowledgeGraphNode", knowledgeGraphNodeSchema);
