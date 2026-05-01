"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAuthStore } from "@dokanx/auth";
import {
  Alert,
  AnalyticsCards,
  Button,
  Card,
  CardDescription,
  CardTitle,
  TextInput,
  Toast,
  ToastDescription,
  ToastProvider,
  ToastRegion,
  ToastTitle
} from "@dokanx/ui";

import { createPosOrder, openPosSession, closePosSession, getProductByBarcode } from "@/lib/runtime-api";

import { PosHeader } from "@/components/pos/PosHeader";
import { PosSearch } from "@/components/pos/PosSearch";
import { PosOfferList } from "@/components/pos/PosOfferList";
import { PosCartSummary } from "@/components/pos/PosCartSummary";
import { usePosCart } from "@/hooks/usePosCart";
import { usePosStore } from "@/stores/store-pos";
import { searchProductsAI } from "@/utils/ai-search";

type BarcodeDetectorResult = { rawValue?: string };
type BarcodeDetectorCtor = new (options?: { formats?: string[] }) => {
  detect: (source: ImageBitmapSource) => Promise<BarcodeDetectorResult[]>;
};

declare global {
  interface Window {
    BarcodeDetector?: BarcodeDetectorCtor;
    webkitAudioContext?: typeof AudioContext;
  }
}

interface Customer {
  id: string;
  name: string;
  phone: string;
  credit: number;
}

export default function PosPage() {
  const {
    sessionId,
    products,
    shops,
    selectedShop,
    customerLocation,
    isLoading,
    error,
    setSessionId,
    setProducts,
    setShops,
    setSelectedShop,
    setCustomerLocation,
    setLoading,
    setError,
  } = usePosStore();

  const {
    cart,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getCartTotal,
    getCartItemCount,
  } = usePosCart();

  const [scannerOpen, setScannerOpen] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);
  const [toastTitle, setToastTitle] = useState("POS notification");
  const [toastMessage, setToastMessage] = useState("");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [soundVolume, setSoundVolume] = useState("0.08");
  const [barcodeQuery, setBarcodeQuery] = useState("");
  const [barcodeResult, setBarcodeResult] = useState<string | null>(null);
  const [barcodeError, setBarcodeError] = useState<string | null>(null);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [paymentType, setPaymentType] = useState<"cash" | "wallet" | "online" | "credit">("cash");
  const [customers, setCustomers] = useState<Customer[]>([
    { id: "customer-1", name: "Local Buyer", phone: "01712345678", credit: 0 },
    { id: "customer-2", name: "Retail Customer", phone: "01787654321", credit: 250 },
  ]);
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedCustomer && customers.length > 0) {
      setSelectedCustomer(customers[0].id);
    }
  }, [customers, selectedCustomer]);

  const volumeValue = Math.min(0.2, Math.max(0.02, Number(soundVolume) || 0.08));
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scanRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const selectedCustomerData = customers.find((customer) => customer.id === selectedCustomer) ?? null;

  useEffect(() => {
    if (!selectedShop && shops.length > 0) {
      setSelectedShop(shops[0].id);
    }
  }, [selectedShop, shops, setSelectedShop]);

  useEffect(() => {
    setProducts([
      {
        id: "1",
        name: "Rice 1kg",
        price: 120,
        stock: 50,
        shopId: "shop1",
        shopName: "Shop A",
      },
      {
        id: "2",
        name: "Sugar 1kg",
        price: 80,
        stock: 30,
        shopId: "shop1",
        shopName: "Shop A",
      },
      {
        id: "3",
        name: "Milk 1L",
        price: 90,
        stock: 20,
        shopId: "shop2",
        shopName: "Shop B",
      },
    ]);

    setShops([
      {
        id: "shop1",
        name: "Shop A",
        location: { lat: 23.8103, lng: 90.4125 },
        deliveryBase: 30,
        deliveryPerKm: 10,
      },
      {
        id: "shop2",
        name: "Shop B",
        location: { lat: 23.8203, lng: 90.4225 },
        deliveryBase: 25,
        deliveryPerKm: 12,
      },
    ]);
  }, [setProducts, setShops]);

  const stats = useMemo(
    () => [
      { label: "Session", value: sessionId ? "Open" : "Closed", meta: sessionId ? "Ready to bill" : "Open before live sales" },
      { label: "Cart lines", value: String(cart.length), meta: "Current bill lines" },
      { label: "Units", value: String(getCartItemCount()), meta: "Total pieces in cart" },
      { label: "Subtotal", value: `৳${getCartTotal().toFixed(2)}`, meta: "Current POS basket" },
      { label: "Scanner", value: scannerOpen ? "Live" : "Idle", meta: "Camera barcode state" },
      { label: "Sound", value: soundEnabled ? "On" : "Muted", meta: `Volume ${Math.round((volumeValue / 0.2) * 100)}%` },
    ],
    [cart.length, getCartItemCount, getCartTotal, scannerOpen, sessionId, soundEnabled, volumeValue],
  );

  const showToast = (title: string, message: string) => {
    setToastTitle(title);
    setToastMessage(message);
    setToastOpen(true);
  };

  const stopScanner = () => {
    setScannerOpen(false);
    if (scanRef.current) {
      window.clearTimeout(scanRef.current);
      scanRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const handleOpenSession = async () => {
    setSessionLoading(true);
    setError(null);

    try {
      const response = await openPosSession({ openingBalance: 0 });
      const nextSessionId = typeof response.data === "object" && response.data && (response.data as any).id
        ? (response.data as any).id
        : `session-${Date.now()}`;
      setSessionId(nextSessionId);
      showToast("Session opened", "POS session is ready for sales.");
    } catch (err) {
      setError((err as Error).message || "Failed to open POS session");
    } finally {
      setSessionLoading(false);
    }
  };

  const handleCloseSession = async () => {
    if (!sessionId) return;

    setSessionLoading(true);
    setError(null);

    try {
      await closePosSession(sessionId, { closingBalance: getCartTotal() });
      setSessionId(null);
      clearCart();
      showToast("Session closed", "POS session has been closed successfully.");
    } catch (err) {
      setError((err as Error).message || "Failed to close POS session");
    } finally {
      setSessionLoading(false);
    }
  };

  const handleCheckout = async () => {
    if (!sessionId) {
      showToast("Session required", "Open a POS session before checking out.");
      return;
    }

    if (cart.length === 0) {
      showToast("Cart empty", "Please add products to the cart before checkout.");
      return;
    }

    if (paymentType === "credit" && !selectedCustomer) {
      showToast("Customer required", "Select a customer for credit payment.");
      return;
    }

    setCheckoutLoading(true);
    setError(null);

    try {
      await createPosOrder({
        items: cart.map((item) => ({
          product: item.product.id,
          quantity: item.quantity,
        })),
        paymentType,
        customerId: selectedCustomer ?? undefined,
      } as any);
      clearCart();
      showToast("Checkout complete", "Order created successfully.");
    } catch (err) {
      setError((err as Error).message || "Failed to complete checkout");
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleProductSelect = (product: { id: string; name: string; price: number; stock: number; shopId: string; shopName: string }) => {
    addToCart(product);
    showToast("Product added", `${product.name} has been added to the cart.`);
  };

  const handleAddCustomer = () => {
    const nextCustomer = {
      id: `customer-${Date.now()}`,
      name: `New customer ${customers.length + 1}`,
      phone: `01700000${customers.length + 1}`,
      credit: 0,
    };
    setCustomers((prev) => [...prev, nextCustomer]);
    setSelectedCustomer(nextCustomer.id);
    showToast("Customer added", `${nextCustomer.name} is ready for payment.`);
  };

  const handleAISearch = async (query: string) => {
    return searchProductsAI(query, products, {
      preferredShops: selectedShop ? [selectedShop] : shops.map((shop) => shop.id),
      location: customerLocation || undefined,
    });
  };

  const handleBarcodeLookup = async () => {
    if (!barcodeQuery.trim()) {
      setBarcodeError("Enter barcode or product code.");
      return;
    }

    setBarcodeError(null);
    setLoading(true);
    setError(null);

    try {
      const shopId = selectedShop || shops[0]?.id;
      if (!shopId) {
        throw new Error("Select a shop before scanning barcodes.");
      }

      const localMatch = products.find(
        (product) =>
          product.id === barcodeQuery.trim() ||
          product.name.toLowerCase() === barcodeQuery.trim().toLowerCase(),
      );

      if (localMatch) {
        addToCart(localMatch);
        showToast("Product found", `${localMatch.name} added using local barcode lookup.`);
        setBarcodeResult(localMatch.name);
        setBarcodeQuery("");
        return;
      }

      const response = await getProductByBarcode(barcodeQuery.trim(), shopId);
      const remote = response.data as any;

      if (!remote || !remote.id) {
        throw new Error("Product not found by barcode.");
      }

      const product = {
        id: remote.id,
        name: remote.name || "Unnamed product",
        price: Number(remote.price) || 0,
        stock: Number(remote.stock) || 0,
        shopId: remote.shopId || shopId,
        shopName: remote.shopName || shops.find((s) => s.id === (remote.shopId || shopId))?.name || "Selected Shop",
        image: remote.image || undefined,
      };

      addToCart(product);
      showToast("Product added", `${product.name} added by barcode.`);
      setBarcodeResult(product.name);
      setBarcodeQuery("");
    } catch (err) {
      const message = (err as Error).message || "Barcode lookup failed.";
      setBarcodeError(message);
      showToast("Lookup failed", message);
    } finally {
      setLoading(false);
    }
  };

  const handleStartScanner = async () => {
    if (!window.BarcodeDetector || !navigator.mediaDevices?.getUserMedia) {
      setError("Barcode scanning is not supported in this browser.");
      return;
    }

    setError(null);
    setScannerOpen(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      const detector = new window.BarcodeDetector({
        formats: ["ean_13", "qr_code", "code_128", "upc_a", "upc_e"],
      });

      const scanFrame = async () => {
        if (!videoRef.current || !streamRef.current) return;
        try {
          const results = await detector.detect(videoRef.current);
          if (results.length > 0 && results[0].rawValue) {
            setBarcodeQuery(results[0].rawValue);
            setBarcodeResult(results[0].rawValue);
            await handleBarcodeLookup();
            stopScanner();
            return;
          }
        } catch (scannerError) {
          console.warn("Barcode detector error:", scannerError);
        }
        scanRef.current = window.setTimeout(scanFrame, 600);
      };

      scanFrame();
    } catch (err) {
      setError((err as Error).message || "Unable to start barcode scanner.");
      stopScanner();
    }
  };

  const handleShopChange = (shopId: string) => {
    setSelectedShop(shopId || null);
  };

  const handleUseLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not available in this browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCustomerLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
        showToast("Location set", "Customer location is now enabled.");
      },
      (locationError) => {
        setError(locationError.message || "Unable to access location.");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  return (
    <ToastProvider>
      <div className="space-y-6 px-6 py-8">
        <PosHeader
          sessionId={sessionId}
          onOpenSession={handleOpenSession}
          onCloseSession={handleCloseSession}
          isBusy={sessionLoading}
        />

        {error && (
          <Alert variant="error">
            <p>{error}</p>
          </Alert>
        )}

        <div className="grid-cols-1 xl:grid-cols-3">
          <AnalyticsCards items={stats} />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.4fr_0.85fr]">
          <div className="space-y-6">
            <Card>
              <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-2">
                  <CardTitle>Live POS</CardTitle>
                  <CardDescription>Search products, scan barcodes, and add items to the current cart.</CardDescription>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="flex flex-1 flex-col gap-2">
                    <label className="text-xs font-medium uppercase text-muted-foreground">Customer</label>
                    <div className="flex gap-2">
                      <select
                        value={selectedCustomer ?? ""}
                        onChange={(event) => setSelectedCustomer(event.target.value || null)}
                        className="flex-1 rounded-lg border border-border bg-background px-4 py-2 text-sm"
                      >
                        <option value="">Select customer</option>
                        {customers.map((customer) => (
                          <option key={customer.id} value={customer.id}>
                            {customer.name}
                          </option>
                        ))}
                      </select>
                      <Button onClick={handleAddCustomer} variant="secondary">
                        Add
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col gap-2">
                    <label className="text-xs font-medium uppercase text-muted-foreground">Shop</label>
                    <select
                      value={selectedShop ?? ""}
                      onChange={(event) => handleShopChange(event.target.value)}
                      className="rounded-lg border border-border bg-background px-4 py-2 text-sm"
                    >
                      <option value="">All shops</option>
                      {shops.map((shop) => (
                        <option key={shop.id} value={shop.id}>{shop.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </Card>

            <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
              <Card className="p-6">
                <div className="space-y-4">
                  <PosSearch products={products} onProductSelect={handleProductSelect} onAISearch={handleAISearch} />

                  <div className="grid gap-3 sm:grid-cols-[1.7fr_0.9fr]">
                    <TextInput
                      placeholder="Enter barcode or product code"
                      value={barcodeQuery}
                      onChange={(e) => setBarcodeQuery(e.target.value)}
                      className="w-full"
                    />
                    <Button onClick={handleBarcodeLookup} disabled={isLoading}>
                      Add by barcode
                    </Button>
                  </div>

                  <div className="space-y-3 rounded-xl border border-border bg-muted p-4">
                    <div className="text-sm font-medium uppercase text-muted-foreground">Payment type</div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {[
                        { value: "cash", label: "Cash" },
                        { value: "wallet", label: "Wallet" },
                        { value: "online", label: "Online" },
                        { value: "credit", label: "Credit" },
                      ].map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setPaymentType(option.value as typeof paymentType)}
                          className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${paymentType === option.value ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-foreground hover:border-primary"}`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                    {paymentType === "credit" && (
                      <p className="text-xs text-muted-foreground">Credit payments require a selected customer.</p>
                    )}
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <Button onClick={scannerOpen ? stopScanner : handleStartScanner} variant={scannerOpen ? "danger" : "secondary"}>
                      {scannerOpen ? "Stop scanner" : "Start scanner"}
                    </Button>
                    <div className="text-sm text-muted-foreground">
                      {barcodeResult ? `Last scanned: ${barcodeResult}` : "Scan a barcode or search a product."}
                    </div>
                  </div>

                  {scannerOpen && (
                    <div className="rounded-xl border border-border bg-black/10 p-2">
                      <video ref={videoRef} className="h-64 w-full rounded-lg object-cover" muted playsInline />
                    </div>
                  )}

                  {barcodeError && (
                    <Alert variant="warning">
                      <p>{barcodeError}</p>
                    </Alert>
                  )}
                </div>
              </Card>

              <PosCartSummary
                cart={cart}
                shops={shops}
                customerLocation={customerLocation ?? undefined}
                onCheckout={handleCheckout}
                onRemoveItem={removeFromCart}
                onUpdateQuantity={updateQuantity}
              />
            </div>

            <PosOfferList products={products} onProductSelect={handleProductSelect} selectedShop={selectedShop ?? undefined} />
          </div>

          <div className="space-y-6">
            <Card className="p-6">
              <CardTitle>Checkout Actions</CardTitle>
              <CardDescription>Control session state, finalize orders, and manage quick actions.</CardDescription>

              <div className="mt-4 space-y-3">
                <Button onClick={handleCheckout} disabled={cart.length === 0 || checkoutLoading}>
                  {checkoutLoading ? "Processing..." : "Confirm checkout"}
                </Button>
                <Button variant="secondary" onClick={clearCart} disabled={cart.length === 0}>
                  Clear cart
                </Button>
                <Button variant="outline" onClick={() => setSoundEnabled(!soundEnabled)}>
                  {soundEnabled ? "Disable sound" : "Enable sound"}
                </Button>
              </div>
            </Card>

            <Card className="p-6">
              <CardTitle>Receipt Preview</CardTitle>
              <CardDescription>Quick sale summary before you complete payment.</CardDescription>
              <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                <div className="flex justify-between">
                  <span>Customer</span>
                  <span>{selectedCustomerData?.name || "Walk-in"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Payment</span>
                  <span className="capitalize">{paymentType}</span>
                </div>
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>৳{getCartTotal().toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Estimated total</span>
                  <span>৳{getCartTotal().toFixed(2)}</span>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <CardTitle>Shop Overview</CardTitle>
              <CardDescription>Selected shop, customer location, and cart totals.</CardDescription>
              <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                <div>
                  <span className="font-medium">Selected shop:</span> {shops.find((shop) => shop.id === selectedShop)?.name || "All shops"}
                </div>
                <div>
                  <span className="font-medium">Customer location:</span> {customerLocation ? `${customerLocation.lat.toFixed(4)}, ${customerLocation.lng.toFixed(4)}` : "Not set"}
                </div>
                <div>
                  <span className="font-medium">Cart items:</span> {getCartItemCount()}
                </div>
                <div>
                  <span className="font-medium">Cart total:</span> ৳{getCartTotal().toFixed(2)}
                </div>
              </div>
            </Card>
          </div>
        </div>

        <ToastRegion>
          {toastOpen && (
            <Toast open={toastOpen} onOpenChange={setToastOpen}>
              <ToastTitle>{toastTitle}</ToastTitle>
              <ToastDescription>{toastMessage}</ToastDescription>
            </Toast>
          )}
        </ToastRegion>
      </div>
    </ToastProvider>
  );
}
