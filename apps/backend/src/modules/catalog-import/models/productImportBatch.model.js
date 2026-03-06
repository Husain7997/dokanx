const mongoose = require("mongoose");

const mappedRowSchema = new mongoose.Schema(
  {
    rowNumber: { type: Number, required: true },
    name: { type: String, default: "" },
    brand: { type: String, default: "" },
    category: { type: String, default: "" },
    price: { type: Number, default: 0 },
    barcode: { type: String, default: "" },
    imageUrl: { type: String, default: "" },
    errors: [{ type: String }],
  },
  { _id: false }
);

const schema = new mongoose.Schema(
  {
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
      index: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    originalFileName: { type: String, required: true },
    mimeType: { type: String, required: true },

    status: {
      type: String,
      enum: ["UPLOADED", "PREVIEWED", "CONFIRMED", "FAILED"],
      default: "UPLOADED",
      index: true,
    },

    idempotencyKey: {
      type: String,
      default: null,
    },

    rawRows: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },

    mappedRows: {
      type: [mappedRowSchema],
      default: [],
    },

    summary: {
      totalRows: { type: Number, default: 0 },
      validRows: { type: Number, default: 0 },
      invalidRows: { type: Number, default: 0 },
      importedRows: { type: Number, default: 0 },
      skippedRows: { type: Number, default: 0 },
    },

    confirmedAt: Date,
  },
  { timestamps: true }
);

schema.index(
  { shopId: 1, idempotencyKey: 1 },
  { unique: true, sparse: true }
);

module.exports =
  mongoose.models.ProductImportBatch ||
  mongoose.model("ProductImportBatch", schema);
