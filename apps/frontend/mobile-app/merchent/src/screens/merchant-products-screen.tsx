import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Image, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from "react-native";
import DocumentPicker from "react-native-document-picker";
import RNPrint from "react-native-print";
import * as XLSX from "xlsx";

import {
  MerchantFeatureSettings,
  MerchantPricingSafetySettings,
  createMerchantProductRequest,
  createMerchantProductsBulkRequest,
  deleteMerchantProductRequest,
  getMerchantPricingInsightsRequest,
  getMerchantProductsRequest,
  getMerchantShopSettingsRequest,
  searchMerchantProductsRequest,
  updateMerchantProductRequest,
} from "../lib/api-client";
import { useMerchantNavigation } from "../navigation/merchant-navigation";
import { useMerchantAuthStore } from "../store/auth-store";
import { useMerchantUiStore } from "../store/ui-store";
import { MerchantTopNav } from "./merchant-top-nav";

type MerchantProduct = {
  id: string;
  name: string;
  stock: number;
  price: number;
  costPrice: number;
  discountRate: number;
  category: string;
  barcode: string;
  imageUrl: string;
};

type PricingHint = {
  product: string;
  suggestion: number;
  yourPrice: number;
  inventory: number;
  velocity: string;
};

type ProductForm = {
  name: string;
  category: string;
  price: string;
  costPrice: string;
  stock: string;
  barcode: string;
  imageUrl: string;
  discountRate: string;
};

const EMPTY_FORM: ProductForm = {
  name: "",
  category: "General",
  price: "",
  costPrice: "",
  stock: "",
  barcode: "",
  imageUrl: "",
  discountRate: "0",
};

const CATEGORY_OPTIONS = ["General", "Grocery", "Dairy", "Beverage", "Snacks", "Electronics", "Pharmacy", "Fashion"] as const;
const PRINT_PRESETS = ["LABEL_40_30", "LABEL_58", "A4_TAG"] as const;

const DEFAULT_FEATURES: Required<MerchantFeatureSettings> = {
  posScannerEnabled: true,
  cameraScannerEnabled: true,
  bluetoothScannerEnabled: true,
  productSearchEnabled: true,
  discountToolsEnabled: true,
  pricingSafetyEnabled: true,
  splitPaymentEnabled: true,
};

const DEFAULT_SAFETY: Required<MerchantPricingSafetySettings> = {
  greenMinMarginPct: 0,
  limeMinMarginPct: -2,
  yellowMinMarginPct: -5,
  orangeMinMarginPct: -10,
  redBelowCost: true,
};

function toNumber(value: string) {
  return Number(value || 0);
}

function getFinalPrice(price: number, discountRate: number) {
  return Number((price * (1 - Math.max(0, Math.min(100, discountRate)) / 100)).toFixed(2));
}

function getSafetyBand(finalPrice: number, costPrice: number, pricingSafety: Required<MerchantPricingSafetySettings>) {
  if (costPrice <= 0) {
    return { label: "No cost", color: "#64748b", background: "#f1f5f9", dot: "#64748b", marginPct: null as number | null };
  }

  const marginPct = Number((((finalPrice - costPrice) / costPrice) * 100).toFixed(2));
  if (pricingSafety.redBelowCost && finalPrice < costPrice) {
    return { label: "Below cost", color: "#991b1b", background: "#fee2e2", dot: "#dc2626", marginPct };
  }
  if (marginPct >= Number(pricingSafety.greenMinMarginPct || 0)) {
    return { label: "Safe", color: "#166534", background: "#dcfce7", dot: "#16a34a", marginPct };
  }
  if (marginPct >= Number(pricingSafety.limeMinMarginPct || 0)) {
    return { label: "Near cost", color: "#3f6212", background: "#ecfccb", dot: "#84cc16", marginPct };
  }
  if (marginPct >= Number(pricingSafety.yellowMinMarginPct || 0)) {
    return { label: "Tight", color: "#854d0e", background: "#fef9c3", dot: "#eab308", marginPct };
  }
  if (marginPct >= Number(pricingSafety.orangeMinMarginPct || 0)) {
    return { label: "Risk", color: "#9a3412", background: "#ffedd5", dot: "#f97316", marginPct };
  }
  return { label: "Loss risk", color: "#991b1b", background: "#fee2e2", dot: "#dc2626", marginPct };
}

function parseBulkProductRows(input: string) {
  return input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => (line.includes("\t") ? line.split("\t") : line.split(",")))
    .map((cells) => cells.map((cell) => String(cell || "").trim()))
    .filter((cells) => cells[0] && cells[0].toLowerCase() !== "name")
    .map((cells) => ({
      name: cells[0] || "",
      category: cells[1] || "General",
      price: Number(cells[2] || 0),
      costPrice: Number(cells[3] || 0),
      stock: Number(cells[4] || 0),
      barcode: cells[5] || undefined,
      discountRate: Number(cells[6] || 0),
    }))
    .filter((row) => row.name && row.price >= 0 && row.stock >= 0);
}

async function loadUriAsArrayBuffer(uri: string) {
  return new Promise<ArrayBuffer>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("GET", uri, true);
    request.responseType = "arraybuffer";
    request.onload = () => {
      if (request.status >= 200 && request.status < 300 || request.status === 0) {
        resolve(request.response);
        return;
      }
      reject(new Error(`Unable to read file (${request.status}).`));
    };
    request.onerror = () => reject(new Error("Unable to read the selected file."));
    request.send();
  });
}
async function loadUriAsText(uri: string) {
  return new Promise<string>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("GET", uri, true);
    request.responseType = "text";
    request.onload = () => {
      if (request.status >= 200 && request.status < 300 || request.status === 0) {
        resolve(String(request.responseText || ""));
        return;
      }
      reject(new Error(`Unable to read file (${request.status}).`));
    };
    request.onerror = () => reject(new Error("Unable to read the selected file."));
    request.send();
  });
}
function parseWorkbookRows(data: ArrayBuffer) {
  const workbook = XLSX.read(data, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return [];
  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<Array<string | number>>(sheet, { header: 1, defval: "" });
  if (!rows.length) return [];

  const headerRow = (rows[0] || []).map((cell) => String(cell || "").trim().toLowerCase());
  const hasHeader = headerRow.includes("name") || headerRow.includes("product") || headerRow.includes("product name");
  const dataRows = hasHeader ? rows.slice(1) : rows;

  return dataRows
    .map((cells) => cells.map((cell) => String(cell || "").trim()))
    .filter((cells) => cells[0])
    .map((cells) => ({
      name: cells[0] || "",
      category: cells[1] || "General",
      price: Number(cells[2] || 0),
      costPrice: Number(cells[3] || 0),
      stock: Number(cells[4] || 0),
      barcode: cells[5] || undefined,
      discountRate: Number(cells[6] || 0),
    }))
    .filter((row) => row.name && row.price >= 0 && row.stock >= 0);
}

export function MerchantProductsScreen() {
  const accessToken = useMerchantAuthStore((state) => state.accessToken);
  const profile = useMerchantAuthStore((state) => state.profile);
  const navigation = useMerchantNavigation();
  const language = useMerchantUiStore((state) => state.language);
  const [products, setProducts] = useState<MerchantProduct[]>([]);
  const [pricingHints, setPricingHints] = useState<PricingHint[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState<"LATEST" | "STOCK_LOW" | "PRICE_HIGH" | "NAME">("LATEST");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM);
  const [features, setFeatures] = useState(DEFAULT_FEATURES);
  const [pricingSafety, setPricingSafety] = useState(DEFAULT_SAFETY);
  const [visibleCount, setVisibleCount] = useState<number>(10);
  const [activeSummary, setActiveSummary] = useState<"ALL" | "LOW_STOCK" | "BELOW_COST" | null>(null);
  const [bulkInput, setBulkInput] = useState("");
  const [isBulkImporting, setIsBulkImporting] = useState(false);
  const [isPickingFile, setIsPickingFile] = useState(false);
  const [printPreset, setPrintPreset] = useState<(typeof PRINT_PRESETS)[number]>("LABEL_40_30");

  const copy = language === "bn"
    ? {
        title: "à¦ªà¦£à§à¦¯",
        subtitle: "à¦¸à¦¹à¦œ à¦¸à¦¾à¦°à§à¦š, à¦à¦¡à¦¿à¦Ÿ, à¦¡à¦¿à¦²à¦¿à¦Ÿ à¦à¦¬à¦‚ à¦Ÿà§à¦¯à¦¾à¦— à¦ªà§à¦°à¦¿à¦¨à§à¦Ÿ",
        refresh: "à¦°à¦¿à¦«à§à¦°à§‡à¦¶",
        openPos: "POS à¦–à§à¦²à§à¦¨",
        searchPlaceholder: "à¦¨à¦¾à¦®, à¦•à§à¦¯à¦¾à¦Ÿà¦¾à¦—à¦°à¦¿ à¦¬à¦¾ à¦¬à¦¾à¦°à¦•à§‹à¦¡ à¦¦à¦¿à§Ÿà§‡ à¦¸à¦¾à¦°à§à¦š à¦•à¦°à§à¦¨",
        products: "à¦ªà¦£à§à¦¯",
        lowStock: "à¦²à§‹ à¦¸à§à¦Ÿà¦•",
        belowCost: "à¦•à§à¦°à§Ÿà¦®à§‚à¦²à§à¦¯à§‡à¦° à¦¨à¦¿à¦šà§‡",
        tapInspect: "à¦Ÿà§à¦¯à¦¾à¦ª à¦•à¦°à§‡ à¦¦à§‡à¦–à§à¦¨",
        show: "à¦¦à§‡à¦–à¦¾à¦¨",
        aiHint: "à¦à¦†à¦‡ à¦ªà¦£à§à¦¯à§‡à¦° à¦ªà¦°à¦¾à¦®à¦°à§à¦¶",
        addProduct: "à¦¨à¦¤à§à¦¨ à¦ªà¦£à§à¦¯ à¦¯à§‹à¦— à¦•à¦°à§à¦¨",
        updateProduct: "à¦ªà¦£à§à¦¯ à¦†à¦ªà¦¡à§‡à¦Ÿ à¦•à¦°à§à¦¨",
        nameLabel: "à¦ªà¦£à§à¦¯à§‡à¦° à¦¨à¦¾à¦®",
        categoryLabel: "à¦•à§à¦¯à¦¾à¦Ÿà¦¾à¦—à¦°à¦¿",
        barcodeLabel: "à¦¬à¦¾à¦°à¦•à§‹à¦¡ / SKU",
        priceLabel: "à¦¬à¦¿à¦•à§à¦°à§Ÿà¦®à§‚à¦²à§à¦¯",
        costLabel: "à¦•à§à¦°à§Ÿà¦®à§‚à¦²à§à¦¯",
        stockLabel: "à¦¸à§à¦Ÿà¦• à¦ªà¦°à¦¿à¦®à¦¾à¦£",
        imageLabel: "à¦›à¦¬à¦¿à¦° à¦²à¦¿à¦‚à¦•",
        discountLabel: "à¦¡à¦¿à¦¸à¦•à¦¾à¦‰à¦¨à§à¦Ÿ %",
        create: "à¦ªà¦£à§à¦¯ à¦¤à§ˆà¦°à¦¿ à¦•à¦°à§à¦¨",
        save: "à¦†à¦ªà¦¡à§‡à¦Ÿ à¦¸à§‡à¦­ à¦•à¦°à§à¦¨",
        cancel: "à¦¬à¦¾à¦¤à¦¿à¦²",
        delete: "à¦¡à¦¿à¦²à¦¿à¦Ÿ",
        shareTag: "à¦Ÿà§à¦¯à¦¾à¦— à¦¶à§‡à§Ÿà¦¾à¦°",
        print: "à¦ªà§à¦°à¦¿à¦¨à§à¦Ÿ",
        view: "à¦¦à§‡à¦–à§à¦¨",
        edit: "à¦à¦¡à¦¿à¦Ÿ",
        printSetup: "à¦ªà§à¦°à¦¿à¦¨à§à¦Ÿ à¦¸à§‡à¦Ÿà¦†à¦ª",
        bulkTitle: "Excel à¦¬à¦¾ CSV à¦¦à¦¿à§Ÿà§‡ bulk import",
        bulkHelper: "Excel à¦¬à¦¾ CSV sheet à¦¥à§‡à¦•à§‡ rows upload à¦¬à¦¾ paste à¦•à¦°à§à¦¨à¥¤ à¦«à¦°à¦®à§à¦¯à¦¾à¦Ÿ: name, category, price, costPrice, stock, barcode, discountRate",
        bulkPlaceholder: "name\tcategory\tprice\tcostPrice\tstock\tbarcode\tdiscountRate",
        import: "à¦ªà§‡à¦¸à§à¦Ÿ à¦•à¦°à¦¾ rows import à¦•à¦°à§à¦¨",
        importing: "à¦‡à¦®à¦ªà§‹à¦°à§à¦Ÿ à¦¹à¦šà§à¦›à§‡...",
        sample: "à¦¸à§à¦¯à¦¾à¦®à§à¦ªà¦² à¦¬à¦¸à¦¾à¦¨",
        summaryTable: "à¦¸à¦¾à¦°à¦¸à¦‚à¦•à§à¦·à§‡à¦ª à¦Ÿà§‡à¦¬à¦¿à¦²",
        close: "à¦¬à¦¨à§à¦§",
        noProducts: "à¦¬à§à¦¯à¦¾à¦•à¦à¦¨à§à¦¡ à¦¥à§‡à¦•à§‡ à¦•à§‹à¦¨à§‹ live à¦ªà¦£à§à¦¯ à¦ªà¦¾à¦“à§Ÿà¦¾ à¦¯à¦¾à§Ÿà¦¨à¦¿à¥¤",
        summaryEmpty: "à¦à¦‡ summary filter-à¦ à¦•à§‹à¦¨à§‹ à¦ªà¦£à§à¦¯ à¦¨à§‡à¦‡à¥¤",
      }
    : {
        title: "Products",
        subtitle: "Simple search, edit, delete, and tag print",
        refresh: "Refresh",
        openPos: "Open POS",
        searchPlaceholder: "Search by name, category, or barcode",
        products: "Products",
        lowStock: "Low stock",
        belowCost: "Below cost",
        tapInspect: "Tap to inspect",
        show: "Show",
        aiHint: "AI product hint",
        addProduct: "Add product",
        updateProduct: "Update product",
        nameLabel: "Product name",
        categoryLabel: "Category",
        barcodeLabel: "Barcode / SKU",
        priceLabel: "Selling price",
        costLabel: "Cost price",
        stockLabel: "Stock quantity",
        imageLabel: "Image URL",
        discountLabel: "Discount %",
        create: "Create product",
        save: "Save update",
        cancel: "Cancel",
        delete: "Delete",
        shareTag: "Share tag",
        print: "Print",
        view: "View",
        edit: "Edit",
        printSetup: "Print setup",
        bulkTitle: "Bulk import from Excel",
        bulkHelper: "Copy rows from Excel and paste here. Format: name, category, price, costPrice, stock, barcode, discountRate",
        bulkPlaceholder: "name\tcategory\tprice\tcostPrice\tstock\tbarcode\tdiscountRate",
        import: "Import pasted rows",
        importing: "Importing...",
        sample: "Paste sample",
        summaryTable: "Summary table",
        close: "Close",
        noProducts: "No live products returned from the backend.",
        summaryEmpty: "No products in this summary filter.",
      };

  const loadProducts = useCallback(async (query?: string) => {
    if (!profile?.shopId) {
      setProducts([]);
      setStatus(null);
      setError("Merchant shop is not ready yet.");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const [response, pricingResponse, settingsResponse] = await Promise.all([
        query && query.trim() ? searchMerchantProductsRequest(profile.shopId, query.trim()) : getMerchantProductsRequest(profile.shopId),
        accessToken ? getMerchantPricingInsightsRequest(accessToken) : Promise.resolve({ data: [] }),
        accessToken ? getMerchantShopSettingsRequest(accessToken) : Promise.resolve({ data: { merchantFeatures: DEFAULT_FEATURES, pricingSafety: DEFAULT_SAFETY } }),
      ]);
      const rows = (response.data || []).map((item) => ({
        id: String(item._id || item.id || ""),
        name: String(item.name || "Product"),
        stock: Math.max(0, Number(item.stock || 0)),
        price: Number(item.price || 0),
        costPrice: Number(item.costPrice || 0),
        discountRate: Number(item.discountRate || 0),
        category: String(item.category || "General"),
        barcode: String(item.barcode || ""),
        imageUrl: String(item.imageUrl || ""),
      })).filter((item) => item.id);
      const nextHints = (pricingResponse.data || []).map((item) => ({
        product: String(item.product || "Product"),
        suggestion: Number(item.suggestion || 0),
        yourPrice: Number(item.yourPrice || 0),
        inventory: Number(item.inventory || 0),
        velocity: String(item.velocity || "steady"),
      }));
      setProducts(rows);
      setPricingHints(nextHints);
      setFeatures({ ...DEFAULT_FEATURES, ...(settingsResponse.data?.merchantFeatures || {}) });
      setPricingSafety({ ...DEFAULT_SAFETY, ...(settingsResponse.data?.pricingSafety || {}) });
      setStatus(`${rows.length} products loaded.`);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load merchant products.");
      setProducts([]);
      setPricingHints([]);
      setStatus(null);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, profile?.shopId]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  const topHint = useMemo(() => pricingHints.find((item) => item.inventory <= 5 || item.suggestion !== item.yourPrice) || null, [pricingHints]);
  const previewFinalPrice = getFinalPrice(toNumber(form.price), toNumber(form.discountRate));
  const previewSafety = getSafetyBand(previewFinalPrice, toNumber(form.costPrice), pricingSafety);
  const sortedProducts = useMemo(() => {
    const rows = [...products];
    rows.sort((a, b) => {
      if (sortMode === "STOCK_LOW") return a.stock - b.stock;
      if (sortMode === "PRICE_HIGH") return b.price - a.price;
      if (sortMode === "NAME") return a.name.localeCompare(b.name);
      return 0;
    });
    return rows;
  }, [products, sortMode]);
  const stockRiskCount = useMemo(() => products.filter((item) => item.stock <= 5).length, [products]);
  const belowCostCount = useMemo(() => products.filter((item) => getFinalPrice(item.price, item.discountRate) < item.costPrice && item.costPrice > 0).length, [products]);
  const summaryRows = useMemo(() => {
    if (activeSummary === "LOW_STOCK") return sortedProducts.filter((item) => item.stock <= 5);
    if (activeSummary === "BELOW_COST") return sortedProducts.filter((item) => getFinalPrice(item.price, item.discountRate) < item.costPrice && item.costPrice > 0);
    if (activeSummary === "ALL") return sortedProducts;
    return [];
  }, [activeSummary, sortedProducts]);

  async function handleSubmit() {
    if (!accessToken) {
      setError("Merchant session missing. Please sign in again.");
      return;
    }
    if (!form.name.trim()) {
      setError(language === "bn" ? "à¦ªà¦£à§à¦¯à§‡à¦° à¦¨à¦¾à¦® à¦¦à¦¿à¦¤à§‡ à¦¹à¦¬à§‡à¥¤" : "Product name is required.");
      return;
    }

    const payload = {
      name: form.name.trim(),
      category: form.category.trim() || "General",
      price: toNumber(form.price),
      costPrice: toNumber(form.costPrice),
      stock: toNumber(form.stock),
      barcode: form.barcode.trim() || undefined,
      imageUrl: form.imageUrl.trim() || undefined,
      discountRate: toNumber(form.discountRate),
    };

    setError(null);
    try {
      if (editingId) {
        await updateMerchantProductRequest(accessToken, editingId, payload);
        setStatus(`${form.name.trim()} updated.`);
      } else {
        await createMerchantProductRequest(accessToken, payload);
        setStatus(`${form.name.trim()} created.`);
      }
      setEditingId(null);
      setForm(EMPTY_FORM);
      await loadProducts(searchQuery);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to save product.");
    }
  }

  async function handleDeleteProduct(product: MerchantProduct) {
    if (!accessToken) return;
    try {
      await deleteMerchantProductRequest(accessToken, product.id);
      if (editingId === product.id) {
        setEditingId(null);
        setForm(EMPTY_FORM);
      }
      setStatus(`${product.name} archived.`);
      await loadProducts(searchQuery);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to archive product.");
    }
  }

  function confirmDeleteProduct(product: MerchantProduct) {
    Alert.alert(
      language === "bn" ? "à¦ªà¦£à§à¦¯ à¦¡à¦¿à¦²à¦¿à¦Ÿ" : "Delete product",
      language === "bn" ? `${product.name} à¦†à¦°à§à¦•à¦¾à¦‡à¦­ à¦•à¦°à¦¬à§‡à¦¨?` : `Archive ${product.name}?`,
      [
        { text: language === "bn" ? "à¦¬à¦¾à¦¤à¦¿à¦²" : "Cancel", style: "cancel" },
        { text: language === "bn" ? "à¦¡à¦¿à¦²à¦¿à¦Ÿ" : "Delete", style: "destructive", onPress: () => void handleDeleteProduct(product) },
      ],
    );
  }

  async function handleShareTag(product: MerchantProduct) {
    const finalPrice = getFinalPrice(product.price, product.discountRate);
    const payload = `dokanx://product/${encodeURIComponent(product.id)}?name=${encodeURIComponent(product.name)}&price=${encodeURIComponent(String(finalPrice))}&barcode=${encodeURIComponent(product.barcode || product.id)}`;
    await Share.share({
      title: `${product.name} tag`,
      message: `${copy.printSetup}: ${printPreset}\n${product.name}\nPrice: ${finalPrice} BDT\nBarcode: ${product.barcode || product.id}\nScan: ${payload}`,
    });
  }

  async function handlePrintTag(product: MerchantProduct) {
    const finalPrice = getFinalPrice(product.price, product.discountRate);
    const payload = `dokanx://product/${encodeURIComponent(product.id)}?name=${encodeURIComponent(product.name)}&price=${encodeURIComponent(String(finalPrice))}&barcode=${encodeURIComponent(product.barcode || product.id)}`;
    const html = `
      <html>
        <body style="font-family: Arial, sans-serif; padding: 12px; color: #111827;">
          <div style="border:1px solid #d1d5db; border-radius: 12px; padding: 12px; width: 260px;">
            <div style="font-size: 12px; color: #6b7280; margin-bottom: 6px;">${printPreset}</div>
            <div style="font-size: 16px; font-weight: 700; margin-bottom: 6px;">${product.name}</div>
            <div style="font-size: 13px; margin-bottom: 4px;">Price: ${finalPrice} BDT</div>
            <div style="font-size: 12px; margin-bottom: 4px;">Barcode: ${product.barcode || product.id}</div>
            <div style="font-size: 11px; color: #475569; word-break: break-word;">Scan: ${payload}</div>
          </div>
        </body>
      </html>`;
    try {
      await RNPrint.print({ html, jobName: `${product.name} tag` });
      setStatus(`${product.name} tag sent to printer.`);
      setError(null);
    } catch {
      await Share.share({
        title: `${product.name} tag`,
        message: `${copy.printSetup}: ${printPreset}\n${product.name}\nPrice: ${finalPrice} BDT\nBarcode: ${product.barcode || product.id}\nScan: ${payload}`,
      });
      setStatus(`${product.name} tag opened in share options.`);
      setError(null);
    }
  }

  async function handlePickImportFile() {
    if (!accessToken) {
      setError("Merchant session missing. Please sign in again.");
      return;
    }

    try {
      setIsPickingFile(true);
      setError(null);
      const file = await DocumentPicker.pickSingle({
        type: [DocumentPicker.types.csv, DocumentPicker.types.xls, DocumentPicker.types.xlsx, DocumentPicker.types.plainText],
        copyTo: "cachesDirectory",
      });
      const targetUri = file.fileCopyUri || file.uri;
      const lowerName = String(file.name || "").toLowerCase();
      const rows = lowerName.endsWith(".csv") || lowerName.endsWith(".txt")
        ? parseBulkProductRows(await loadUriAsText(targetUri))
        : parseWorkbookRows(await loadUriAsArrayBuffer(targetUri));
      if (!rows.length) {
        setError("No valid product rows were found in the selected file.");
        return;
      }
      const bulkResponse = await createMerchantProductsBulkRequest(accessToken, rows);
      const createdCount = Number(bulkResponse.createdCount || bulkResponse.data?.length || 0);
      const failedCount = Number(bulkResponse.failedCount || bulkResponse.errors?.length || 0);
      setStatus(failedCount ? `${createdCount} rows imported from file, ${failedCount} failed.` : `${createdCount} rows imported from file.`);
      await loadProducts(searchQuery);
    } catch (pickerError) {
      if (DocumentPicker.isCancel(pickerError)) {
        return;
      }
      setError(pickerError instanceof Error ? pickerError.message : "Unable to import this file.");
    } finally {
      setIsPickingFile(false);
    }
  }

  async function handleBulkImport() {
    if (!accessToken) {
      setError("Merchant session missing. Please sign in again.");
      return;
    }

    const rows = parseBulkProductRows(bulkInput);
    if (!rows.length) {
      setError(language === "bn" ? "??? Excel rows ????? ?????" : "Paste Excel rows first.");
      return;
    }

    setIsBulkImporting(true);
    setError(null);
    try {
      const response = await createMerchantProductsBulkRequest(accessToken, rows);
      const createdCount = Number(response.createdCount || response.data?.length || 0);
      const failedCount = Number(response.failedCount || response.errors?.length || 0);
      setBulkInput("");
      setStatus(failedCount ? `${createdCount} rows imported, ${failedCount} failed.` : `${createdCount} rows imported.`);
      await loadProducts(searchQuery);
    } catch (bulkError) {
      setError(bulkError instanceof Error ? bulkError.message : "Unable to import product rows.");
    } finally {
      setIsBulkImporting(false);
    }
  }

  function startEdit(product: MerchantProduct) {
    setEditingId(product.id);
    setForm({
      name: product.name,
      category: product.category,
      price: String(product.price),
      costPrice: String(product.costPrice),
      stock: String(product.stock),
      barcode: product.barcode,
      imageUrl: product.imageUrl,
      discountRate: String(product.discountRate),
    });
    setStatus(`${product.name} ready to edit.`);
  }

  return (
    <View style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <MerchantTopNav active="Products" />
        <View style={styles.hero}>
          <Text style={styles.title}>{copy.title}</Text>
          <Text style={styles.subtitle}>{copy.subtitle}</Text>
          <View style={styles.heroActions}>
            <View style={styles.heroButtonRow}>
              <Pressable style={styles.refreshButton} onPress={() => void loadProducts(searchQuery)}>
                <Text style={styles.refreshButtonText}>{isLoading ? `${copy.refresh}...` : copy.refresh}</Text>
              </Pressable>
              <Pressable style={styles.posButton} onPress={() => navigation.navigate("MerchantPos")}>
                <Text style={styles.posButtonText}>{copy.openPos}</Text>
              </Pressable>
            </View>
            {features.productSearchEnabled ? (
              <TextInput style={[styles.input, styles.searchInput]} value={searchQuery} onChangeText={setSearchQuery} onSubmitEditing={() => void loadProducts(searchQuery)} placeholder={copy.searchPlaceholder} placeholderTextColor="#6b7280" />
            ) : null}
          </View>
        </View>

        <View style={styles.summaryRow}>
          <Pressable style={styles.summaryCard} onPress={() => setActiveSummary((current) => current === "ALL" ? null : "ALL")}><Text style={styles.summaryLabel}>{copy.products}</Text><Text style={styles.summaryValue}>{products.length}</Text><Text style={styles.summaryMeta}>{copy.tapInspect}</Text></Pressable>
          <Pressable style={styles.summaryCard} onPress={() => setActiveSummary((current) => current === "LOW_STOCK" ? null : "LOW_STOCK")}><Text style={styles.summaryLabel}>{copy.lowStock}</Text><Text style={styles.summaryValue}>{stockRiskCount}</Text><Text style={styles.summaryMeta}>{copy.tapInspect}</Text></Pressable>
          <Pressable style={styles.summaryCard} onPress={() => setActiveSummary((current) => current === "BELOW_COST" ? null : "BELOW_COST")}><Text style={styles.summaryLabel}>{copy.belowCost}</Text><Text style={styles.summaryValue}>{belowCostCount}</Text><Text style={styles.summaryMeta}>{copy.tapInspect}</Text></Pressable>
        </View>

        <View style={styles.visibleRow}>
          <Text style={styles.visibleLabel}>{copy.show}</Text>
          {[5, 10, 20].map((count) => (
            <Pressable key={count} style={[styles.sortPill, visibleCount === count ? styles.sortPillActive : null]} onPress={() => setVisibleCount(count)}>
              <Text style={[styles.sortText, visibleCount === count ? styles.sortTextActive : null]}>{count}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.sortRow}>
          {(["LATEST", "STOCK_LOW", "PRICE_HIGH", "NAME"] as const).map((item) => (
            <Pressable key={item} style={[styles.sortPill, sortMode === item ? styles.sortPillActive : null]} onPress={() => setSortMode(item)}>
              <Text style={[styles.sortText, sortMode === item ? styles.sortTextActive : null]}>{item}</Text>
            </Pressable>
          ))}
        </View>

        {topHint ? (
          <View style={styles.aiCard}>
            <Text style={styles.aiTitle}>{copy.aiHint}</Text>
            <Text style={styles.aiBody}>{topHint.product}: {topHint.yourPrice} BDT to {topHint.suggestion} BDT | Stock {topHint.inventory}</Text>
            <Text style={styles.aiMeta}>{topHint.velocity.toUpperCase()}</Text>
          </View>
        ) : null}

        <View style={styles.formCard}>
          <Text style={styles.formTitle}>{editingId ? copy.updateProduct : copy.addProduct}</Text>
          <Text style={styles.fieldLabel}>{copy.nameLabel}</Text>
          <TextInput style={styles.input} value={form.name} onChangeText={(value) => setForm((current) => ({ ...current, name: value }))} placeholder={copy.nameLabel} placeholderTextColor="#6b7280" />
          <Text style={styles.fieldLabel}>{copy.categoryLabel}</Text>
          <TextInput style={styles.input} value={form.category} onChangeText={(value) => setForm((current) => ({ ...current, category: value }))} placeholder={copy.categoryLabel} placeholderTextColor="#6b7280" />
          <View style={styles.categoryRow}>
            {CATEGORY_OPTIONS.map((item) => (
              <Pressable key={item} style={[styles.categoryChip, form.category === item ? styles.categoryChipActive : null]} onPress={() => setForm((current) => ({ ...current, category: item }))}>
                <Text style={[styles.categoryChipText, form.category === item ? styles.categoryChipTextActive : null]}>{item}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.fieldLabel}>{copy.barcodeLabel}</Text>
          <TextInput style={styles.input} value={form.barcode} onChangeText={(value) => setForm((current) => ({ ...current, barcode: value }))} placeholder={copy.barcodeLabel} placeholderTextColor="#6b7280" />
          <Text style={styles.fieldLabel}>{copy.priceLabel}</Text>
          <TextInput style={styles.input} value={form.price} onChangeText={(value) => setForm((current) => ({ ...current, price: value }))} placeholder={copy.priceLabel} keyboardType="numeric" placeholderTextColor="#6b7280" />
          <Text style={styles.fieldLabel}>{copy.costLabel}</Text>
          <TextInput style={styles.input} value={form.costPrice} onChangeText={(value) => setForm((current) => ({ ...current, costPrice: value }))} placeholder={copy.costLabel} keyboardType="numeric" placeholderTextColor="#6b7280" />
          <Text style={styles.fieldLabel}>{copy.stockLabel}</Text>
          <TextInput style={styles.input} value={form.stock} onChangeText={(value) => setForm((current) => ({ ...current, stock: value }))} placeholder={copy.stockLabel} keyboardType="numeric" placeholderTextColor="#6b7280" />
          <Text style={styles.fieldLabel}>{copy.imageLabel}</Text>
          <TextInput style={styles.input} value={form.imageUrl} onChangeText={(value) => setForm((current) => ({ ...current, imageUrl: value }))} placeholder={copy.imageLabel} placeholderTextColor="#6b7280" autoCapitalize="none" />
          {features.discountToolsEnabled ? (
            <>
              <Text style={styles.fieldLabel}>{copy.discountLabel}</Text>
              <TextInput style={styles.input} value={form.discountRate} onChangeText={(value) => setForm((current) => ({ ...current, discountRate: value }))} placeholder={copy.discountLabel} keyboardType="numeric" placeholderTextColor="#6b7280" />
            </>
          ) : null}
          {form.imageUrl ? <Image source={{ uri: form.imageUrl }} style={styles.formImagePreview} /> : null}
          <View style={[styles.previewCard, { backgroundColor: previewSafety.background }]}>
            <View style={[styles.dot, { backgroundColor: previewSafety.dot }]} />
            <View style={styles.previewTextWrap}>
              <Text style={[styles.previewTitle, { color: previewSafety.color }]}>Final {previewFinalPrice} BDT | {previewSafety.label}</Text>
              <Text style={styles.previewMeta}>Margin {previewSafety.marginPct == null ? "n/a" : `${previewSafety.marginPct}%`} against cost price.</Text>
            </View>
          </View>
          <View style={styles.visibleRow}>
            <Text style={styles.visibleLabel}>{copy.printSetup}</Text>
            {PRINT_PRESETS.map((preset) => (
              <Pressable key={preset} style={[styles.sortPill, printPreset === preset ? styles.sortPillActive : null]} onPress={() => setPrintPreset(preset)}>
                <Text style={[styles.sortText, printPreset === preset ? styles.sortTextActive : null]}>{preset}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.formActions}>
            <Pressable style={styles.primaryButton} onPress={() => void handleSubmit()}><Text style={styles.primaryButtonText}>{editingId ? copy.save : copy.create}</Text></Pressable>
            {editingId ? <Pressable style={styles.secondaryButton} onPress={() => { setEditingId(null); setForm(EMPTY_FORM); }}><Text style={styles.secondaryButtonText}>{copy.cancel}</Text></Pressable> : null}
          </View>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.formTitle}>{copy.bulkTitle}</Text>
          <Text style={styles.helperText}>{copy.bulkHelper}</Text>
          <TextInput style={[styles.input, styles.bulkInput]} value={bulkInput} onChangeText={setBulkInput} placeholder={copy.bulkPlaceholder} placeholderTextColor="#6b7280" multiline textAlignVertical="top" />
          <View style={styles.formActions}>
            <Pressable style={styles.primaryButton} onPress={() => void handleBulkImport()}><Text style={styles.primaryButtonText}>{isBulkImporting ? copy.importing : copy.import}</Text></Pressable>
            <Pressable style={styles.secondaryButton} onPress={() => void handlePickImportFile()}><Text style={styles.secondaryButtonText}>{isPickingFile ? (language === "bn" ? "à¦«à¦¾à¦‡à¦² à¦–à§‹à¦²à¦¾ à¦¹à¦šà§à¦›à§‡..." : "Opening file...") : (language === "bn" ? "à¦«à¦¾à¦‡à¦² à¦†à¦ªà¦²à§‹à¦¡" : "Upload file")}</Text></Pressable>
            <Pressable style={styles.secondaryButton} onPress={() => setBulkInput("name\tcategory\tprice\tcostPrice\tstock\tbarcode\tdiscountRate\nMilk\tDairy\t95\t75\t20\tDX1001\t0")}><Text style={styles.secondaryButtonText}>{copy.sample}</Text></Pressable>
          </View>
        </View>

        {error ? <View style={styles.alertError}><Text style={styles.alertTitle}>Product action unavailable</Text><Text style={styles.alertBody}>{error}</Text></View> : null}
        {status ? <View style={styles.alertInfo}><Text style={styles.alertBody}>{status}</Text></View> : null}

        {activeSummary ? (
          <View style={styles.tableCard}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.formTitle}>{copy.summaryTable}</Text>
              <Pressable style={styles.secondaryButton} onPress={() => setActiveSummary(null)}><Text style={styles.secondaryButtonText}>{copy.close}</Text></Pressable>
            </View>
            {summaryRows.map((item) => (
              <View key={`summary-${item.id}`} style={styles.tableRow}>
                <View style={styles.leftBlock}>
                  <Text style={styles.cardTitle}>{item.name}</Text>
                  <Text style={styles.cardSubtitle}>{item.category}{item.barcode ? ` | ${item.barcode}` : ""}</Text>
                </View>
                <View style={styles.tableActions}>
                  <Pressable style={styles.editButton} onPress={() => setStatus(`${item.name} ready to view.`)}><Text style={styles.editButtonText}>{copy.view}</Text></Pressable>
                  <Pressable style={styles.editButton} onPress={() => startEdit(item)}><Text style={styles.editButtonText}>{copy.edit}</Text></Pressable>
                  <Pressable style={styles.editButton} onPress={() => void handlePrintTag(item)}><Text style={styles.editButtonText}>{copy.print}</Text></Pressable>
                </View>
              </View>
            ))}
            {!summaryRows.length ? <Text style={styles.emptyText}>{copy.summaryEmpty}</Text> : null}
          </View>
        ) : null}

        {sortedProducts.slice(0, visibleCount).map((item) => {
          const finalPrice = getFinalPrice(item.price, item.discountRate);
          const safety = getSafetyBand(finalPrice, item.costPrice, pricingSafety);
          return (
            <View key={item.id} style={styles.card}>
              {item.imageUrl ? <Image source={{ uri: item.imageUrl }} style={styles.cardImage} /> : null}
              <View style={styles.leftBlock}>
                <View style={styles.titleRow}>
                  <View style={[styles.dot, { backgroundColor: safety.dot }]} />
                  <Text style={styles.cardTitle}>{item.name}</Text>
                </View>
                <Text style={styles.cardSubtitle}>{item.category}{item.barcode ? ` | ${item.barcode}` : ""}</Text>
                <Text style={styles.metaLine}>Cost {item.costPrice} | Sale {item.price} | Final {finalPrice} BDT</Text>
                {features.pricingSafetyEnabled ? <Text style={[styles.safetyBadge, { color: safety.color, backgroundColor: safety.background }]}>{safety.label}{safety.marginPct == null ? "" : ` | ${safety.marginPct}%`}</Text> : null}
              </View>
              <View style={styles.rightBlock}>
                <Text style={styles.price}>{item.price} BDT</Text>
                <Text style={item.stock <= 5 ? styles.stockRisk : styles.stock}>{item.stock} in stock</Text>
                {features.discountToolsEnabled ? <Text style={styles.discountText}>Discount {item.discountRate}%</Text> : null}
                <Pressable style={styles.editButton} onPress={() => void handleShareTag(item)}><Text style={styles.editButtonText}>{copy.shareTag}</Text></Pressable>
                <Pressable style={styles.editButton} onPress={() => startEdit(item)}><Text style={styles.editButtonText}>{copy.edit}</Text></Pressable>
                <Pressable style={styles.deleteButton} onPress={() => confirmDeleteProduct(item)}><Text style={styles.deleteButtonText}>{copy.delete}</Text></Pressable>
              </View>
            </View>
          );
        })}

        {!products.length && !error ? <Text style={styles.emptyText}>{copy.noProducts}</Text> : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f8f4ef" },
  container: { padding: 16, gap: 12, paddingBottom: 118 },
  hero: { backgroundColor: "#111827", borderRadius: 18, padding: 16, gap: 10 },
  title: { fontSize: 22, fontWeight: "700", color: "#ffffff" },
  subtitle: { fontSize: 12, color: "#d1d5db" },
  heroActions: { gap: 10 },
  heroButtonRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  refreshButton: { alignSelf: "flex-start", borderRadius: 999, borderWidth: 1, borderColor: "#374151", paddingHorizontal: 12, paddingVertical: 8, backgroundColor: "#182230" },
  refreshButtonText: { fontSize: 12, fontWeight: "700", color: "#ffffff" },
  posButton: { alignSelf: "flex-start", borderRadius: 999, borderWidth: 1, borderColor: "#fbbf24", paddingHorizontal: 12, paddingVertical: 8, backgroundColor: "#fbbf24" },
  posButtonText: { fontSize: 12, fontWeight: "700", color: "#111827" },
  summaryRow: { flexDirection: "row", gap: 8 },
  summaryCard: { flex: 1, backgroundColor: "#ffffff", borderRadius: 14, padding: 12, borderWidth: 1, borderColor: "#e5e7eb", gap: 4 },
  summaryLabel: { fontSize: 11, color: "#6b7280", textTransform: "uppercase" },
  summaryValue: { fontSize: 18, fontWeight: "800", color: "#111827" },
  summaryMeta: { fontSize: 11, color: "#9a3412" },
  sortRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  visibleRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" },
  visibleLabel: { fontSize: 12, fontWeight: "700", color: "#6b7280" },
  sortPill: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: "#d1d5db", backgroundColor: "#ffffff" },
  sortPillActive: { backgroundColor: "#111827", borderColor: "#111827" },
  sortText: { fontSize: 12, fontWeight: "600", color: "#111827" },
  sortTextActive: { color: "#ffffff" },
  aiCard: { backgroundColor: "#fff7ed", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: "#fed7aa", gap: 6 },
  aiTitle: { fontSize: 13, fontWeight: "700", color: "#9a3412" },
  aiBody: { fontSize: 12, color: "#7c2d12" },
  aiMeta: { fontSize: 11, color: "#9a3412" },
  helperText: { fontSize: 12, color: "#6b7280" },
  formCard: { backgroundColor: "#ffffff", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: "#e5e7eb", gap: 10 },
  tableCard: { backgroundColor: "#ffffff", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: "#e5e7eb", gap: 10 },
  sectionHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  formTitle: { fontSize: 14, fontWeight: "700", color: "#111827" },
  fieldLabel: { fontSize: 12, fontWeight: "700", color: "#374151", marginBottom: -2 },
  input: { borderWidth: 1, borderColor: "#d1d5db", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: "#ffffff", color: "#111827" },
  searchInput: { backgroundColor: "#ffffff" },
  categoryRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  categoryChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: "#d1d5db", backgroundColor: "#ffffff" },
  categoryChipActive: { backgroundColor: "#111827", borderColor: "#111827" },
  categoryChipText: { fontSize: 12, fontWeight: "600", color: "#111827" },
  categoryChipTextActive: { color: "#ffffff" },
  formImagePreview: { width: "100%", height: 180, borderRadius: 12, backgroundColor: "#e5e7eb" },
  previewCard: { borderRadius: 12, padding: 12, flexDirection: "row", gap: 10, alignItems: "center" },
  previewTextWrap: { flex: 1, gap: 4 },
  previewTitle: { fontSize: 13, fontWeight: "700" },
  previewMeta: { fontSize: 11, color: "#475569" },
  formActions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  bulkInput: { minHeight: 132, textAlignVertical: "top" },
  primaryButton: { backgroundColor: "#111827", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  primaryButtonText: { color: "#ffffff", fontSize: 12, fontWeight: "600" },
  secondaryButton: { backgroundColor: "#fff7ed", borderRadius: 10, borderWidth: 1, borderColor: "#fed7aa", paddingHorizontal: 12, paddingVertical: 10 },
  secondaryButtonText: { color: "#9a3412", fontSize: 12, fontWeight: "600" },
  deleteButton: { backgroundColor: "#fef2f2", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: "#fecaca" },
  deleteButtonText: { fontSize: 11, fontWeight: "700", color: "#991b1b" },
  alertError: { backgroundColor: "#fef2f2", borderColor: "#fecaca", borderWidth: 1, borderRadius: 14, padding: 14, gap: 6 },
  alertInfo: { backgroundColor: "#eff6ff", borderColor: "#bfdbfe", borderWidth: 1, borderRadius: 14, padding: 14 },
  alertTitle: { fontSize: 13, fontWeight: "700", color: "#991b1b" },
  alertBody: { fontSize: 12, color: "#374151" },
  card: { backgroundColor: "#ffffff", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: "#e5e7eb", flexDirection: "row", justifyContent: "space-between", gap: 12 },
  tableRow: { flexDirection: "row", justifyContent: "space-between", gap: 12, borderBottomWidth: 1, borderBottomColor: "#f3f4f6", paddingBottom: 10, marginBottom: 10 },
  tableActions: { alignItems: "flex-end", gap: 6 },
  cardImage: { width: 72, height: 72, borderRadius: 12, backgroundColor: "#e5e7eb" },
  leftBlock: { flex: 1, gap: 5 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardTitle: { fontSize: 15, fontWeight: "600", color: "#111827", flexShrink: 1 },
  cardSubtitle: { fontSize: 12, color: "#6b7280" },
  metaLine: { fontSize: 12, color: "#475569" },
  safetyBadge: { alignSelf: "flex-start", fontSize: 11, fontWeight: "700", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, overflow: "hidden" },
  rightBlock: { alignItems: "flex-end", gap: 4 },
  price: { fontSize: 14, fontWeight: "700", color: "#111827" },
  stock: { fontSize: 12, color: "#166534" },
  stockRisk: { fontSize: 12, color: "#b45309", fontWeight: "700" },
  discountText: { fontSize: 11, color: "#9a3412", fontWeight: "700" },
  editButton: { backgroundColor: "#fff7ed", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: "#fed7aa" },
  editButtonText: { fontSize: 11, fontWeight: "700", color: "#9a3412" },
  dot: { width: 10, height: 10, borderRadius: 999 },
  emptyText: { fontSize: 12, color: "#6b7280", textAlign: "center", paddingVertical: 20 },
});









