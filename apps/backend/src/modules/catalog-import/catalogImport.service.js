const XLSX = require("xlsx");
const Product = require("@/models/product.model");
const ProductImportBatch = require("./models/productImportBatch.model");

const BRAND_HINTS = [
  "Unilever",
  "ACI",
  "Square Pharma",
  "Square",
  "Pran",
  "RFL",
  "Bashundhara",
];

const BRAND_PRODUCT_HINTS = [
  { keyword: "lux", brand: "Unilever" },
  { keyword: "dove", brand: "Unilever" },
  { keyword: "sunsilk", brand: "Unilever" },
  { keyword: "napa", brand: "Square Pharma" },
  { keyword: "seclo", brand: "Square Pharma" },
  { keyword: "aci", brand: "ACI" },
];

const CATEGORY_RULES = [
  { keyword: "soap", category: "Beauty Soap" },
  { keyword: "shampoo", category: "Hair Care" },
  { keyword: "biscuit", category: "Snacks" },
  { keyword: "noodle", category: "Instant Noodles" },
  { keyword: "oil", category: "Cooking Oil" },
  { keyword: "paracetamol", category: "Pharma" },
  { keyword: "tablet", category: "Pharma" },
  { keyword: "capsule", category: "Pharma" },
];

const HEADER_ALIASES = {
  name: ["name", "product", "product name", "item", "item name"],
  brand: ["brand", "company", "manufacturer"],
  category: ["category", "type", "group"],
  price: ["price", "mrp", "unit price", "sell price", "selling price"],
  barcode: ["barcode", "bar code", "sku", "code"],
  imageUrl: ["image", "image url", "image link", "photo", "photo url"],
};

function normalizeKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function resolveCanonicalKey(columnName) {
  const normalized = normalizeKey(columnName);
  for (const [canonical, aliases] of Object.entries(HEADER_ALIASES)) {
    if (aliases.includes(normalized)) return canonical;
  }
  return null;
}

function asNumber(value) {
  const n = Number(String(value ?? "").trim());
  return Number.isFinite(n) ? n : NaN;
}

function detectBrandFromText(value) {
  const text = String(value || "").toLowerCase();

  for (const item of BRAND_PRODUCT_HINTS) {
    if (text.includes(item.keyword)) {
      return item.brand;
    }
  }

  for (const hint of BRAND_HINTS) {
    if (text.includes(hint.toLowerCase())) {
      return hint;
    }
  }
  return "";
}

function detectCategoryFromText(value) {
  const text = String(value || "").toLowerCase();
  for (const rule of CATEGORY_RULES) {
    if (text.includes(rule.keyword)) {
      return rule.category;
    }
  }
  return "General";
}

function mapRows(rawRows) {
  const mappedRows = rawRows.map((row, idx) => {
    const mapped = {
      rowNumber: idx + 2,
      name: "",
      brand: "",
      category: "",
      price: 0,
      barcode: "",
      imageUrl: "",
      errors: [],
    };

    for (const [key, val] of Object.entries(row || {})) {
      const canonical = resolveCanonicalKey(key);
      if (!canonical) continue;

      const clean = String(val ?? "").trim();
      if (canonical === "price") {
        mapped.price = asNumber(clean);
        continue;
      }
      mapped[canonical] = clean;
    }

    if (!mapped.brand && mapped.name) {
      mapped.brand = detectBrandFromText(mapped.name);
    }

    if (!mapped.category && mapped.name) {
      mapped.category = detectCategoryFromText(mapped.name);
    }

    if (!mapped.name) mapped.errors.push("Missing product name");
    if (!Number.isFinite(mapped.price) || mapped.price < 0) {
      mapped.errors.push("Invalid price");
      mapped.price = 0;
    }

    return mapped;
  });

  const seenInFile = new Set();

  for (const row of mappedRows) {
    const dedupeKey = row.barcode
      ? `barcode:${row.barcode.toLowerCase()}`
      : `name:${normalizeKey(row.name)}`;

    if (seenInFile.has(dedupeKey)) {
      row.errors.push("Duplicate row in file");
      continue;
    }

    seenInFile.add(dedupeKey);
  }

  return mappedRows;
}

function parseExcelBuffer(buffer) {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const firstSheetName = workbook.SheetNames?.[0];
  if (!firstSheetName) {
    throw new Error("Excel file has no worksheet");
  }

  const firstSheet = workbook.Sheets[firstSheetName];
  const rawRows = XLSX.utils.sheet_to_json(firstSheet, { defval: "" });
  if (!rawRows.length) {
    throw new Error("Excel file has no data rows");
  }

  const mappedRows = mapRows(rawRows);
  const validRows = mappedRows.filter(r => !r.errors.length).length;
  const invalidRows = mappedRows.length - validRows;

  return {
    rawRows,
    mappedRows,
    summary: {
      totalRows: mappedRows.length,
      validRows,
      invalidRows,
      importedRows: 0,
      skippedRows: 0,
    },
  };
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function createUploadBatch({
  shopId,
  userId,
  file,
}) {
  if (!file?.buffer) {
    throw new Error("Excel file is required");
  }

  const { rawRows, mappedRows, summary } = parseExcelBuffer(file.buffer);

  const batch = await ProductImportBatch.create({
    shopId,
    createdBy: userId,
    originalFileName: file.originalname || "products.xlsx",
    mimeType: file.mimetype || "application/octet-stream",
    rawRows,
    mappedRows,
    summary,
    status: "UPLOADED",
  });

  return batch;
}

async function getBatchPreview({ shopId, batchId }) {
  const batch = await ProductImportBatch.findOne({
    _id: batchId,
    shopId,
  }).lean();

  if (!batch) {
    throw new Error("Import batch not found");
  }

  if (batch.status === "UPLOADED") {
    await ProductImportBatch.updateOne(
      { _id: batchId, shopId, status: "UPLOADED" },
      { $set: { status: "PREVIEWED" } }
    );
    batch.status = "PREVIEWED";
  }

  return batch;
}

async function confirmImport({
  shopId,
  batchId,
  idempotencyKey,
}) {
  const batch = await ProductImportBatch.findOne({
    _id: batchId,
    shopId,
  });

  if (!batch) {
    throw new Error("Import batch not found");
  }

  if (batch.status === "CONFIRMED") {
    return {
      batch,
      idempotencyReplay: false,
      replayedFromBatchId: null,
    };
  }

  if (idempotencyKey) {
    const existing = await ProductImportBatch.findOne({
      shopId,
      idempotencyKey,
      status: "CONFIRMED",
    });
    if (existing) {
      return {
        batch: existing,
        idempotencyReplay: true,
        replayedFromBatchId: existing._id.toString(),
      };
    }
  }

  let importedRows = 0;
  let skippedRows = 0;

  for (const row of batch.mappedRows) {
    if (row.errors?.length) {
      skippedRows += 1;
      continue;
    }

    const nameRegex = new RegExp(`^${escapeRegex(row.name)}$`, "i");
    const query = row.barcode
      ? { shopId, $or: [{ barcode: row.barcode }, { name: nameRegex }] }
      : { shopId, name: nameRegex };

    const exists = await Product.findOne(query).lean();
    if (exists) {
      skippedRows += 1;
      continue;
    }

    await Product.create({
      shopId,
      name: row.name,
      brand: row.brand || undefined,
      category: row.category || undefined,
      price: row.price,
      barcode: row.barcode || undefined,
      imageUrl: row.imageUrl || undefined,
      stock: 0,
      reserved: 0,
      isActive: true,
    });

    importedRows += 1;
  }

  batch.status = "CONFIRMED";
  batch.idempotencyKey = idempotencyKey || null;
  batch.confirmedAt = new Date();
  batch.summary.importedRows = importedRows;
  batch.summary.skippedRows = skippedRows;

  await batch.save();
  return {
    batch,
    idempotencyReplay: false,
    replayedFromBatchId: null,
  };
}

async function getBatchErrorReport({ shopId, batchId }) {
  const batch = await ProductImportBatch.findOne({
    _id: batchId,
    shopId,
  }).lean();

  if (!batch) {
    throw new Error("Import batch not found");
  }

  const errorRows = (batch.mappedRows || [])
    .filter(row => Array.isArray(row.errors) && row.errors.length > 0)
    .map(row => ({
      rowNumber: row.rowNumber,
      name: row.name || "",
      brand: row.brand || "",
      category: row.category || "",
      price: row.price,
      barcode: row.barcode || "",
      errors: row.errors || [],
    }));

  return {
    batchId: batch._id,
    status: batch.status,
    totalRows: batch.summary?.totalRows || 0,
    invalidRows: errorRows.length,
    errorRows,
  };
}

module.exports = {
  createUploadBatch,
  getBatchPreview,
  confirmImport,
  getBatchErrorReport,
  _internals: {
    mapRows,
    detectBrandFromText,
    detectCategoryFromText,
  },
};
