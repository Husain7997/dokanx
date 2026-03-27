import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Image, PermissionsAndroid, Platform, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from "react-native";
import RNPrint from "react-native-print";

import { Camera, CameraType } from "react-native-camera-kit";

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
  getMerchantShopSettingsRequest,
  initiateMerchantPaymentRequest,
  searchMerchantCustomersRequest,
  searchMerchantProductsRequest,
} from "../lib/api-client";
import { useMerchantNavigation } from "../navigation/merchant-navigation";
import { useMerchantAuthStore } from "../store/auth-store";

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

export function MerchantPosScreen() {
  const accessToken = useMerchantAuthStore((state) => state.accessToken);
  const profile = useMerchantAuthStore((state) => state.profile);
  const { navigate } = useMerchantNavigation();
  const barcodeInputRef = useRef<TextInput | null>(null);

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
  const [splitAmounts, setSplitAmounts] = useState<Record<SplitMode, string>>({ CASH: "", ONLINE: "", WALLET: "", CREDIT: "" });  const [generatedQrTarget, setGeneratedQrTarget] = useState<string | null>(null);
  const [lastReceiptText, setLastReceiptText] = useState<string | null>(null);
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
  const globalDiscount = Math.max(0, Math.min(100, toNumber(globalDiscountRate)));
  const totalAmount = useMemo(() => Number(cart.reduce((sum, item) => sum + buildCartAmount(item, globalDiscount), 0).toFixed(2)), [cart, globalDiscount]);
  const totalItems = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);
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
      setFeatures({ ...DEFAULT_FEATURES, ...(settingsResponse.data?.merchantFeatures || {}) });
      const channels: Record<string, boolean> = { ...(notificationSettingsResponse.data?.channels || {}) };
      setNotificationChannels(channels);
      setSmsAutoEnabled(Boolean(channels.sms));
      setPricingSafety({ ...DEFAULT_SAFETY, ...(settingsResponse.data?.pricingSafety || {}) });
      if (settingsResponse.data?.merchantFeatures?.splitPaymentEnabled === false) {
        setSplitEnabled(false);
      }
      setError(null);
    } catch (loadError) {
      setProducts([]);
      setError(loadError instanceof Error ? loadError.message : "Unable to load POS products.");
    }
  }, [accessToken, profile?.shopId]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

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
  }, []);

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
    const normalizedCode = code.trim();
    if (!normalizedCode || !profile?.shopId) {
      return;
    }

    try {
      const response = await getMerchantProductByBarcodeRequest(profile.shopId, normalizedCode);
      const product = response.data;
      if (!product || !(product._id || product.id)) {
        setError(`No product found for barcode ${normalizedCode}.`);
        return;
      }
      addProduct({
        id: String(product._id || product.id || ""),
        name: String(product.name || "Product"),
        price: Number(product.price || 0),
        costPrice: Number(product.costPrice || 0),
        discountRate: Number(product.discountRate || 0),
        stock: Number(product.stock || 0),
        barcode: String(product.barcode || normalizedCode),
        category: String(product.category || "General"),
      });
      setBarcodeInput("");
      setLastScannedCode(normalizedCode);
    } catch (lookupError) {
      setError(lookupError instanceof Error ? lookupError.message : "Unable to scan this barcode.");
    }
  }, [addProduct, profile?.shopId]);

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
    setScannerOpen(true);
    setError(null);
    setScannerError(null);

    if (Platform.OS === "android") {
      try {
        const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA, {
          title: "Camera access",
          message: "DokanX needs camera access to scan product barcodes.",
          buttonPositive: "Allow",
          buttonNegative: "Not now",
        });
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          setScannerError("Camera permission is blocked. Use the barcode field or a Bluetooth scanner.");
          setStatus("Camera permission was not granted.");
          barcodeInputRef.current?.focus();
          return;
        }
      } catch {
        setScannerError("Camera permission could not be verified. Use the barcode field or a Bluetooth scanner.");
        setStatus("Camera permission check failed.");
        barcodeInputRef.current?.focus();
        return;
      }
    }

    setStatus("Scan assistant is ready. If the live camera does not start, use the barcode field or a Bluetooth scanner.");
    barcodeInputRef.current?.focus();
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
  }, [lastReceiptText]);

  const shareQr = useCallback(async () => {
    if (!generatedQrTarget) {
      setError("Generate collection link first.");
      return;
    }
    await Share.share({ message: generatedQrTarget });
  }, [generatedQrTarget]);

  const printReceipt = useCallback(async () => {
    if (!lastReceiptText) {
      setError("Create an order first to print the receipt.");
      return;
    }

    const safeText = lastReceiptText.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const html = `
      <html>
        <body style="font-family: Arial, sans-serif; padding: 18px; color: #111827;">
          <pre style="white-space: pre-wrap; font-size: 14px; line-height: 1.5;">${safeText}</pre>
        </body>
      </html>`;

    try {
      await RNPrint.print({ html, jobName: "DokanX receipt" });
      setStatus("Receipt sent to printer.");
      setError(null);
    } catch {
      await Share.share({ message: lastReceiptText });
      setStatus("Printer was unavailable. Receipt opened in share options.");
      setError(null);
    }
  }, [lastReceiptText]);

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

      const receiptText = buildReceiptText(orderId, cart, totalAmount, paymentMode, customerId.trim(), splitEnabled, splitBreakdown);
      setLastReceiptText(receiptText);
      setCart([]);      setGeneratedQrTarget(null);
      setSplitEnabled(false);
      setSplitAmounts({ CASH: "", ONLINE: "", WALLET: "", CREDIT: "" });
      setPaymentMode("CASH");
      setCustomerId("");
      setCustomerName("");
      setCustomerPhone("");
      await loadProducts(searchQuery.trim());
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : "Unable to complete checkout.");
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, canCheckout, cart, customerId, globalDiscount, loadProducts, paymentMode, searchQuery, splitBreakdown, splitEnabled, totalAmount]);

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
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

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Find products</Text>
            <Pressable style={styles.linkChip} onPress={() => void loadProducts(searchQuery.trim())}><Text style={styles.linkChipText}>Refresh</Text></Pressable>
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
              <Text style={styles.secondaryButtonText}>Camera</Text>
            </Pressable>
            <Pressable style={styles.secondaryButton} onPress={() => { setManualName(searchQuery.trim() || manualName); setManualEntryOpen((current) => !current); setStatus("Manual item form is ready here."); setError(null); }}>
              <Text style={styles.secondaryButtonText}>Manual item</Text>
            </Pressable>
          </View>
          {scannerOpen ? (
            <View style={styles.scannerCard}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.scannerTitle}>Scan assistant</Text>
                <Pressable style={styles.linkChip} onPress={() => setScannerOpen(false)}><Text style={styles.linkChipText}>Close</Text></Pressable>
              </View>
              {!scannerError ? (

              <View style={styles.cameraFrame}>
                <Camera
                  style={styles.camera}
                  cameraType={CameraType.Back}
                  scanBarcode
                  showFrame
                  laserColor="#f59e0b"
                  frameColor="#fbbf24"
                  onReadCode={(event: { nativeEvent?: { codeStringValue?: string; codeString?: string } }) => {
                    const code = event.nativeEvent?.codeStringValue || event.nativeEvent?.codeString || "";
                    if (!code) return;
                    setLastScannedCode(code);
                    setBarcodeInput(code);
                    setScannerOpen(false);
                    void handleBarcodeLookup(code);
                  }}
                  onError={(cameraError: unknown) => {
                    const message = cameraError instanceof Error ? cameraError.message : "Live camera is unavailable on this device right now.";
                    setStatus("Live camera is unavailable. Use the barcode field or a Bluetooth scanner.");
                    setScannerError(message);
                  }}
                />
              </View>
            ) : null}
              {scannerError ? (
                <View style={styles.permissionCard}>
                  <Text style={styles.scannerErrorText}>{scannerError}</Text>
                  <Text style={styles.scannerHintText}>Use Bluetooth scanner or paste the barcode below, then tap Add.</Text>
                </View>
              ) : (
                <Text style={styles.scannerHintText}>Point the camera at the barcode. If live scan does not start, use the field below or your Bluetooth scanner and tap Add.</Text>
              )}
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
                    {features.pricingSafetyEnabled ? <Text style={[styles.safetyBadge, { color: safety.color, backgroundColor: safety.background }]}>{safety.label}{safety.marginPct == null ? "" : ` Ã¯Â¿Â½ ${safety.marginPct}%`}</Text> : null}
                  </View>
                  <Text style={styles.addText}>Add</Text>
                </Pressable>
              );
            })}
            {!filteredProducts.length ? <Text style={styles.helperText}>No products found. Search again, refresh, or add it as a manual item.</Text> : null}
          </View>
        </View>

        <View style={styles.section}>
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
            <Text style={styles.summaryLine}>Bulk discount: {globalDiscount}%</Text>
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
  screen: { flex: 1, backgroundColor: "#f8f4ef" },
  container: { padding: 16, gap: 12, paddingBottom: 120 },
  headerCard: { backgroundColor: "#111827", borderRadius: 18, padding: 14, gap: 10 },
  headerTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 42, height: 42, borderRadius: 999, backgroundColor: "#fbbf24", alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 16, fontWeight: "800", color: "#111827" },
  headerMeta: { flex: 1, gap: 2 },
  headerName: { fontSize: 16, fontWeight: "700", color: "#ffffff" },
  headerHint: { fontSize: 11, color: "#d1d5db" },
  headerStats: { alignItems: "flex-end", gap: 2 },
  headerStatValue: { fontSize: 12, fontWeight: "800", color: "#ffffff" },
  headerStatHint: { fontSize: 11, color: "#fbbf24" },
  section: { backgroundColor: "#ffffff", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: "#e5e7eb", gap: 10 },
  sectionHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: "#111827" },
  input: { borderWidth: 1, borderColor: "#d1d5db", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11, backgroundColor: "#ffffff", color: "#111827" },
  searchInput: { marginBottom: 2 },
  inlineRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" },
  flexInput: { flex: 1, minWidth: 180 },
  secondaryButton: { alignSelf: "flex-start", backgroundColor: "#fff7ed", borderRadius: 10, borderWidth: 1, borderColor: "#fed7aa", paddingHorizontal: 12, paddingVertical: 10 },
  secondaryButtonText: { fontSize: 12, fontWeight: "600", color: "#9a3412" },
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
  splitPanel: { gap: 8 },
  splitCell: { gap: 6 },
  primaryButton: { backgroundColor: "#111827", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, alignItems: "center" },
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





















