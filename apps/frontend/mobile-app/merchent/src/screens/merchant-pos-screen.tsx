import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Image, NativeEventEmitter, NativeModules, PermissionsAndroid, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View, Vibration } from "react-native";

import {
  MerchantFeatureSettings,
  MerchantPricingSafetySettings,
  createMerchantCreditSaleRequest,
  createMerchantCustomerRequest,
  createMerchantPosOrderRequest,
  getMerchantProductByBarcodeRequest,
  getMerchantProductsRequest,
  getMerchantNotificationSettingsRequest,
  updateMerchantNotificationSettingsRequest,
  getMerchantPrintCodesRequest,
  getMerchantShopSettingsRequest,
  initiateMerchantPaymentRequest,
  searchMerchantCustomersRequest,
  searchMerchantProductsRequest,
} from "../lib/api-client";
import { useMerchantNavigation } from "../navigation/merchant-navigation";
import { DokanXLogo } from "../components/dokanx-logo";
import { useMerchantAuthStore } from "../store/auth-store";
import { useMerchantPosStore } from "../store/pos-store";

type ProductRow = {
  id: string;
  name: string;
  price: number;
  costPrice: number;
  discountRate: number;
  stock: number;
  barcode: string;
  category: string;
};

type CartItem = {
  id: string;
  name: string;
  price: number;
  costPrice: number;
  quantity: number;
  manual: boolean;
  discountRate: number;
  barcode?: string;
};

type SplitMode = "CASH" | "ONLINE" | "WALLET" | "CREDIT";
type SplitBreakdown = Array<{ mode: SplitMode; amount: number }>;
type ReceiptPreset = "THERMAL_58" | "THERMAL_80" | "A4";

const DEFAULT_FEATURES: Required<MerchantFeatureSettings> = {
  posScannerEnabled: true,
  cameraScannerEnabled: true,
  bluetoothScannerEnabled: true,
  scannerFeedbackEnabled: true,
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

const DOKANX_MONO_LOGO_DATA_URI = "data:image/svg+xml;utf8,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%27220%27 height=%2772%27 viewBox=%270 0 220 72%27 fill=%27none%27%3E%3Cpath d=%27M10 26V54H34C45 54 54 46 54 36%27 stroke=%27%23111111%27 stroke-width=%275%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27/%3E%3Cpath d=%27M18 26V20C18 13 23 8 30 8C37 8 42 13 42 20V26%27 stroke=%27%23111111%27 stroke-width=%275%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27/%3E%3Cpath d=%27M18 44L29 32L38 41L56 20%27 stroke=%27%23111111%27 stroke-width=%275%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27/%3E%3Ctext x=%2774%27 y=%2750%27 fill=%27%23111111%27 font-family=%27Arial, Helvetica, sans-serif%27 font-size=%2734%27 font-weight=%27700%27%3EDokanX%3C/text%3E%3C/svg%3E";

function getPrintModule() {
  const printModule = require("react-native-print");
  return printModule.default ?? printModule;
}

function getQrCodeModule() {
  const qrModule = require("qrcode");
  return qrModule.default ?? qrModule;
}
function toNumber(value: string) {
  return Number(value || 0);
}

function getUnitPrice(basePrice: number, globalDiscountRate: number, itemDiscountRate: number) {
  return Number((basePrice * (1 - globalDiscountRate / 100) * (1 - itemDiscountRate / 100)).toFixed(2));
}

function buildCartAmount(item: CartItem, globalDiscountRate: number) {
  return getUnitPrice(item.price, globalDiscountRate, item.discountRate) * item.quantity;
}

function createQrPayload(customerId: string, amount: number) {
  const encodedCustomerId = encodeURIComponent(customerId || "walk-in");
  return `dokanx://merchant/collect?customerId=${encodedCustomerId}&amount=${amount}`;
}

function normalizeBarcodeValue(value: string) {
  return String(value || "").trim().replace(/\s+/g, "").toUpperCase();
}

function extractBarcodeCandidates(rawValue: string) {
  const raw = String(rawValue || "").trim();
  if (!raw) return [];

  const candidates = new Set<string>();
  candidates.add(raw);

  const normalized = normalizeBarcodeValue(raw);
  if (normalized) candidates.add(normalized);

  const barcodeMatch = raw.match(/[?&]barcode=([^&]+)/i);
  if (barcodeMatch?.[1]) {
    const decoded = decodeURIComponent(barcodeMatch[1]);
    candidates.add(decoded);
    candidates.add(normalizeBarcodeValue(decoded));
  }

  const trailingSegment = raw.split("/").pop();
  if (trailingSegment) {
    candidates.add(trailingSegment);
    candidates.add(normalizeBarcodeValue(trailingSegment));
  }

  return Array.from(candidates).filter(Boolean);
}
function getSafetyBand(finalPrice: number, costPrice: number, pricingSafety: Required<MerchantPricingSafetySettings>) {
  if (costPrice <= 0) {
    return { label: "No cost", dot: "#64748b", color: "#475569", background: "#f1f5f9", marginPct: null as number | null };
  }

  const marginPct = Number((((finalPrice - costPrice) / costPrice) * 100).toFixed(2));
  if (pricingSafety.redBelowCost && finalPrice < costPrice) {
    return { label: "Below cost", dot: "#dc2626", color: "#991b1b", background: "#fee2e2", marginPct };
  }
  if (marginPct >= Number(pricingSafety.greenMinMarginPct || 0)) {
    return { label: "Green", dot: "#16a34a", color: "#166534", background: "#dcfce7", marginPct };
  }
  if (marginPct >= Number(pricingSafety.limeMinMarginPct || 0)) {
    return { label: "Lime", dot: "#84cc16", color: "#3f6212", background: "#ecfccb", marginPct };
  }
  if (marginPct >= Number(pricingSafety.yellowMinMarginPct || 0)) {
    return { label: "Yellow", dot: "#eab308", color: "#854d0e", background: "#fef9c3", marginPct };
  }
  if (marginPct >= Number(pricingSafety.orangeMinMarginPct || 0)) {
    return { label: "Orange", dot: "#f97316", color: "#9a3412", background: "#ffedd5", marginPct };
  }
  return { label: "Red", dot: "#dc2626", color: "#991b1b", background: "#fee2e2", marginPct };
}

function buildReceiptText(orderId: string, cart: CartItem[], totalAmount: number, paymentMode: SplitMode, customerId: string, splitEnabled: boolean, splitBreakdown: SplitBreakdown) {
  const lines = [
    "DokanX Merchant Receipt",
    `Order: ${orderId}`,
    `Payment: ${splitEnabled ? "SPLIT" : paymentMode}`,
    customerId ? `Customer: ${customerId}` : "Customer: walk-in",
    "",
    ...cart.map((item) => `${item.name} x${item.quantity} - ${getUnitPrice(item.price, 0, item.discountRate)} BDT`),
    "",
  ];

  if (splitEnabled && splitBreakdown.length) {
    lines.push(...splitBreakdown.map((entry) => `${entry.mode}: ${entry.amount.toFixed(2)} BDT`), "");
  }

  lines.push(`Total: ${totalAmount.toFixed(2)} BDT`, `Share time: ${new Date().toLocaleString()}`);
  return lines.join("\n");
}
function buildReceiptHtml(options: {
  shopName: string;
  shopAddress: string;
  storefrontLink: string;
  receiptPreset: ReceiptPreset;
  orderId: string;
  customerLabel: string;
  paymentLabel: string;
  cart: CartItem[];
  totalAmount: number;
  splitEnabled: boolean;
  splitBreakdown: SplitBreakdown;
  qrDataUrl: string;
  barcodeDataUrl?: string;
  globalDiscountAmount?: number;
}) {
  const isA4 = options.receiptPreset === "A4";
  const isThermal80 = options.receiptPreset === "THERMAL_80";
  const pageWidth = isA4 ? "760px" : isThermal80 ? "302px" : "220px";
  const pageSize = isA4 ? "A4 portrait" : isThermal80 ? "80mm auto" : "58mm auto";
  const baseFont = isA4 ? 14 : 12;
  const qrSize = isA4 ? 92 : isThermal80 ? 72 : 56;
  const barcodeWidth = isA4 ? 170 : isThermal80 ? 136 : 112;
  const subtotalAmount = Number(options.cart.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2));
  const discountAmount = Number((options.globalDiscountAmount ?? Math.max(0, subtotalAmount - options.totalAmount)).toFixed(2));
  const rows = options.cart.map((item) => {
    const unitPrice = getUnitPrice(item.price, 0, item.discountRate);
    const lineTotal = buildCartAmount(item, 0);
    const discountText = item.discountRate > 0 ? `${item.discountRate}% off` : "No discount";
    return `
    <tr>
      <td style="padding:7px 0; border-bottom:1px dashed #e5e7eb; vertical-align:top;">
        <div style="font-weight:700; font-size:${baseFont}px;">${item.name}</div>
        <div style="font-size:10px; color:#6b7280; margin-top:3px;">Unit ${unitPrice.toFixed(2)} BDT | Qty ${item.quantity}</div>
        <div style="font-size:10px; color:#94a3b8; margin-top:2px;">${discountText}</div>
      </td>
      <td style="padding:7px 0; border-bottom:1px dashed #e5e7eb; text-align:right; vertical-align:top; font-weight:800; font-size:${baseFont}px;">${lineTotal.toFixed(2)}</td>
    </tr>`;
  }).join("");
  const splitRows = options.splitEnabled && options.splitBreakdown.length
    ? `<div style="margin-top:10px; padding-top:10px; border-top:1px dashed #d1d5db;">${options.splitBreakdown.map((entry) => `<div style="display:flex; justify-content:space-between; font-size:${baseFont}px; margin-bottom:4px;"><span>${entry.mode}</span><strong>${entry.amount.toFixed(2)} BDT</strong></div>`).join("")}</div>`
    : "";
  const codeBlock = isA4
    ? `<div style="display:flex; flex-direction:column; align-items:flex-end; gap:8px; min-width:${qrSize + 24}px;">${options.barcodeDataUrl ? `<img src="${options.barcodeDataUrl}" alt="Receipt barcode" style="width:${barcodeWidth}px; height:40px; object-fit:contain;" />` : ""}<img src="${options.qrDataUrl}" alt="Receipt QR" style="width:${qrSize}px; height:${qrSize}px; border-radius:10px;" /></div>`
    : `<div style="margin-top:12px; padding-top:10px; border-top:1px dashed #d1d5db; display:flex; flex-direction:column; align-items:center; gap:8px;">${options.barcodeDataUrl ? `<img src="${options.barcodeDataUrl}" alt="Receipt barcode" style="width:${barcodeWidth}px; height:36px; object-fit:contain;" />` : ""}<img src="${options.qrDataUrl}" alt="Receipt QR" style="width:${qrSize}px; height:${qrSize}px; border-radius:8px;" /></div>`;
  return `
    <html>
      <head>
        <style>
          @page { size: ${pageSize}; margin: 8mm; }
          * { box-sizing: border-box; }
        </style>
      </head>
      <body style="font-family: Arial, sans-serif; padding:${isA4 ? 12 : 0}px; color:#0f172a; background:#ffffff;">
        <div style="width:${pageWidth}; margin:0 auto; border:1px solid #e2e8f0; border-radius:16px; overflow:hidden;">
          <div style="padding:14px 14px 10px; background:#ffffff; color:#111111; border-bottom:1px solid #e2e8f0;">
            <div style="display:flex; align-items:center; justify-content:space-between; gap:12px;">
              <img src="${DOKANX_MONO_LOGO_DATA_URI}" alt="DokanX mono logo" style="width:${isA4 ? 132 : 110}px; height:${isA4 ? 42 : 34}px; object-fit:contain;" />
              <div style="text-align:right;">
                <div style="font-size:${isA4 ? 18 : 16}px; font-weight:800;">${options.shopName}</div>
                <div style="font-size:11px; color:#64748b; margin-top:4px;">${options.shopAddress || "Merchant counter receipt"}</div>
                <div style="font-size:11px; color:#94a3b8; margin-top:4px;">Order ${options.orderId}</div>
              </div>
            </div>
          </div>
          <div style="padding:14px;">
            <div style="display:flex; justify-content:space-between; gap:12px; margin-bottom:12px;">
              <div><div style="font-size:11px; color:#64748b;">Customer</div><div style="font-size:${baseFont}px; font-weight:700;">${options.customerLabel}</div></div>
              <div style="text-align:right;"><div style="font-size:11px; color:#64748b;">Payment</div><div style="font-size:${baseFont}px; font-weight:700;">${options.paymentLabel}</div></div>
            </div>
            <table style="width:100%; border-collapse:collapse; font-size:${baseFont}px;">
              <thead><tr><th style="text-align:left; font-size:10px; color:#6b7280; padding-bottom:6px;">Product</th><th style="text-align:right; font-size:10px; color:#6b7280; padding-bottom:6px;">Total</th></tr></thead>
              <tbody>${rows}</tbody>
            </table>
            ${splitRows}
            <div style="margin-top:12px; padding-top:12px; border-top:2px solid #111827; display:flex; ${isA4 ? "justify-content:space-between; align-items:flex-start;" : "flex-direction:column;"} gap:10px;">
              <div><div style="font-size:11px; color:#64748b;">Total payable</div><div style="font-size:${isA4 ? 20 : 18}px; font-weight:800;">${options.totalAmount.toFixed(2)} BDT</div></div>
              ${codeBlock}
            </div>
            <div style="margin-top:10px; font-size:11px; color:#64748b; word-break:break-all;">Scan or open: ${options.storefrontLink}</div>
            <div style="margin-top:4px; font-size:11px; color:#94a3b8;">Printed ${new Date().toLocaleString()}</div>
          </div>
        </div>
      </body>
    </html>`;
}
export function MerchantPosScreen() {
  const accessToken = useMerchantAuthStore((state) => state.accessToken);
  const profile = useMerchantAuthStore((state) => state.profile);
  const hydratePosDraft = useMerchantPosStore((state) => state.hydrate);
  const persistPosDraft = useMerchantPosStore((state) => state.setDraft);
  const resetPosDraft = useMerchantPosStore((state) => state.resetDraft);
  const setScannerActive = useMerchantPosStore((state) => state.setScannerActive);
  const draftIsHydrated = useMerchantPosStore((state) => state.isHydrated);
  const draftCart = useMerchantPosStore((state) => state.cart);
  const draftCustomerId = useMerchantPosStore((state) => state.customerId);
  const draftCustomerName = useMerchantPosStore((state) => state.customerName);
  const draftCustomerPhone = useMerchantPosStore((state) => state.customerPhone);
  const draftGlobalDiscountRate = useMerchantPosStore((state) => state.globalDiscountRate);
  const draftPaymentMode = useMerchantPosStore((state) => state.paymentMode);
  const draftSplitEnabled = useMerchantPosStore((state) => state.splitEnabled);
  const draftSplitAmounts = useMerchantPosStore((state) => state.splitAmounts);
  const { navigate } = useMerchantNavigation();
  const barcodeInputRef = useRef<TextInput | null>(null);
  const scrollRef = useRef<ScrollView | null>(null);
  const cartSectionYRef = useRef(0);
  const restoredDraftRef = useRef(false);
  const lastHandledScanRef = useRef<{ code: string; at: number }>({ code: "", at: 0 });
  const lastPersistedDraftRef = useRef("");
  const scannerEmitter = useMemo(() => {
    const scannerModule = NativeModules.MerchantScanner;
    return scannerModule ? new NativeEventEmitter(scannerModule) : null;
  }, []);
  const updateScannerOverlayStatus = useCallback((message: string) => {
    const scannerModule = NativeModules.MerchantScanner as { updateScannerStatus?: (nextMessage: string) => void } | undefined;
    scannerModule?.updateScannerStatus?.(message);
  }, []);

  const [products, setProducts] = useState<ProductRow[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [manualName, setManualName] = useState("");
  const [manualPrice, setManualPrice] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [barcodeInput, setBarcodeInput] = useState("");
  const [globalDiscountRate, setGlobalDiscountRate] = useState("0");
  const [paymentMode, setPaymentMode] = useState<SplitMode>("CASH");
  const [splitEnabled, setSplitEnabled] = useState(false);
  const [splitAmounts, setSplitAmounts] = useState<Record<SplitMode, string>>({ CASH: "", ONLINE: "", WALLET: "", CREDIT: "" });
  const [generatedQrTarget, setGeneratedQrTarget] = useState<string | null>(null);
  const [lastReceiptText, setLastReceiptText] = useState<string | null>(null);
  const [receiptPreset, setReceiptPreset] = useState<ReceiptPreset>("THERMAL_58");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [notificationChannels, setNotificationChannels] = useState<Record<string, boolean>>({});
  const [smsAutoEnabled, setSmsAutoEnabled] = useState(false);
  const [features, setFeatures] = useState(DEFAULT_FEATURES);
  const [pricingSafety, setPricingSafety] = useState(DEFAULT_SAFETY);
  const [lastScannedCode, setLastScannedCode] = useState("");
  const [manualEntryOpen, setManualEntryOpen] = useState(false);
  const [visibleProductCount, setVisibleProductCount] = useState<number>(10);
  const [shopName, setShopName] = useState("DokanX Merchant");
  const [shopAddress, setShopAddress] = useState("");
  const [storefrontLink, setStorefrontLink] = useState("https://dokanx.com");
  const globalDiscount = Math.max(0, Math.min(100, toNumber(globalDiscountRate)));
  const totalAmount = useMemo(() => Number(cart.reduce((sum, item) => sum + buildCartAmount(item, globalDiscount), 0).toFixed(2)), [cart, globalDiscount]);
  const totalItems = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);
  const miniCartItems = useMemo(() => cart.slice(-3).reverse(), [cart]);
  const extraCartItems = Math.max(0, cart.length - miniCartItems.length);
  const latestCartItem = cart.length ? cart[cart.length - 1] : null;
  const splitBreakdown = useMemo(
    () => (["CASH", "ONLINE", "WALLET", "CREDIT"] as SplitMode[])
      .map((mode) => ({ mode, amount: Number(splitAmounts[mode] || 0) }))
      .filter((entry) => entry.amount > 0),
    [splitAmounts],
  );
  const splitTotal = useMemo(() => splitBreakdown.reduce((sum, item) => sum + item.amount, 0), [splitBreakdown]);
  const effectiveNeedsCustomer = splitEnabled
    ? splitBreakdown.some((item) => item.mode === "WALLET" || item.mode === "CREDIT")
    : paymentMode === "WALLET" || paymentMode === "CREDIT";
  const splitValid = !splitEnabled || (splitBreakdown.length > 0 && Math.abs(splitTotal - totalAmount) < 0.01);
  const canCheckout = cart.length > 0 && splitValid && (!effectiveNeedsCustomer || !!customerId.trim());

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return products;
    }
    return products.filter((product) => [product.name, product.category, product.barcode].some((value) => value.toLowerCase().includes(query)));
  }, [products, searchQuery]);

  const quickSuggestions = useMemo(() => filteredProducts.slice(0, 4), [filteredProducts]);
  const merchantLabel = useMemo(() => profile?.name?.trim() || profile?.email?.trim() || "Merchant POS", [profile?.email, profile?.name]);
  const merchantInitial = useMemo(() => merchantLabel.charAt(0).toUpperCase() || "M", [merchantLabel]);

  const loadProducts = useCallback(async (query?: string) => {
    if (!profile?.shopId) {
      setProducts([]);
      setError("Merchant shop is not ready yet.");
      return;
    }

    try {
      const [response, settingsResponse, notificationSettingsResponse] = await Promise.all([
        query && query.trim() ? searchMerchantProductsRequest(profile.shopId, query.trim()) : getMerchantProductsRequest(profile.shopId),
        accessToken ? getMerchantShopSettingsRequest(accessToken) : Promise.resolve({ data: { merchantFeatures: DEFAULT_FEATURES, pricingSafety: DEFAULT_SAFETY } }),
        accessToken ? getMerchantNotificationSettingsRequest(accessToken) : Promise.resolve({ data: { channels: {} } }),
      ]);

      const rows = (response.data || [])
        .map((item) => ({
          id: String(item._id || item.id || ""),
          name: String(item.name || "Product"),
          price: Number(item.price || 0),
          costPrice: Number(item.costPrice || 0),
          discountRate: Number(item.discountRate || 0),
          stock: Number(item.stock || 0),
          barcode: String(item.barcode || ""),
          category: String(item.category || "General"),
        }))
        .filter((item) => item.id);

      setProducts(rows);
      const settingsData = (settingsResponse.data || {}) as {
        name?: string;
        storefrontDomain?: string;
        addressLine1?: string;
        addressLine2?: string;
        city?: string;
        country?: string;
        merchantFeatures?: MerchantFeatureSettings;
        pricingSafety?: MerchantPricingSafetySettings;
      };
      setFeatures({ ...DEFAULT_FEATURES, ...(settingsData.merchantFeatures || {}) });
      const line1 = String(settingsData.addressLine1 || "");
      const line2 = String(settingsData.addressLine2 || "");
      const city = String(settingsData.city || "");
      const country = String(settingsData.country || "");
      const domain = String(settingsData.storefrontDomain || "").trim();
      setShopName(String(settingsData.name || profile?.name || "DokanX Merchant"));
      setShopAddress([line1, line2, city, country].filter(Boolean).join(", "));
      setStorefrontLink(domain ? (domain.startsWith("http") ? domain : `https://${domain}`) : "https://dokanx.com");
      const channels: Record<string, boolean> = { ...(notificationSettingsResponse.data?.channels || {}) };
      setNotificationChannels(channels);
      setSmsAutoEnabled(Boolean(channels.sms));
      setPricingSafety({ ...DEFAULT_SAFETY, ...(settingsData.pricingSafety || {}) });
      if (settingsResponse.data?.merchantFeatures?.splitPaymentEnabled === false) {
        setSplitEnabled(false);
      }
      setError(null);
    } catch (loadError) {
      setProducts([]);
      setError(loadError instanceof Error ? loadError.message : "Unable to load POS products.");
    }
  }, [accessToken, profile?.name, profile?.shopId]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    if (draftIsHydrated) return;
    void hydratePosDraft();
  }, [draftIsHydrated, hydratePosDraft]);

  useEffect(() => {
    if (!draftIsHydrated || restoredDraftRef.current) return;
    restoredDraftRef.current = true;
    setCart(draftCart);
    setCustomerId(draftCustomerId);
    setCustomerName(draftCustomerName);
    setCustomerPhone(draftCustomerPhone);
    setGlobalDiscountRate(draftGlobalDiscountRate);
    setPaymentMode(draftPaymentMode);
    setSplitEnabled(draftSplitEnabled);
    setSplitAmounts(draftSplitAmounts);
    lastPersistedDraftRef.current = JSON.stringify({
      cart: draftCart,
      customerId: draftCustomerId,
      customerName: draftCustomerName,
      customerPhone: draftCustomerPhone,
      globalDiscountRate: draftGlobalDiscountRate,
      paymentMode: draftPaymentMode,
      splitEnabled: draftSplitEnabled,
      splitAmounts: draftSplitAmounts,
    });
  }, [
    draftCart,
    draftCustomerId,
    draftCustomerName,
    draftCustomerPhone,
    draftGlobalDiscountRate,
    draftIsHydrated,
    draftPaymentMode,
    draftSplitAmounts,
    draftSplitEnabled,
  ]);

  useEffect(() => {
    if (!draftIsHydrated || !restoredDraftRef.current) return;
    const snapshot = JSON.stringify({
      cart,
      customerId,
      customerName,
      customerPhone,
      globalDiscountRate,
      paymentMode,
      splitEnabled,
      splitAmounts,
    });
    if (snapshot === lastPersistedDraftRef.current) return;
    lastPersistedDraftRef.current = snapshot;
    void persistPosDraft({
      cart,
      customerId,
      customerName,
      customerPhone,
      globalDiscountRate,
      paymentMode,
      splitEnabled,
      splitAmounts,
    });
  }, [
    cart,
    customerId,
    customerName,
    customerPhone,
    draftIsHydrated,
    globalDiscountRate,
    paymentMode,
    persistPosDraft,
    splitAmounts,
    splitEnabled,
  ]);

  const addProduct = useCallback((product: ProductRow) => {
    setError(null);
    setStatus(`${product.name} added to cart.`);
    setCart((current) => {
      const existing = current.find((item) => item.id === product.id);
      if (existing) {
        return current.map((item) => (item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item));
      }
      return [
        ...current,
        {
          id: product.id,
          name: product.name,
          price: product.price,
          costPrice: product.costPrice,
          quantity: 1,
          manual: false,
          discountRate: product.discountRate,
          barcode: product.barcode || undefined,
        },
      ];
    });
    setTimeout(() => {
      scrollRef.current?.scrollTo({ y: Math.max(0, cartSectionYRef.current - 24), animated: true });
    }, 120);
  }, []);


  const addFirstVisibleProduct = useCallback(() => {
    const firstProduct = filteredProducts[0];
    if (!firstProduct) {
      setStatus("No visible product is ready to add. Search or refresh the list.");
      return;
    }
    addProduct(firstProduct);
  }, [addProduct, filteredProducts]);
  const updateSplitAmount = useCallback((mode: SplitMode, value: string) => {
    setSplitAmounts((current) => ({ ...current, [mode]: value.replace(/[^0-9.]/g, "") }));
  }, []);

  const applySplitPreset = useCallback((mode: SplitMode) => {
    const total = totalAmount.toFixed(2);
    setSplitEnabled(true);
    setSplitAmounts({ CASH: "", ONLINE: "", WALLET: "", CREDIT: "", [mode]: total });
    setStatus(`${mode} set to full amount.`);
    setError(null);
  }, [totalAmount]);

  const handleBarcodeLookup = useCallback(async (code: string) => {
    const candidates = extractBarcodeCandidates(code);
    if (!candidates.length) {
      return;
    }

    const localMatch = products.find((product) => {
      const productBarcode = normalizeBarcodeValue(product.barcode || "");
      if (!productBarcode) return false;
      return candidates.some((candidate) => normalizeBarcodeValue(candidate) === productBarcode);
    });

    if (localMatch) {
      console.log("[merchant-pos] barcode:local-match", JSON.stringify({ barcode: localMatch.barcode || null, productId: localMatch.id, name: localMatch.name }));
      addProduct(localMatch);
      if (features.scannerFeedbackEnabled !== false) {
        Vibration.vibrate(35);
      }
      updateScannerOverlayStatus(`${localMatch.name} added. Cart now has ${totalItems + 1} item${totalItems + 1 === 1 ? "" : "s"}.`);
      setBarcodeInput("");
      setLastScannedCode(candidates[0]);
      setSearchQuery(localMatch.name);
      setStatus(`${localMatch.name} scanned and added to cart.`);
      return;
    }

    console.log("[merchant-pos] barcode:lookup-start", JSON.stringify({ candidates, shopId: profile?.shopId || null, loadedProducts: products.length }));
    if (!profile?.shopId) {
      setError("Merchant shop is not ready for barcode lookup. Reload the POS once.");
      return;
    }

    try {
      let product: Awaited<ReturnType<typeof getMerchantProductByBarcodeRequest>>["data"] | undefined;
      let matchedCode = candidates[0];

      for (const candidate of candidates) {
        try {
          const response = await getMerchantProductByBarcodeRequest(profile.shopId, candidate);
          if (response.data && (response.data._id || response.data.id)) {
            product = response.data;
            matchedCode = candidate;
            break;
          }
        } catch (_candidateError) {
          // Try the next parsed candidate before surfacing an error.
        }
      }

      if (!product || !(product._id || product.id)) {
        setError(`No product found for scan ${candidates[0]}.`);
        setStatus("Scan did not match any product. Search, select, or add it manually.");
        updateScannerOverlayStatus(`Nothing matched ${candidates[0]}. Search or add it manually.`);
        return;
      }
      console.log("[merchant-pos] barcode:lookup-success", JSON.stringify({ code: matchedCode, productId: product._id || product.id, name: product.name }));
      addProduct({
        id: String(product._id || product.id || ""),
        name: String(product.name || "Product"),
        price: Number(product.price || 0),
        costPrice: Number(product.costPrice || 0),
        discountRate: Number(product.discountRate || 0),
        stock: Number(product.stock || 0),
        barcode: String(product.barcode || matchedCode),
        category: String(product.category || "General"),
      });
      setBarcodeInput("");
      setLastScannedCode(matchedCode);
      setSearchQuery(String(product.name || ""));
      setStatus(`${String(product.name || "Product")} scanned and added to cart.`);
      updateScannerOverlayStatus(`${String(product.name || "Product")} added. Cart now has ${totalItems + 1} item${totalItems + 1 === 1 ? "" : "s"}.`);
    } catch (lookupError) {
      console.log("[merchant-pos] barcode:lookup-error", lookupError instanceof Error ? lookupError.message : String(lookupError));
      setError(lookupError instanceof Error ? lookupError.message : "Unable to scan this barcode.");
    }
  }, [addProduct, features.scannerFeedbackEnabled, products, profile?.shopId, totalItems, updateScannerOverlayStatus]);
  useEffect(() => {
    if (!scannerEmitter) return;

    const scannedSub = scannerEmitter.addListener("merchantScannerScanned", ({ code }: { code?: string }) => {
      const nextCode = String(code || "").trim();
      if (!nextCode) return;
      const normalizedCode = normalizeBarcodeValue(nextCode);
      const now = Date.now();
      if (lastHandledScanRef.current.code === normalizedCode && now - lastHandledScanRef.current.at < 2200) {
        return;
      }
      lastHandledScanRef.current = { code: normalizedCode, at: now };
      console.log("[merchant-pos] scan:code", JSON.stringify({ code: nextCode }));
      setBarcodeInput(nextCode);
      setLastScannedCode(nextCode);
      setStatus(`Scanned ${nextCode}. Adding product to cart...`);
      void handleBarcodeLookup(nextCode);
    });

    const closedSub = scannerEmitter.addListener("merchantScannerClosed", ({ reason }: { reason?: string }) => {
      setScannerOpen(false);
      setScannerActive(false);
      setStatus(reason === "manual-close" ? "Scanner closed. Search, select, or add manually." : "Scanner closed.");
      barcodeInputRef.current?.focus();
    });

    const errorSub = scannerEmitter.addListener("merchantScannerError", ({ message }: { message?: string }) => {
      const nextMessage = String(message || "Scanner could not start.");
      console.log("[merchant-pos] scan:error", nextMessage);
      setScannerActive(false);
      setScannerError(nextMessage);
      setStatus("Scanner assistant is ready with barcode and Bluetooth fallback.");
      barcodeInputRef.current?.focus();
    });

    return () => {
      scannedSub.remove();
      closedSub.remove();
      errorSub.remove();
    };
  }, [handleBarcodeLookup, scannerEmitter]);

  const handleCreateCustomer = useCallback(async () => {
    if (!accessToken || !customerPhone.trim()) {
      setError("Enter customer phone first.");
      return;
    }

    try {
      const existing = await searchMerchantCustomersRequest(accessToken, customerPhone.trim());
      const match = (existing.data || []).find((row) => row.phone === customerPhone.trim()) || (existing.data || [])[0];
      if (match?._id) {
        setCustomerId(String(match._id));
        setCustomerName(String(match.name || customerName || ""));
        setStatus(`Customer linked: ${match.name || match.phone || match._id}`);
        setError(null);
        return;
      }

      const created = await createMerchantCustomerRequest(accessToken, {
        name: customerName.trim() || customerPhone.trim(),
        phone: customerPhone.trim(),
      });
      if (created.data?._id) {
        setCustomerId(String(created.data._id));
        setCustomerName(String(created.data.name || customerName || ""));
        setStatus(`Customer created: ${created.data.name || created.data.phone || created.data._id}`);
        setError(null);
        return;
      }

      setError("Unable to find or create customer.");
    } catch (customerError) {
      setError(customerError instanceof Error ? customerError.message : "Unable to handle customer right now.");
    }
  }, [accessToken, customerName, customerPhone]);

  const openScanner = useCallback(async () => {
    setError(null);
    setScannerOpen(true);
    setScannerActive(true);
    setScannerError(null);

    try {
      const permission = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA, {
        title: "Camera access",
        message: "DokanX needs camera access to scan product barcodes.",
        buttonPositive: "Allow",
        buttonNegative: "Not now",
      });

      if (permission !== PermissionsAndroid.RESULTS.GRANTED) {
        setScannerActive(false);
        setScannerError("Camera permission is required for live scanning. You can still use barcode input or a Bluetooth scanner.");
        setStatus("Scanner assistant is ready with barcode and Bluetooth fallback.");
        barcodeInputRef.current?.focus();
        return;
      }

      const scannerModule = NativeModules.MerchantScanner as { openScanner?: () => Promise<unknown> } | undefined;
      if (!scannerModule?.openScanner) {
        setScannerActive(false);
        setScannerError("Native scanner is not available in this build. Use barcode input or a Bluetooth scanner for now.");
        setStatus("Scanner assistant is ready with barcode and Bluetooth fallback.");
        barcodeInputRef.current?.focus();
        return;
      }

      setStatus("Live scanner opened. Keep scanning to add products one by one.");
      await scannerModule.openScanner();
    } catch (scanError) {
      console.log("[merchant-pos] scan:error", scanError instanceof Error ? scanError.message : String(scanError));
      const message = scanError instanceof Error ? scanError.message : String(scanError || "Scanner could not start.");
      setScannerActive(false);
      setScannerError(message);
      setStatus("Scanner assistant is ready with barcode and Bluetooth fallback.");
      barcodeInputRef.current?.focus();
    }
  }, []);


  const toggleSmsAuto = useCallback(async () => {
    if (!accessToken) {
      setError("Merchant session missing. Please sign in again.");
      return;
    }

    try {
      const nextChannels = { ...notificationChannels, sms: !smsAutoEnabled };
      await updateMerchantNotificationSettingsRequest(accessToken, { channels: nextChannels });
      setNotificationChannels(nextChannels);
      setSmsAutoEnabled(Boolean(nextChannels.sms));
      setStatus(nextChannels.sms ? "SMS channel enabled for order notifications." : "SMS channel disabled for order notifications.");
      setError(null);
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : "Unable to update SMS channel.");
    }
  }, [accessToken, notificationChannels, smsAutoEnabled]);
  const handleAddManualItem = useCallback(() => {
    const price = Number(manualPrice || 0);
    if (!manualName.trim() || price <= 0) {
      setError("Enter manual item name and price.");
      return;
    }
    const id = `manual-${Date.now()}`;
    setCart((current) => [
      ...current,
      {
        id,
        name: manualName.trim(),
        price,
        costPrice: 0,
        quantity: 1,
        manual: true,
        discountRate: 0,
      },
    ]);
    setManualName("");
    setManualPrice("");
    setStatus("Manual item added to cart.");
    setError(null);
  }, [manualName, manualPrice]);

  const generateCollectionQr = useCallback(async () => {
    try {
      const target = createQrPayload(customerId.trim(), totalAmount);
      setGeneratedQrTarget(target);
      setStatus("Collection link is ready to share or print.");
      setError(null);
    } catch (qrError) {
      setError(qrError instanceof Error ? qrError.message : "Unable to prepare collection link.");
    }
  }, [customerId, totalAmount]);

  const shareReceipt = useCallback(async () => {
    if (!lastReceiptText) {
      setError("Create an order first to share the receipt.");
      return;
    }
    await Share.share({ message: lastReceiptText });
  }, [lastReceiptText, receiptPreset]);

  const shareQr = useCallback(async () => {
    if (!generatedQrTarget) {
      setError("Generate collection link first.");
      return;
    }
    await Share.share({ message: generatedQrTarget });
  }, [generatedQrTarget]);

  const printReceiptWithData = useCallback(async (payload?: {
    receiptText?: string;
    cart?: CartItem[];
    totalAmount?: number;
    paymentLabel?: string;
    splitEnabled?: boolean;
    splitBreakdown?: SplitBreakdown;
  }) => {
    const receiptText = payload?.receiptText || lastReceiptText;
    const receiptCart = payload?.cart || cart;
    const receiptTotal = payload?.totalAmount ?? totalAmount;
    const paymentLabel = payload?.paymentLabel || (receiptText?.match(/Payment:\s*(.+)/)?.[1] || "CASH");
    const receiptSplitEnabled = payload?.splitEnabled ?? splitEnabled;
    const receiptSplitBreakdown = payload?.splitBreakdown || splitBreakdown;

    if (!receiptText) {
      setError("Create an order first to print the receipt.");
      return;
    }

    try {
      const codeAssets = accessToken ? await getMerchantPrintCodesRequest(accessToken, { data: storefrontLink, barcode: receiptText.match(/Order:\s*(.+)/)?.[1] || "N/A", size: 180 }) : null;
      const qrDataUrl = codeAssets?.data?.qrDataUrl || await getQrCodeModule().toDataURL(storefrontLink, { margin: 1, width: 160 });
      const html = buildReceiptHtml({
        shopName,
        shopAddress,
        storefrontLink,
        receiptPreset,
        orderId: receiptText.match(/Order:\s*(.+)/)?.[1] || "N/A",
        customerLabel: receiptText.match(/Customer:\s*(.+)/)?.[1] || "walk-in",
        paymentLabel,
        cart: receiptCart,
        totalAmount: Number(receiptText.match(/Total:\s*([0-9.]+)/)?.[1] || 0) || receiptTotal,
        splitEnabled: receiptSplitEnabled,
        splitBreakdown: receiptSplitBreakdown,
        qrDataUrl,
        barcodeDataUrl: codeAssets?.data?.barcodeDataUrl,
        globalDiscountAmount: Math.max(0, Number((receiptCart.reduce((sum, item) => sum + item.price * item.quantity, 0) - receiptTotal).toFixed(2))),
      });
      await getPrintModule().print({ html, jobName: "DokanX receipt" });
      console.log("[merchant-pos] receipt:print-sent", JSON.stringify({ preset: receiptPreset }));
      setStatus("Receipt sent to printer.");
      setError(null);
    } catch {
      await Share.share({ message: receiptText });
      setStatus("Printer was unavailable. Receipt opened in share options.");
      setError(null);
    }
  }, [accessToken, cart, lastReceiptText, receiptPreset, shopAddress, shopName, splitBreakdown, splitEnabled, storefrontLink, totalAmount]);

  const printReceipt = useCallback(async () => {
    await printReceiptWithData();
  }, [printReceiptWithData]);

  const handleCheckout = useCallback(async () => {
    if (!accessToken || !canCheckout) {
      setError("Checkout is not ready yet.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setStatus(null);

    try {
      const items = cart.map((item) => ({
        product: item.manual ? undefined : item.id,
        name: item.manual ? item.name : undefined,
        quantity: item.quantity,
        price: getUnitPrice(item.price, globalDiscount, item.discountRate),
      }));
      const breakdown = splitEnabled ? splitBreakdown : undefined;
      const orderResponse = await createMerchantPosOrderRequest(accessToken, {
        customerId: customerId.trim() || undefined,
        paymentMode,
        paymentBreakdown: breakdown,
        items,
      });
      const orderId = String(orderResponse.data?._id || "");
      if (!orderId) {
        throw new Error("Order was not created.");
      }

      if ((splitEnabled && splitBreakdown.some((entry) => entry.mode === "CREDIT")) || (!splitEnabled && paymentMode === "CREDIT")) {
        const creditAmount = splitEnabled
          ? splitBreakdown.filter((entry) => entry.mode === "CREDIT").reduce((sum, entry) => sum + entry.amount, 0)
          : totalAmount;
        if (!customerId.trim()) {
          throw new Error("Customer ID is required for credit sales.");
        }
        await createMerchantCreditSaleRequest(accessToken, {
          orderId,
          customerId: customerId.trim(),
          amount: Number(creditAmount.toFixed(2)),
        });
      }

      if ((splitEnabled && splitBreakdown.some((entry) => entry.mode === "ONLINE")) || (!splitEnabled && paymentMode === "ONLINE")) {
        const paymentInit = await initiateMerchantPaymentRequest(accessToken, orderId);
        const paymentUrl = paymentInit.data?.paymentUrl || paymentInit.paymentUrl;
        setStatus(paymentUrl ? `Online payment started. Wait for confirmation. ${paymentUrl}` : "Online payment started. Wait for webhook confirmation.");
      } else {
        setStatus(`Order ${orderId} created successfully.${smsAutoEnabled && customerPhone.trim() ? " SMS channel is enabled for backend notification delivery." : ""}`);
      }

      console.log("[merchant-pos] checkout:success", JSON.stringify({ orderId, totalAmount }));
      const checkoutCart = cart;
      const checkoutTotal = totalAmount;
      const receiptText = buildReceiptText(orderId, checkoutCart, checkoutTotal, paymentMode, customerId.trim(), splitEnabled, splitBreakdown);
      setLastReceiptText(receiptText);
      await printReceiptWithData({
        receiptText,
        cart: checkoutCart,
        totalAmount: checkoutTotal,
        paymentLabel: splitEnabled ? "SPLIT" : paymentMode,
        splitEnabled,
        splitBreakdown,
      });
      setCart([]);      setGeneratedQrTarget(null);
      setSplitEnabled(false);
      setSplitAmounts({ CASH: "", ONLINE: "", WALLET: "", CREDIT: "" });
      setPaymentMode("CASH");
      setCustomerId("");
      setCustomerName("");
      setCustomerPhone("");
      await resetPosDraft();
      await loadProducts(searchQuery.trim());
    } catch (checkoutError) {
      console.log("[merchant-pos] checkout:error", checkoutError instanceof Error ? checkoutError.message : String(checkoutError));
      setError(checkoutError instanceof Error ? checkoutError.message : "Unable to complete checkout.");
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, canCheckout, cart, customerId, globalDiscount, loadProducts, paymentMode, printReceiptWithData, resetPosDraft, searchQuery, splitBreakdown, splitEnabled, totalAmount]);

  const handleOpenCartPreview = useCallback(() => {
    scrollRef.current?.scrollTo({ y: Math.max(0, cartSectionYRef.current - 24), animated: true });
  }, []);

  return (
    <View style={styles.screen}>
      <ScrollView ref={scrollRef} stickyHeaderIndices={scannerOpen ? [2] : []} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.brandHeader}>
          <View style={styles.brandHeaderInner}>
            <DokanXLogo variant="icon" size="sm" />
            <View style={styles.brandHeaderTextWrap}>
              <Text style={styles.brandKicker}>DokanX POS</Text>
              <Text style={styles.brandHelper}>Touch-ready counter mode with branded receipts and fast checkout cues.</Text>
            </View>
          </View>
        </View>
        <View style={styles.headerCard}>
          <View style={styles.headerTop}>
            <View style={styles.avatar}><Text style={styles.avatarText}>{merchantInitial}</Text></View>
            <View style={styles.headerMeta}>
              <Text style={styles.headerName}>{merchantLabel}</Text>
              <Text style={styles.headerHint}>{customerName || customerPhone || customerId ? `Customer ready: ${customerName || customerPhone || customerId}` : "Fast billing for walk-in and saved customers"}</Text>
            </View>
            <View style={styles.headerStats}>
              <Text style={styles.headerStatValue}>{totalItems} items</Text>
              <Text style={styles.headerStatHint}>{totalAmount.toFixed(2)} BDT</Text>
            </View>
          </View>
        </View>

        {!scannerOpen ? (
          <View style={styles.miniCartCard}>
            <View style={styles.miniCartRow}>
              <View>
                <Text style={styles.summaryTitle}>Cart at a glance</Text>
                <Text style={styles.helperText}>Your current POS work stays here while you move around the app.</Text>
              </View>
              <Text style={styles.cartBadge}>{totalItems} items</Text>
            </View>
            {miniCartItems.length ? miniCartItems.map((item) => (
              <View key={`mini-${item.id}`} style={styles.miniCartRow}>
                <View style={styles.productInfo}>
                  <Text style={styles.productTitle}>{item.name}</Text>
                  <Text style={styles.productMeta}>{item.quantity} x {getUnitPrice(item.price, globalDiscount, item.discountRate).toFixed(2)} BDT</Text>
                </View>
                <Text style={styles.addText}>{buildCartAmount(item, globalDiscount).toFixed(2)}</Text>
              </View>
            )) : <Text style={styles.helperText}>Scan or add a product to start the bill.</Text>}
            {extraCartItems ? <Text style={styles.helperText}>+{extraCartItems} more items in this receipt</Text> : null}
            <View style={styles.inlineRow}>
              <Pressable style={styles.secondaryButton} onPress={handleOpenCartPreview}>
                <Text style={styles.secondaryButtonText}>View full cart</Text>
              </Pressable>
              <Pressable style={styles.secondaryButton} onPress={() => void printReceipt()}>
                <Text style={styles.secondaryButtonText}>Receipt preview</Text>
              </Pressable>
              <Pressable style={styles.secondaryButton} onPress={() => scrollRef.current?.scrollToEnd({ animated: true })}>
                <Text style={styles.secondaryButtonText}>Checkout</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>{scannerOpen ? "Scan mode" : "Find products"}</Text>
            <Pressable style={styles.linkChip} onPress={() => scannerOpen ? setScannerOpen(false) : void loadProducts(searchQuery.trim())}><Text style={styles.linkChipText}>{scannerOpen ? "Close scan" : "Refresh"}</Text></Pressable>
          </View>
          {features.productSearchEnabled ? (
            <TextInput
              style={[styles.input, styles.searchInput]}
              value={searchQuery}
              onChangeText={(value) => {
                setSearchQuery(value);
                setError(null);
              }}
              placeholder="Search by name, category, or barcode"
              placeholderTextColor="#6b7280"
            />
          ) : null}
          <View style={styles.inlineRow}>
            <TextInput
              ref={barcodeInputRef}
              style={[styles.input, styles.flexInput]}
              value={barcodeInput}
              onChangeText={setBarcodeInput}
              onSubmitEditing={() => void handleBarcodeLookup(barcodeInput)}
              placeholder={features.bluetoothScannerEnabled ? "Scan barcode or type code" : "Type barcode"}
              placeholderTextColor="#6b7280"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
            />
            <Pressable style={styles.secondaryButton} onPress={() => void handleBarcodeLookup(barcodeInput)}>
              <Text style={styles.secondaryButtonText}>Add</Text>
            </Pressable>
            <Pressable style={styles.secondaryButton} onPress={() => void openScanner()}>
              <Text style={styles.secondaryButtonText}>Scan</Text>
            </Pressable>
            <Pressable style={styles.secondaryButton} onPress={() => { setManualName(searchQuery.trim() || manualName); setManualEntryOpen((current) => !current); setStatus("Manual item form is ready here."); setError(null); }}>
              <Text style={styles.secondaryButtonText}>Manual item</Text>
            </Pressable>
          </View>
          {!scannerOpen ? (
            <View style={styles.scanStatusCard}>
              <Text style={styles.scanStatusTitle}>Scan off mode</Text>
              <Text style={styles.scanStatusBody}>Search products, add the first visible match, or open the manual item form. Turn scan back on whenever you want to keep scanning products continuously.</Text>
              <View style={styles.modeStrip}>
                <Pressable style={styles.modeButton} onPress={() => barcodeInputRef.current?.focus()}>
                  <Text style={styles.modeButtonText}>Search</Text>
                </Pressable>
                <Pressable style={styles.modeButton} onPress={addFirstVisibleProduct}>
                  <Text style={styles.modeButtonText}>Select first</Text>
                </Pressable>
                <Pressable style={styles.modeButton} onPress={() => { setManualName(searchQuery.trim() || manualName); setManualEntryOpen(true); }}>
                  <Text style={styles.modeButtonText}>Manual</Text>
                </Pressable>
              </View>
            </View>
          ) : null}
          {scannerOpen ? (
            <View style={styles.scannerCard}>
              <View style={styles.inlineRow}>
                <View style={[styles.quickChip, styles.quickChipActive]}>
                  <Text style={[styles.quickChipText, styles.quickChipTextActive]}>Scanner on</Text>
                </View>
                <Pressable style={styles.linkChip} onPress={() => setScannerOpen(false)}><Text style={styles.linkChipText}>Off</Text></Pressable>
              </View>
              {scannerError ? (
                <View style={styles.permissionCard}>
                  <Text style={styles.scannerErrorText}>{scannerError}</Text>
                </View>
              ) : null}
              {latestCartItem ? (
                <View style={[styles.miniCartCard, { marginTop: 10, marginBottom: 10 }]}>
                  <View style={styles.miniCartRow}>
                    <View>
                      <Text style={styles.summaryTitle}>Latest added</Text>
                      <Text style={styles.helperText}>{latestCartItem.name}</Text>
                    </View>
                    <Text style={styles.cartBadge}>{totalItems} items</Text>
                  </View>
                  <View style={styles.miniCartRow}>
                    <View style={styles.productInfo}>
                      <Text style={styles.productTitle}>{latestCartItem.name}</Text>
                      <Text style={styles.productMeta}>{latestCartItem.quantity} x {getUnitPrice(latestCartItem.price, globalDiscount, latestCartItem.discountRate).toFixed(2)} BDT</Text>
                    </View>
                    <Text style={styles.addText}>{buildCartAmount(latestCartItem, globalDiscount).toFixed(2)}</Text>
                  </View>
                  <View style={styles.inlineRow}>
                    <Pressable style={styles.secondaryButton} onPress={handleOpenCartPreview}><Text style={styles.secondaryButtonText}>Full cart</Text></Pressable>
                    <Pressable style={styles.secondaryButton} onPress={() => scrollRef.current?.scrollToEnd({ animated: true })}><Text style={styles.secondaryButtonText}>Checkout</Text></Pressable>
                  </View>
                </View>
              ) : null}
              <View style={styles.inlineRow}>
                <Pressable style={styles.secondaryButton} onPress={() => barcodeInputRef.current?.focus()}><Text style={styles.secondaryButtonText}>Type barcode</Text></Pressable>
                <Pressable style={styles.secondaryButton} onPress={() => setManualEntryOpen(true)}><Text style={styles.secondaryButtonText}>Manual</Text></Pressable>
              </View>
              <TextInput style={styles.input} value={barcodeInput} onChangeText={setBarcodeInput} placeholder="Paste or scan barcode here" placeholderTextColor="#6b7280" autoCapitalize="none" autoCorrect={false} onSubmitEditing={() => void handleBarcodeLookup(barcodeInput)} />
              <Pressable style={styles.primaryButton} onPress={() => void handleBarcodeLookup(barcodeInput)}><Text style={styles.primaryButtonText}>Add scanned item</Text></Pressable>
            </View>
          ) : null}
          <View style={styles.visibleRow}>
            <Text style={styles.helperText}>Show products</Text>
            {[5, 10, 20].map((count) => (
              <Pressable key={count} style={[styles.quickChip, visibleProductCount === count ? styles.quickChipActive : null]} onPress={() => setVisibleProductCount(count)}> 
                <Text style={[styles.quickChipText, visibleProductCount === count ? styles.quickChipTextActive : null]}>{count}</Text>
              </Pressable>
            ))}
          </View>
          {manualEntryOpen ? (
            <View style={styles.inlineCard}>
              <Text style={styles.sectionTitle}>Manual item</Text>
              <TextInput style={styles.input} value={manualName} onChangeText={setManualName} placeholder="Manual item name" placeholderTextColor="#6b7280" />
              <TextInput style={styles.input} value={manualPrice} onChangeText={setManualPrice} placeholder="Manual item price" placeholderTextColor="#6b7280" keyboardType="numeric" />
              <Pressable style={styles.primaryButton} onPress={handleAddManualItem}><Text style={styles.primaryButtonText}>Add manual item</Text></Pressable>
            </View>
          ) : null}
          {quickSuggestions.length ? (
            <View style={styles.quickBlock}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Quick add</Text>
                <Text style={styles.helperText}>{quickSuggestions.length} ready</Text>
              </View>
              {quickSuggestions.map((product) => (
                <Pressable key={product.id} style={styles.productRow} onPress={() => addProduct(product)}>
                  <View style={styles.productInfo}>
                    <Text style={styles.productTitle}>{product.name}</Text>
                    <Text style={styles.productMeta}>{product.price} BDT{product.barcode ? ` | ${product.barcode}` : ""}</Text>
                  </View>
                  <Text style={styles.addText}>Add</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
          <View style={styles.productListCard}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Product list</Text>
              <Text style={styles.helperText}>{filteredProducts.length} showing</Text>
            </View>
            {filteredProducts.slice(0, visibleProductCount).map((product) => {
              const previewPrice = getUnitPrice(product.price, globalDiscount, product.discountRate);
              const safety = getSafetyBand(previewPrice, product.costPrice, pricingSafety);
              return (
                <Pressable key={product.id} style={styles.productRow} onPress={() => addProduct(product)}>
                  <View style={styles.productInfo}>
                    <View style={styles.titleRow}>
                      <View style={[styles.dot, { backgroundColor: safety.dot }]} />
                      <Text style={styles.productTitle}>{product.name}</Text>
                    </View>
                    <Text style={styles.productMeta}>{product.category} | Stock {product.stock} | {previewPrice.toFixed(2)} BDT</Text>
                    {features.pricingSafetyEnabled ? <Text style={[styles.safetyBadge, { color: safety.color, backgroundColor: safety.background }]}>{safety.label}</Text> : null}
                  </View>
                  <Text style={styles.addText}>Add</Text>
                </Pressable>
              );
            })}
            {!filteredProducts.length ? <Text style={styles.helperText}>No products found. Search again, refresh, or add it as a manual item.</Text> : null}
          </View>
        </View>

        <View style={styles.section} onLayout={(event) => { cartSectionYRef.current = event.nativeEvent.layout.y; }}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Cart</Text>
            <View style={styles.cartHeaderActions}>
              <Text style={styles.cartBadge}>{totalItems} items</Text>
              {cart.length ? (
                <Pressable style={styles.linkChip} onPress={() => { setCart([]); setStatus("Cart cleared."); setError(null); }}>
                  <Text style={styles.linkChipText}>Clear</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
          {cart.length ? cart.map((item) => {
            const unitPrice = getUnitPrice(item.price, globalDiscount, item.discountRate);
            const safety = getSafetyBand(unitPrice, item.costPrice, pricingSafety);
            return (
              <View key={item.id} style={styles.cartRow}>
                <View style={styles.productInfo}>
                  <View style={styles.titleRow}>
                    <View style={[styles.dot, { backgroundColor: safety.dot }]} />
                    <Text style={styles.productTitle}>{item.name}</Text>
                  </View>
                  <Text style={styles.productMeta}>{item.quantity} x {unitPrice.toFixed(2)} BDT{item.manual ? " | manual" : item.barcode ? ` | ${item.barcode}` : ""}</Text>
                  {features.discountToolsEnabled ? (
                    <View style={styles.discountRow}>
                      <Text style={styles.helperText}>Item discount</Text>
                      <TextInput
                        style={[styles.input, styles.discountInput]}
                        value={String(item.discountRate)}
                        onChangeText={(value) => setCart((current) => current.map((row) => (row.id === item.id ? { ...row, discountRate: Math.max(0, Math.min(100, Number(value || 0))) } : row)))}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor="#6b7280"
                      />
                    </View>
                  ) : null}
                </View>
                <View style={styles.cartActionRow}>
                  <Pressable style={styles.countButton} onPress={() => setCart((current) => current.map((row) => (row.id === item.id ? { ...row, quantity: Math.max(1, row.quantity - 1) } : row)))}><Text style={styles.countButtonText}>-</Text></Pressable>
                  <Pressable style={styles.countButton} onPress={() => setCart((current) => current.map((row) => (row.id === item.id ? { ...row, quantity: row.quantity + 1 } : row)))}><Text style={styles.countButtonText}>+</Text></Pressable>
                  <Pressable style={styles.removeButton} onPress={() => setCart((current) => current.filter((row) => row.id !== item.id))}><Text style={styles.removeButtonText}>Remove</Text></Pressable>
                </View>
              </View>
            );
          }) : <Text style={styles.helperText}>Cart is empty. Add products from above or add a manual item below.</Text>}
          <Pressable style={[styles.secondaryButton, smsAutoEnabled ? styles.splitActive : null]} onPress={() => void toggleSmsAuto()}><Text style={[styles.secondaryButtonText, smsAutoEnabled ? styles.splitActiveText : null]}>{smsAutoEnabled ? "SMS auto on" : "Enable SMS auto"}</Text></Pressable>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Cart summary</Text>
            <Text style={styles.summaryLine}>Total items: {totalItems}</Text>
              <Text style={styles.summaryAmount}>Total BDT {totalAmount.toFixed(2)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment and checkout</Text>
          <TextInput style={styles.input} value={customerId} onChangeText={setCustomerId} placeholder={effectiveNeedsCustomer ? "Customer ID required for wallet or credit" : "Customer ID optional"} placeholderTextColor="#6b7280" autoCapitalize="none" />
          <TextInput style={styles.input} value={customerPhone} onChangeText={setCustomerPhone} placeholder="Customer phone" placeholderTextColor="#6b7280" keyboardType="phone-pad" />
          <TextInput style={styles.input} value={customerName} onChangeText={setCustomerName} placeholder="Customer name" placeholderTextColor="#6b7280" />
          <View style={styles.inlineRow}>
            <Pressable style={styles.secondaryButton} onPress={() => void handleCreateCustomer()}><Text style={styles.secondaryButtonText}>Find or create customer</Text></Pressable>
            <Pressable style={styles.secondaryButton} onPress={() => { setCustomerId(""); setCustomerName(""); setCustomerPhone(""); setStatus("Walk-in customer selected."); setError(null); }}><Text style={styles.secondaryButtonText}>Walk-in</Text></Pressable>
          </View>
          {features.discountToolsEnabled ? (
            <>
              <TextInput style={styles.input} value={globalDiscountRate} onChangeText={setGlobalDiscountRate} placeholder="Bulk discount %" placeholderTextColor="#6b7280" keyboardType="numeric" />
              <View style={styles.chipRow}>
                {[0, 5, 10].map((discount) => (
                  <Pressable key={discount} style={[styles.quickChip, Number(globalDiscountRate || 0) === discount ? styles.quickChipActive : null]} onPress={() => setGlobalDiscountRate(String(discount))}>
                    <Text style={[styles.quickChipText, Number(globalDiscountRate || 0) === discount ? styles.quickChipTextActive : null]}>{discount}%</Text>
                  </Pressable>
                ))}
              </View>
            </>
          ) : null}
          <View style={styles.chipRow}>
            {(["CASH", "ONLINE", "WALLET", "CREDIT"] as const).map((mode) => (
              <Pressable key={mode} style={[styles.quickChip, paymentMode === mode && !splitEnabled ? styles.quickChipActive : null]} onPress={() => { setSplitEnabled(false); setPaymentMode(mode); }}>
                <Text style={[styles.quickChipText, paymentMode === mode && !splitEnabled ? styles.quickChipTextActive : null]}>{mode}</Text>
              </Pressable>
            ))}
          </View>
          {features.splitPaymentEnabled ? (
            <Pressable style={[styles.secondaryButton, splitEnabled ? styles.splitActive : null]} onPress={() => setSplitEnabled((value) => !value)}>
              <Text style={[styles.secondaryButtonText, splitEnabled ? styles.splitActiveText : null]}>{splitEnabled ? "Split payment on" : "Enable split payment"}</Text>
            </Pressable>
          ) : null}
          {splitEnabled ? (
            <View style={styles.splitPanel}>
              {(["CASH", "ONLINE", "WALLET", "CREDIT"] as const).map((mode) => (
                <View key={mode} style={styles.splitCell}>
                  <Text style={styles.helperText}>{mode}</Text>
                  <TextInput style={styles.input} value={splitAmounts[mode]} onChangeText={(value) => updateSplitAmount(mode, value)} placeholder="0" placeholderTextColor="#6b7280" keyboardType="numeric" />
                </View>
              ))}
              <Text style={styles.helperText}>Split total {splitTotal.toFixed(2)} / {totalAmount.toFixed(2)} BDT</Text>
              <View style={styles.inlineRow}>
                <Pressable style={styles.secondaryButton} onPress={() => applySplitPreset("CASH")}><Text style={styles.secondaryButtonText}>All cash</Text></Pressable>
                <Pressable style={styles.secondaryButton} onPress={() => applySplitPreset("WALLET")}><Text style={styles.secondaryButtonText}>All wallet</Text></Pressable>
                <Pressable style={styles.secondaryButton} onPress={() => applySplitPreset("ONLINE")}><Text style={styles.secondaryButtonText}>All online</Text></Pressable>
              </View>
            </View>
          ) : null}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Ready to bill</Text>
            <Text style={styles.summaryLine}>Customer: {customerId.trim() ? customerId : "walk-in"}</Text>
            <Text style={styles.summaryLine}>Payment: {splitEnabled ? "Split" : paymentMode}</Text>
            <Text style={styles.summaryLine}>{effectiveNeedsCustomer ? "Wallet or credit needs a customer before checkout." : "Cash and online can continue without customer ID."}</Text>
            <Text style={styles.summaryLine}>SMS receipt channel: {smsAutoEnabled ? "Enabled" : "Off"}</Text>
          </View>
          <Pressable style={[styles.primaryButton, !canCheckout ? styles.primaryButtonDisabled : null]} disabled={!canCheckout || isLoading} onPress={() => void handleCheckout()}>
            <Text style={styles.primaryButtonText}>{isLoading ? "Processing..." : splitEnabled ? "Checkout split payment" : `Checkout ${paymentMode}`}</Text>
          </Pressable>
          <View style={styles.visibleRow}>
            <Text style={styles.helperText}>Print preset</Text>
            {(["THERMAL_58", "THERMAL_80", "A4"] as const).map((preset) => (
              <Pressable key={preset} style={[styles.quickChip, receiptPreset === preset ? styles.quickChipActive : null]} onPress={() => setReceiptPreset(preset)}>
                <Text style={[styles.quickChipText, receiptPreset === preset ? styles.quickChipTextActive : null]}>{preset.replace("_", " ")}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.inlineRow}>
            <Pressable style={styles.secondaryButton} onPress={() => void printReceipt()}><Text style={styles.secondaryButtonText}>Print receipt</Text></Pressable>
            <Pressable style={styles.secondaryButton} onPress={() => void shareReceipt()}><Text style={styles.secondaryButtonText}>Share receipt</Text></Pressable>
            <Pressable style={styles.secondaryButton} onPress={() => navigate("MerchantOrders")}><Text style={styles.secondaryButtonText}>Open orders</Text></Pressable>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Manual item and QR</Text>
          <TextInput style={styles.input} value={manualName} onChangeText={setManualName} placeholder="Manual item name" placeholderTextColor="#6b7280" />
          <TextInput style={styles.input} value={manualPrice} onChangeText={setManualPrice} placeholder="Manual item price" placeholderTextColor="#6b7280" keyboardType="numeric" />
          <View style={styles.inlineRow}>
            <Pressable style={styles.secondaryButton} onPress={handleAddManualItem}><Text style={styles.secondaryButtonText}>Add manual item</Text></Pressable>
            <Pressable style={styles.secondaryButton} onPress={() => void generateCollectionQr()}><Text style={styles.secondaryButtonText}>Generate QR</Text></Pressable>
            <Pressable style={styles.secondaryButton} onPress={() => void shareQr()}><Text style={styles.secondaryButtonText}>Share QR</Text></Pressable>
          </View>
                    {generatedQrTarget ? <Text style={styles.helperText}>{generatedQrTarget}</Text> : null}
        </View>

        {error ? <View style={styles.errorCard}><Text style={styles.errorTitle}>POS action blocked</Text><Text style={styles.errorText}>{error}</Text></View> : null}
        {status ? <View style={styles.infoCard}><Text style={styles.infoText}>{status}</Text></View> : null}
        {lastScannedCode ? <Text style={styles.footerText}>Last scanned: {lastScannedCode}</Text> : null}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  brandHeader: {
    marginBottom: 12,
    borderRadius: 20,
    padding: 12,
    borderWidth: 1,
    borderColor: "#d7dfea",
    backgroundColor: "#ffffff",
  },
  brandHeaderInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  brandHeaderTextWrap: {
    flex: 1,
    gap: 2,
  },
  brandKicker: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
    color: "#ff7a00",
  },
  brandHelper: {
    fontSize: 12,
    color: "#5f6f86",
  },
  screen: { flex: 1, backgroundColor: "#f4f7fb" },
  container: { padding: 16, gap: 12, paddingBottom: 120 },
  headerCard: { backgroundColor: "#0B1E3C", borderRadius: 20, padding: 16, gap: 12, borderWidth: 1, borderColor: "#17345f" },
  headerTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 42, height: 42, borderRadius: 999, backgroundColor: "#FFB347", alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 16, fontWeight: "800", color: "#111827" },
  headerMeta: { flex: 1, gap: 2 },
  headerName: { fontSize: 16, fontWeight: "700", color: "#ffffff" },
  headerHint: { fontSize: 11, color: "#d1d5db" },
  headerStats: { alignItems: "flex-end", gap: 2 },
  headerStatValue: { fontSize: 12, fontWeight: "800", color: "#ffffff" },
  headerStatHint: { fontSize: 11, color: "#fbbf24" },
  section: { backgroundColor: "#ffffff", borderRadius: 18, padding: 14, borderWidth: 1, borderColor: "#d7dfea", gap: 10, shadowColor: "#0B1E3C", shadowOpacity: 0.04, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  sectionHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: "#111827" },
  input: { borderWidth: 1, borderColor: "#d1d5db", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11, backgroundColor: "#ffffff", color: "#111827" },
  searchInput: { marginBottom: 2 },
  inlineRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" },
  flexInput: { flex: 1, minWidth: 180 },
  secondaryButton: { alignSelf: "flex-start", backgroundColor: "#f4f7fb", borderRadius: 12, borderWidth: 1, borderColor: "#d7dfea", paddingHorizontal: 12, paddingVertical: 10 },
  secondaryButtonText: { fontSize: 12, fontWeight: "700", color: "#0B1E3C" },
  linkChip: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: "#f3f4f6" },
  linkChipText: { fontSize: 11, fontWeight: "700", color: "#111827" },
  scannerCard: { borderRadius: 14, backgroundColor: "#0f172a", padding: 12, gap: 8 },
  inlineCard: { borderRadius: 14, backgroundColor: "#f8fafc", padding: 12, gap: 8, borderWidth: 1, borderColor: "#e5e7eb" },
  visibleRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" },
  scannerTitle: { fontSize: 14, fontWeight: "700", color: "#ffffff" },
  cameraFrame: { height: 170, borderRadius: 14, overflow: "hidden", backgroundColor: "#020617" },
  camera: { flex: 1 },
  permissionCard: { justifyContent: "center", alignItems: "center", padding: 16, borderRadius: 12, backgroundColor: "#1e293b" },
  scannerErrorText: { fontSize: 12, fontWeight: "700", color: "#fecaca", textAlign: "center" },
  scannerHintText: { fontSize: 11, color: "#cbd5e1", textAlign: "center" },
  quickBlock: { gap: 8 },
  productListCard: { gap: 8 },
  productRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  productInfo: { flex: 1, gap: 4 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 999 },
  productTitle: { fontSize: 14, fontWeight: "600", color: "#111827", flexShrink: 1 },
  productMeta: { fontSize: 12, color: "#6b7280" },
  addText: { fontSize: 12, fontWeight: "700", color: "#9a3412" },
  safetyBadge: { alignSelf: "flex-start", fontSize: 11, fontWeight: "700", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, overflow: "hidden" },
  cartHeaderActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  cartBadge: { fontSize: 11, fontWeight: "700", color: "#9a3412", backgroundColor: "#fff7ed", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  miniCartCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#d9e2ec",
    gap: 10,
  },
  miniCartRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  cartRow: { gap: 8, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  discountRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  discountInput: { width: 90, paddingVertical: 8 },
  cartActionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  countButton: { backgroundColor: "#f3f4f6", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  countButtonText: { fontSize: 12, fontWeight: "700", color: "#111827" },
  removeButton: { backgroundColor: "#fef2f2", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  removeButtonText: { fontSize: 12, fontWeight: "700", color: "#991b1b" },
  summaryCard: { borderRadius: 14, backgroundColor: "#f8fafc", padding: 12, gap: 4, borderWidth: 1, borderColor: "#e5e7eb" },
  summaryTitle: { fontSize: 12, fontWeight: "700", color: "#111827" },
  summaryLine: { fontSize: 11, color: "#475569" },
  summaryAmount: { fontSize: 16, fontWeight: "800", color: "#111827", marginTop: 2 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  quickChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: "#d1d5db", backgroundColor: "#ffffff" },
  quickChipActive: { backgroundColor: "#111827", borderColor: "#111827" },
  quickChipText: { fontSize: 12, fontWeight: "700", color: "#111827" },
  quickChipTextActive: { color: "#ffffff" },
  splitActive: { backgroundColor: "#111827", borderColor: "#111827" },
  splitActiveText: { color: "#ffffff" },
  modeStrip: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  modeButton: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 999, backgroundColor: "#f8fafc", borderWidth: 1, borderColor: "#d7dfea" },
  modeButtonActive: { backgroundColor: "#0B1E3C", borderColor: "#0B1E3C" },
  modeButtonText: { fontSize: 12, fontWeight: "700", color: "#0B1E3C" },
  modeButtonActiveText: { color: "#ffffff" },
  scanStatusCard: { borderRadius: 14, backgroundColor: "#fff7ed", borderWidth: 1, borderColor: "#fed7aa", padding: 12, gap: 4 },
  scanStatusTitle: { fontSize: 13, fontWeight: "800", color: "#9a3412" },
  scanStatusBody: { fontSize: 12, color: "#7c2d12", lineHeight: 18 },
  splitPanel: { gap: 8 },
  splitCell: { gap: 6 },
  primaryButton: { backgroundColor: "#0B1E3C", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 14, alignItems: "center" },
  primaryButtonDisabled: { opacity: 0.55 },
  primaryButtonText: { color: "#ffffff", fontSize: 13, fontWeight: "700" },
  qrImage: { width: 220, height: 220, alignSelf: "center" },
  helperText: { fontSize: 11, color: "#6b7280" },
  errorCard: { backgroundColor: "#fef2f2", borderColor: "#fecaca", borderWidth: 1, borderRadius: 14, padding: 14, gap: 6 },
  errorTitle: { fontSize: 13, fontWeight: "700", color: "#991b1b" },
  errorText: { fontSize: 12, color: "#374151" },
  infoCard: { backgroundColor: "#eff6ff", borderColor: "#bfdbfe", borderWidth: 1, borderRadius: 14, padding: 14 },
  infoText: { fontSize: 12, color: "#374151" },
  footerText: { fontSize: 11, color: "#6b7280", textAlign: "center" },
  bottomSpacer: { height: 8 },
});































































